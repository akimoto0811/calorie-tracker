"use client";

import { useActionState, useEffect, useState } from "react";
import { updateName } from "@/app/actions";
import { Pencil } from "@/components/icons";

/** Your display name (what friends see on shared foods), with a pencil to change it. */
export function NameEditor({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateName, null);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <h1 style={{ fontSize: 22, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</h1>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 36, height: 36, border: 0, background: "transparent", color: "var(--muted)" }}
          aria-label="Change your name"
          onClick={() => setEditing(true)}
        >
          <Pencil size={18} />
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="stack" style={{ gap: 6 }}>
      <label htmlFor="display_name" className="label">
        Your name (friends see this on foods you share)
      </label>
      <input
          id="display_name"
          name="display_name"
          className="input"
          defaultValue={name}
          maxLength={60}
          required
          autoFocus
          style={{ height: 44 }}
        />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" style={{ width: "auto", height: 44, fontSize: 15 }} disabled={pending}>
          {pending ? <span className="spinner" /> : "Save"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "auto", height: 44, fontSize: 15 }}
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
      {state && !state.ok && (
        <div className="notice error" role="alert">
          {state.message}
        </div>
      )}
    </form>
  );
}
