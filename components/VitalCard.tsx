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
  value: number | string;
  score: number;
  min?: number;
  max?: number;
}

export function VitalCard({ label, unit, value, score, min, max }: Props) {
  const color = SCORE_COLOR[Math.min(score, 3)] ?? SCORE_COLOR[0];
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1 flex-1 min-w-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
          {value}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{unit}</span>
      </div>
      {min !== undefined && max !== undefined && (
        <div className="flex gap-2 mt-1 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            Mín&nbsp;<span className="font-semibold tabular-nums" style={{ color: "var(--sk-text-secondary)" }}>{min}</span>
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            Máx&nbsp;<span className="font-semibold tabular-nums" style={{ color: "var(--sk-text-secondary)" }}>{max}</span>
          </span>
        </div>
      )}
    </div>
  );
}
