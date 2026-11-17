"use client";

import { Search } from "./icons";

/** The rounded search field. Enter just closes the keyboard; results already update as you type. */
export function SearchInput({
  id,
  value,
  onChange,
  pending,
  placeholder,
  label,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  pending: boolean;
  placeholder: string;
  label?: string;
}) {
  return (
    <form
      role="search"
      className="stack"
      style={{ gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <label htmlFor={id} className={label ? undefined : "sr-only"} style={{ fontSize: 14, fontWeight: 600 }}>
        {label ?? "Search foods"}
      </label>
      <div className="search">
        {/* Same-size slot for the icon and the spinner, so nothing shifts while loading. */}
        <span style={{ width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {pending ? <span className="spinner" /> : <Search className="muted" />}
        </span>
        <input
          id={id}
          name="q"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
    </form>
  );
}
