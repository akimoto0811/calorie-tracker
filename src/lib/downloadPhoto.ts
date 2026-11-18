import "server-only";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const redirects = new Set([301, 302, 303, 307, 308]);

const nonPublic = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) {
  nonPublic.addSubnet(address, prefix, "ipv4");
}

const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");
nonPublic.addSubnet("2001::", 23, "ipv6");
nonPublic.addSubnet("2001:db8::", 32, "ipv6");
nonPublic.addSubnet("2002::", 16, "ipv6");
nonPublic.addSubnet("3fff::", 20, "ipv6");

function isPublic(address: string, family: number) {
  if (family === 4) return !nonPublic.check(address, "ipv4");
  return family === 6 && globalIpv6.check(address, "ipv6") && !nonPublic.check(address, "ipv6");
}

class PhotoDownloadError extends Error {}

export async function downloadPhoto(link: string): Promise<Buffer> {
  const signal = AbortSignal.timeout(12000);
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    throw new PhotoDownloadError("isn't a web link");
  }

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const https = url.protocol === "https:";
      if ((!https && url.protocol !== "http:") || url.username || url.password || url.port) {
        throw new PhotoDownloadError("isn't a supported public web link");
      }

      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      const family = isIP(hostname);
      const addresses = family ? [{ address: hostname, family }] : await lookup(hostname, { all: true });
      if (!addresses.length || addresses.some(({ address, family }) => !isPublic(address, family))) {
        throw new PhotoDownloadError("isn't a public web link");
      }
      const destination = addresses.find(({ family }) => family === 4) ?? addresses[0];
      signal.throwIfAborted();

      // Reuse the validated address for this connection while retaining the URL hostname for TLS and HTTP.
      const request = https ? httpsRequest : httpRequest;
      const res = await new Promise<import("node:http").IncomingMessage>((resolve, reject) => {
        const req = request(url, {
          agent: false,
          family: destination.family,
          lookup: (_hostname, _options, callback) => callback(null, destination.address, destination.family),
          headers: { Accept: "image/*", "User-Agent": "FoodLibraryImport/1.0" },
          signal,
        }, resolve);
        req.once("error", reject);
        req.end();
      });

      const status = res.statusCode ?? 0;
      if (redirects.has(status)) {
        res.destroy();
        if (!res.headers.location || hop === MAX_REDIRECTS) throw new PhotoDownloadError("has too many redirects");
        url = new URL(res.headers.location, url);
        continue;
      }

      try {
        if (status < 200 || status >= 300) throw new PhotoDownloadError(`the site answered ${status}`);
        const type = res.headers["content-type"]?.toLowerCase();
        if (type && !type.startsWith("image/") && !type.startsWith("application/octet-stream")) {
          throw new PhotoDownloadError("doesn't point to a picture");
        }
        if (Number(res.headers["content-length"]) > MAX_BYTES) throw new PhotoDownloadError("picture is over 15 MB");

        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of res) {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += bytes.length;
          if (size > MAX_BYTES) throw new PhotoDownloadError("picture is over 15 MB");
          chunks.push(bytes);
        }
        return Buffer.concat(chunks, size);
      } finally {
        res.destroy();
      }
    }
  } catch (error) {
    if (error instanceof PhotoDownloadError) throw error;
    throw new PhotoDownloadError(signal.aborted ? "took too long to download" : "couldn't be downloaded");
  }

  throw new PhotoDownloadError("has too many redirects");
}
