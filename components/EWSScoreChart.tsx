"use client";

import { useState } from "react";
import {
  ComposedChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ResponsiveContainer, LabelList,
} from "recharts";
import type { SlotReading } from "@/lib/simulation/types";
import { calculateEWS } from "@/lib/ews";
import { Icon } from "./ui/Icon";

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtScore(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

function statusColor(total: number): string {
  if (total >= 7) return "#F03E3E"; // Crítico
  if (total >= 5) return "#F76707"; // Risco Elevado
  if (total >= 4) return "#F59F00"; // Atenção
  return "#2F9E44"; // Estável
}

// ─── Domain dinâmico ─────────────────────────────────────────────────────────
// Piso de 8 (headroom o suficiente pra ver variação em torno de escores baixos/moderados).
// Sobe de 2 em 2 sempre que algum valor da janela alcança o teto atual, até o máximo de 15.

const EWS_DOMAIN_FLOOR = 8;
const EWS_DOMAIN_MAX = 15;
const EWS_DOMAIN_STEP = 2;

function computeEwsDomain(slots: SlotReading[]): [number, number] {
  const vals = slots
    .map((s) => s.ewsTotal)
    .filter((v): v is number => v != null && !isNaN(v));
  const dataMax = vals.length > 0 ? Math.max(...vals) : 0;

  let top = EWS_DOMAIN_FLOOR;
  while (dataMax >= top && top < EWS_DOMAIN_MAX) {
    top = Math.min(EWS_DOMAIN_MAX, top + EWS_DOMAIN_STEP);
  }
  return [0, top];
}

function computeEwsTicks(top: number): number[] {
  const ticks: number[] = [];
  for (let i = 0; i <= top; i += EWS_DOMAIN_STEP) ticks.push(i);
  if (ticks[ticks.length - 1] !== top) ticks.push(top);
  return ticks;
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
        y={ny - 10}
        textAnchor="middle"
        fontSize={12}
        fontWeight={numVal >= 4 ? 600 : 400}
        fill={statusColor(numVal)}
      >
        {numVal}
      </text>
    );
  };
}

interface Props {
  slots: SlotReading[];
  syncId?: string;
  compact?: boolean;
  collapsible?: boolean;
  highlight?: boolean;
  headerExtra?: React.ReactNode;
  chartHeight?: number;
}

export function EWSScoreChart({ slots, syncId, compact = false, collapsible = true, highlight = false, headerExtra, chartHeight: chartHeightProp }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const ScoreLabel = makeScoreLabel();
  const [domainMin, domainMax] = computeEwsDomain(slots);
  const ticks = computeEwsTicks(domainMax);
  const chartHeight = chartHeightProp ?? (compact ? 85 : 180);
  const isCollapsed = collapsible && collapsed;

  return (
    <div
      className={compact ? "rounded-lg p-2" : "rounded-lg p-4"}
      style={{ background: "var(--surface)", border: `1px solid ${highlight ? "var(--accent)" : "var(--border)"}` }}
    >
      <div className="flex items-center justify-between gap-2">
      {collapsible ? (
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className="flex items-center gap-2 text-left"
          style={{ cursor: "pointer" }}
        >
          <Icon name={collapsed ? "chevron-right" : "chevron-down"} size={compact ? 12 : 14} color="var(--muted)" />
          <p className={compact ? "text-[11px] font-medium" : "text-sm font-medium"}>Early Warning Score</p>
        </button>
      ) : (
        <p className={compact ? "text-[11px] font-medium" : "text-sm font-medium"}>Early Warning Score</p>
      )}
      {headerExtra}
      </div>

      {!isCollapsed && (
      <>
      <div className={compact ? "mt-1" : "mt-4"}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={slots} syncId={syncId} margin={{ top: 18, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="t"
            tickFormatter={fmtTime}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            padding={{ left: 20, right: 20 }}
          />

          <YAxis
            domain={[domainMin, domainMax]}
            ticks={ticks}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={30}
          />

          <Tooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const slot = payload[0].payload as SlotReading;
              const ews = calculateEWS(slot);
              const rows = [
                { label: "FR",   value: slot.fr.toFixed(1), score: ews.scores.fr },
                { label: "PAS",  value: slot.pas.toFixed(1), score: ews.scores.pas },
                { label: "FC",   value: slot.fc.toFixed(1), score: ews.scores.fc },
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

          <ReferenceLine y={4} stroke="#F59F00" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={7} stroke="#F03E3E" strokeDasharray="3 3" strokeOpacity={0.5} />

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

      {!compact && (
        <div className="flex items-center justify-center flex-wrap gap-4 mt-3" style={{ color: "var(--muted)" }}>
          <span className="text-xs" style={{ color: "#2F9E44" }}>— Estável</span>
          <span className="text-xs" style={{ color: "#F59F00" }}>— Atenção ≥4</span>
          <span className="text-xs" style={{ color: "#F76707" }}>— Risco Elevado ≥5</span>
          <span className="text-xs" style={{ color: "#F03E3E" }}>— Crítico ≥7</span>
        </div>
      )}
      </div>
      </>
      )}
    </div>
  );
}
