"use client";

const SCORE_COLOR = [
  "var(--status-stable)",
  "var(--status-attention)",
  "var(--status-elevated)",
  "var(--status-critical)",
];

interface Props {
  label: string;
  unit: string;
  value: number;
  score: number; // 0–3 individual EWS score
}

export function VitalCard({ label, unit, value, score }: Props) {
  const color = SCORE_COLOR[Math.min(score, 3)] ?? SCORE_COLOR[0];
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1 flex-1 min-w-0"
      style={{ background: "var(--surface)", border: `1px solid ${color}55` }}
    >
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
          {value}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{unit}</span>
      </div>
    </div>
  );
}
