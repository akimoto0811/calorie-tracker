import { fmt } from "@/lib/nutrition";

export function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
  const r = 68;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const over = goal > 0 && eaten > goal;
  const left = Math.round(goal - eaten);
  return (
    <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        role="img"
        aria-label={`${fmt(eaten)} of ${fmt(goal)} kcal eaten`}
      >
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--green-track)" strokeWidth="14" />
        {pct > 0 && (
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={over ? "var(--warn)" : "var(--green)"}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${pct * c} ${c}`}
            transform="rotate(-90 80 80)"
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="display" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>
          {fmt(Math.abs(left))}
        </div>
        <div className="muted small" style={{ marginTop: 4 }}>
          {left >= 0 ? "kcal left" : "kcal over"}
        </div>
      </div>
    </div>
  );
}

const MACROS = [
  { key: "protein", label: "Protein", color: "var(--protein)", soft: "var(--protein-soft)" },
  { key: "carbs", label: "Carbs", color: "var(--carbs)", soft: "var(--carbs-soft)" },
  { key: "fat", label: "Fat", color: "var(--fat)", soft: "var(--fat-soft)" },
] as const;

export function MacroBars({
  values,
  goals,
}: {
  values: { protein: number; carbs: number; fat: number };
  goals: { protein: number; carbs: number; fat: number };
}) {
  return (
    <>
      {MACROS.map((m) => {
        const v = values[m.key];
        const g = goals[m.key];
        const pct = g > 0 ? Math.min((v / g) * 100, 100) : 0;
        return (
          <div key={m.key} className="stack" style={{ gap: 6 }}>
            <div className="between" style={{ fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>{m.label}</span>
              <span className="muted">
                <b style={{ color: "var(--text)" }}>{fmt(v)}</b> / {fmt(g)} g
              </span>
            </div>
            <div
              className="bar-track"
              style={{ background: m.soft }}
              role="progressbar"
              aria-label={m.label}
              aria-valuenow={Math.round(v)}
              aria-valuemin={0}
              aria-valuemax={g}
            >
              <div className="bar-fill" style={{ width: `${pct}%`, background: m.color }} />
            </div>
          </div>
        );
      })}
    </>
  );
}
