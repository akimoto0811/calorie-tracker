import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLabelReader } from "@/lib/ai";

export const maxDuration = 30;

/** Reads a nutrition label photo the user already uploaded to storage. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { path } = (await req.json().catch(() => ({}))) as { path?: string };
  if (!path || !path.startsWith(`${user.id}/`) || path.includes("..")) {
    return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
  }

  const { data: file, error } = await supabase.storage.from("label-photos").download(path);
  if (error || !file) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  try {
    const reader = getLabelReader();
    const reading = await reader.readLabel({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "image/jpeg",
    });
    return NextResponse.json({ reading, provider: reader.name });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
