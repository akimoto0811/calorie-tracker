"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Apple, Google } from "@/components/icons";

function friendlyError(message: string) {
  if (/invited|database error saving new user/i.test(message)) {
    return "This email hasn't been invited yet. Ask a friend in the app to invite you from their Profile page.";
  }
  if (/rate limit/i.test(message)) {
    return "Too many sign-in emails were sent. Wait a few minutes and try again.";
  }
  return message;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function google() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) setError(friendlyError(error.message));
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(friendlyError(error.message));
      setState("idle");
    } else {
      setState("sent");
    }
  }

  return (
    <>
      <div className="stack" style={{ gap: 12 }}>
        <button type="button" className="btn btn-secondary" onClick={google}>
          <Google />
          Continue with Google
        </button>
        <button type="button" className="btn btn-muted" disabled>
          <Apple size={18} />
          Apple sign-in (coming later)
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: 13 }}>
        <div style={{ flexGrow: 1, height: 1, background: "#deded7" }} />
        or use email
        <div style={{ flexGrow: 1, height: 1, background: "#deded7" }} />
      </div>

      {state === "sent" ? (
        <div className="notice ok" role="status" style={{ fontSize: 15, padding: 16 }}>
          Check your inbox. We sent a sign-in link to <b>{email}</b>. You can close this tab.
        </div>
      ) : (
        <form onSubmit={magicLink} className="stack" style={{ gap: 12 }}>
          <label htmlFor="email" style={{ fontSize: 14, fontWeight: 600 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn btn-primary" disabled={state === "sending"}>
            {state === "sending" ? <span className="spinner" /> : "Send me a sign-in link"}
          </button>
        </form>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
