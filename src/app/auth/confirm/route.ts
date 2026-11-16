import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic links land here when the Supabase email template uses
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * This works even if the link is opened on a different device or browser.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;

  if (token_hash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
  }
  const to = new URL("/login", url.origin);
  to.searchParams.set("error", "That sign-in link has expired or was already used. Request a new one.");
  return NextResponse.redirect(to);
}
