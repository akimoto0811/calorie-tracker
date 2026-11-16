import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Google sign-in and magic links land here with ?code=… (or ?error_description=…). */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorDescription = url.searchParams.get("error_description");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
    return loginError(url.origin, error.message);
  }
  return loginError(url.origin, errorDescription ?? "Sign-in failed. Please try again.");
}

function loginError(origin: string, message: string) {
  let friendly = message;
  if (/invited|database error saving new user/i.test(message)) {
    friendly =
      "This email hasn't been invited yet. Ask a friend in the app to invite you from their Profile page.";
  } else if (/code verifier|pkce/i.test(message)) {
    friendly =
      "Open the sign-in link in the same browser you requested it from, or request a new link.";
  }
  const to = new URL("/login", origin);
  to.searchParams.set("error", friendly);
  return NextResponse.redirect(to);
}
