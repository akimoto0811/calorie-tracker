/** Shown instantly while the next screen loads, so taps never feel ignored. */
export default function Loading() {
  return (
    <main className="page" style={{ alignItems: "center", justifyContent: "center" }} aria-busy="true">
      <span className="spinner" style={{ color: "var(--green)", width: 28, height: 28 }} />
      <span className="sr-only">Loading…</span>
    </main>
  );
}
