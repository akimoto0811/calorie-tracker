/** True when the text uses another script, e.g. Chinese, Japanese, Korean or Thai. */
export const isNonLatin = (s: string) => /[^\u0000-ɏḀ-ỿ\s\d\p{P}]/u.test(s);

/**
 * Which name to show big and which small. When you search in another language,
 * the name in that language (local_name) comes first so you can see why it matched.
 */
export function foodTitle(f: { name: string; local_name?: string | null }, q = "") {
  if (f.local_name && isNonLatin(q)) return { title: f.local_name, other: f.name };
  return { title: f.name, other: f.local_name ?? null };
}
