import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/icons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="page no-nav" style={{ paddingTop: 72, gap: 32 }}>
      <div className="stack" style={{ gap: 16, alignItems: "flex-start" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--green)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Logo size={30} />
        </div>
        <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>
          Track what you eat,
          <br />
          together.
        </h1>
        <p className="muted" style={{ fontSize: 16, lineHeight: 1.5 }}>
          Log meals in seconds with barcode scans and label photos. Your log stays private; foods
          you add can help your friends too.
        </p>
      </div>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      <LoginForm />

      <p className="muted small" style={{ marginTop: "auto", textAlign: "center", lineHeight: 1.5 }}>
        Invite-only for now. Ask a friend who already uses the app to invite your email.
        <br />
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
      </p>
    </main>
  );
}
