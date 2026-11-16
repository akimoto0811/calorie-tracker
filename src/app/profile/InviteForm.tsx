"use client";

import { useActionState } from "react";
import { inviteFriend } from "@/app/actions";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteFriend, null);
  return (
    <form action={action} className="card">
      <div className="stack" style={{ gap: 4 }}>
        <h2 style={{ fontFamily: "var(--font)", fontSize: 16 }}>Invite a friend</h2>
        <p className="muted small">Only invited emails can make an account.</p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <label htmlFor="invite" className="sr-only">
          Friend&apos;s email
        </label>
        <input id="invite" name="email" type="email" required placeholder="friend@example.com" className="input" />
        <button className="btn btn-secondary" style={{ width: "auto", height: 48 }} disabled={pending}>
          {pending ? <span className="spinner" /> : "Invite"}
        </button>
      </div>
      {state?.message && (
        <div className={state.ok ? "notice ok" : "notice error"} role="status">
          {state.message}
        </div>
      )}
    </form>
  );
}
