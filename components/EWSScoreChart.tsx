"use client";

import {
  ComposedChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ResponsiveContainer, LabelList,
} from "recharts";
import type { SlotReading } from "@/lib/simulation/types";
import { calculateEWS } from "@/lib/ews";

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtScore(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

function statusColor(total: number): string {
  if (total >= 5) return "#F03E3E"; // Alto
  if (total >= 3) return "#F59F00"; // Moderado
  return "#2F9E44"; // Baixo
}

function ScoreDot({ cx, cy, value, index }: { cx?: number; cy?: number; value?: number; index?: number }) {
  if (cx == null || cy == null || value == null) return null;
  return <circle key={`ews-dot-${index}`} cx={cx} cy={cy} r={3} fill={statusColor(value)} />;
}

function makeScoreLabel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function ScoreLabel(props: any) {
    const { x, y, value } = props as { x?: string | number; y?: string | number; value?: unknown };
    const nx = typeof x === "string" ? parseFloat(x) : (x as number | undefined);
    const ny = typeof y === "string" ? parseFloat(y) : (y as number | undefined);
    const numVal = typeof value === "number" ? value : undefined;
    if (nx == null || isNaN(nx) || ny == null || isNaN(ny) || numVal == null) return null;

    return (
      <text
        x={nx}
        y={ny - 9}
        textAnchor="middle"
        fontSize={9}
        fontWeight={numVal >= 3 ? 600 : 400}
        fill={statusColor(numVal)}
      >
        {numVal}
      </text>
    );
  };
}

interface Props {
  slots: SlotReading[];
}

export function EWSScoreChart({ slots }: Props) {
  const ScoreLabel = makeScoreLabel();

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm font-medium">Early Warning Score</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={slots} margin={{ top: 18, right: 20, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="t"
            tickFormatter={fmtTime}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[0, 15]}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={28}
            tickCount={6}
          />

          <Tooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const slot = payload[0].payload as SlotReading;
              const ews = calculateEWS(slot);
              const rows = [
                { label: "FR",   value: `${Math.round(slot.fr)}`, score: ews.scores.fr },
                { label: "PAS",  value: `${Math.round(slot.pas)}`, score: ews.scores.pas },
                { label: "FC",   value: `${Math.round(slot.fc)}`, score: ews.scores.fc },
                { label: "TEMP", value: slot.temp.toFixed(1), score: ews.scores.temp },
                { label: "NC",   value: slot.nc, score: ews.scores.nc },
              ];
              return (
                <div
                  className="text-xs px-2 py-1.5 rounded"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <span style={{ color: "var(--muted)" }}>{fmtTime(label as number)}</span>
                    <span className="ml-2 font-bold" style={{ color: statusColor(ews.total) }}>EWS {ews.total}</span>
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {rows.map((r) => (
                      <span key={r.label}>
                        {r.label} {r.value} <span style={{ color: "var(--muted)" }}>({fmtScore(r.score)})</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            }}
          />

          <ReferenceLine y={3} stroke="#F59F00" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={5} stroke="#F03E3E" strokeDasharray="3 3" strokeOpacity={0.5} />

          <Line
            dataKey="ewsTotal"
            stroke="#888888"
            strokeWidth={2}
            dot={<ScoreDot />}
            isAnimationActive={false}
            activeDot={(props) => {
              const { cx, cy, value } = props as { cx?: number; cy?: number; value?: number };
              if (cx == null || cy == null || value == null) return <g />;
              return <circle cx={cx} cy={cy} r={5} fill={statusColor(value)} />;
            }}
          >
            <LabelList content={ScoreLabel} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-4 mt-3 flex-wrap" style={{ color: "var(--muted)" }}>
        <span className="text-xs" style={{ color: "#2F9E44" }}>— Baixo</span>
        <span className="text-xs" style={{ color: "#F59F00" }}>— Moderado ≥3</span>
        <span className="text-xs" style={{ color: "#F03E3E" }}>— Alto ≥5</span>
      </div>
    </div>
  );
}
