import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page no-nav" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <h1>Not found</h1>
      <p className="muted">That page or food doesn&apos;t exist, or isn&apos;t shared with you.</p>
      <Link href="/" className="btn btn-secondary" style={{ maxWidth: 240 }}>
        Back to today
      </Link>
    </main>
  );
}
