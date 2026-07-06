"use client";

import { calculateEWS } from "@/lib/ews";
import type { SlotReading } from "@/lib/simulation/types";

const VITALS = [
  { key: "fr"   as const, label: "FR"   },
  { key: "pas"  as const, label: "PAS"  },
  { key: "fc"   as const, label: "FC"   },
  { key: "temp" as const, label: "TEMP" },
  { key: "nc"   as const, label: "NC"   },
];

const SCORE_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444"];

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Props { slots: SlotReading[] }

export function VitalsHeatmap({ slots }: Props) {
  if (slots.length === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>Sem dados no intervalo</p>;
  }

  const LABEL_W = 50;
  const CELL_W  = Math.max(24, Math.min(56, Math.floor((760 - LABEL_W) / slots.length)));
  const CELL_H  = 38;
  const HDR_H   = 22;
  const ROWS    = VITALS.length;
  const SVG_W   = LABEL_W + slots.length * CELL_W;
  const SVG_H   = HDR_H + ROWS * CELL_H;

  // Show at most 8 time labels evenly
  const labelEvery = Math.max(1, Math.ceil(slots.length / 8));

  return (
    <div
      className="rounded-lg overflow-x-auto"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "12px" }}
    >
      <svg width={SVG_W} height={SVG_H}>
        {/* Column time labels */}
        {slots.map((s, ci) =>
          ci % labelEvery === 0 ? (
            <text
              key={ci}
              x={LABEL_W + ci * CELL_W + CELL_W / 2}
              y={HDR_H - 5}
              textAnchor="middle"
              fontSize={8}
              fill="#666"
            >
              {fmtTime(s.t)}
            </text>
          ) : null
        )}

        {VITALS.map((v, ri) => {
          const y = HDR_H + ri * CELL_H;
          return (
            <g key={v.key}>
              {/* Row label */}
              <text
                x={LABEL_W - 6}
                y={y + CELL_H / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="#aaa"
              >
                {v.label}
              </text>

              {/* Cells */}
              {slots.map((s, ci) => {
                const score = calculateEWS(s).scores[v.key];
                const fill  = SCORE_COLORS[score] ?? SCORE_COLORS[0];
                return (
                  <rect
                    key={ci}
                    x={LABEL_W + ci * CELL_W + 1}
                    y={y + 2}
                    width={CELL_W - 2}
                    height={CELL_H - 4}
                    rx={2}
                    fill={`${fill}88`}
                  >
                    <title>
                      {v.label}: {s[v.key]} — {fmtTime(s.t)}
                    </title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
