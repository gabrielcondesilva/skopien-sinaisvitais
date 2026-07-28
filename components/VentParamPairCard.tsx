"use client";

import { VITAL_SEVERITY_COLOR } from "@/lib/vitalSeverity";

interface PairValue {
  label: string;
  unit: string;
  value: number | string;
  score: number;
}

interface Props {
  groupLabel: string;
  left: PairValue;
  right: PairValue;
}

// Mesmo par clínico que antes ocupava dois VitalCard's, agora unido num único
// card com os dois valores lado a lado separados por uma linha vertical — fica
// visualmente mais compacto sem perder a cor de severidade por valor.
export function VentParamPairCard({ groupLabel, left, right }: Props) {
  const values = [left, right];

  return (
    <div
      className="rounded-lg p-2.5 flex flex-col gap-1.5 flex-1 min-w-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-sm" style={{ color: "var(--muted)" }}>{groupLabel}</span>
      <div className="flex items-stretch gap-3">
        {values.map((v, i) => {
          const color = VITAL_SEVERITY_COLOR[Math.min(v.score, 2)] ?? VITAL_SEVERITY_COLOR[0];
          return (
            <div key={v.label} className="flex-1 flex items-stretch gap-3 min-w-0">
              {i > 0 && <span style={{ width: 1, background: "var(--border)" }} />}
              <div className="flex-1 flex flex-col items-center min-w-0">
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>{v.label}</span>
                <span className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>{v.value}</span>
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>{v.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
