"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LabelList,
} from "recharts";
import type { SlotReading } from "@/lib/simulation/types";
import { vitalSeverity, VITAL_SEVERITY_COLOR } from "@/lib/vitalSeverity";

function scoreVal(key: string, v: number): number {
  return vitalSeverity(key, v);
}

const [, ALERT_YELLOW, ALERT_RED] = VITAL_SEVERITY_COLOR;

// ─── Custom dot ──────────────────────────────────────────────────────────────

function VitalDot({
  cx, cy, value, vitalKey, vitalColor,
}: {
  cx?: number; cy?: number; value?: number;
  vitalKey: string; vitalColor: string;
}) {
  if (cx == null || cy == null || value == null) return null;

  const score = scoreVal(vitalKey, value);

  if (score >= 2) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill={ALERT_RED} fillOpacity={0.25}>
          <animate attributeName="r"       values="4;9;4"     dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r={3.5} fill={ALERT_RED} />
      </g>
    );
  }

  if (score === 1) {
    return <circle cx={cx} cy={cy} r={3} fill={ALERT_YELLOW} />;
  }

  // Normal: ponto cinza discreto
  return <circle cx={cx} cy={cy} r={2.5} fill="#888888" fillOpacity={0.7} />;
}

// ─── Custom label ─────────────────────────────────────────────────────────────

function makeLabel(vitalKey: string, vitalColor: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function VitalLabel(props: any) {
    const { x, y, value } = props as { x?: string | number; y?: string | number; value?: unknown };
    const nx = typeof x === "string" ? parseFloat(x) : (x as number | undefined);
    const ny = typeof y === "string" ? parseFloat(y) : (y as number | undefined);
    const numVal = typeof value === "number" ? value : undefined;
    if (nx == null || isNaN(nx) || ny == null || isNaN(ny) || numVal == null) return null;
    const [cx2, cy2] = [nx, ny];
    const value2 = numVal;

    const score = scoreVal(vitalKey, value2);

    const formatted = value2.toFixed(1);

    const color = score >= 2 ? ALERT_RED : score === 1 ? ALERT_YELLOW : "var(--muted)";

    return (
      <text
        x={cx2}
        y={cy2 - 9}
        textAnchor="middle"
        fontSize={9}
        fontWeight={score > 0 ? 600 : 400}
        fill={color}
      >
        {formatted}
      </text>
    );
  };
}

// ─── Domain dinâmico ─────────────────────────────────────────────────────────
// Janela de 4 valores no eixo Y (3 × step) centralizada nos dados, com folga de
// meio step acima e abaixo — os valores não devem grudar no topo/fundo do gráfico.
// A janela só cresce além do padrão quando os dados não cabem nela (ex.: evento
// de deterioração roteirizado), e só desliza quando um valor alcança a borda.

const VITALS_CFG = [
  { key: "fr"   as const, label: "FR",   unit: "rpm",  color: "#3b82f6", absMin: 4,  absMax: 60,  step: 2   },
  { key: "spo2" as const, label: "SpO₂", unit: "%",    color: "#a78bfa", absMin: 70, absMax: 100, step: 1   },
  { key: "pas"  as const, label: "PAS",  unit: "mmHg", color: "#fb923c", absMin: 40, absMax: 250, step: 5   },
  { key: "fc"   as const, label: "FC",   unit: "bpm",  color: "#f472b6", absMin: 20, absMax: 220, step: 5   },
  { key: "temp" as const, label: "TEMP", unit: "°C",   color: "#facc15", absMin: 33, absMax: 43,  step: 0.5 },
];

const AXIS_TICK_COUNT = 4;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function computeDomain(
  slots: SlotReading[],
  key: (typeof VITALS_CFG)[number]["key"],
  absMin: number,
  absMax: number,
  step: number,
): { domain: [number, number]; ticks: number[] } {
  const minSpan = step * (AXIS_TICK_COUNT - 1);
  const vals = slots
    .map((s) => s[key] as number | undefined)
    .filter((v): v is number => v != null && !isNaN(v));

  let base: number;
  let span: number;

  if (vals.length === 0) {
    base = absMin;
    span = minSpan;
  } else {
    const dataMin = Math.min(...vals);
    const dataMax = Math.max(...vals);
    // folga de meio step de cada lado, arredondada pra cima em múltiplos de step
    const neededSpan = Math.ceil((dataMax - dataMin + step) / step) * step;
    span = Math.max(minSpan, neededSpan);

    const mid = (dataMin + dataMax) / 2;
    base = Math.round((mid - span / 2) / step) * step;

    // garante que os dados fiquem dentro da janela mesmo após o arredondamento
    while (dataMin < base + step * 0.4) base -= step;
    while (dataMax > base + span - step * 0.4) base += step;
  }

  let top = base + span;
  if (base < absMin) { base = absMin; top = Math.min(absMax, base + span); }
  if (top  > absMax) { top  = absMax; base = Math.max(absMin, top - span); }

  const ticks: number[] = [];
  const tickStep = (top - base) / (AXIS_TICK_COUNT - 1);
  for (let i = 0; i < AXIS_TICK_COUNT; i++) ticks.push(round2(base + tickStep * i));

  return { domain: [round2(base), round2(top)], ticks };
}

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Chart ───────────────────────────────────────────────────────────────────

interface Props { slots: SlotReading[]; syncId?: string }

export function VitalsChart({ slots, syncId }: Props) {
  if (slots.length === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>Sem dados no intervalo</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {VITALS_CFG.map((v) => {
        const { domain, ticks } = computeDomain(slots, v.key, v.absMin, v.absMax, v.step);
        const LabelComp = makeLabel(v.key, v.color);

        return (
          <div
            key={v.key}
            className="rounded-lg p-4 flex flex-col"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>
              {v.label}&nbsp;<span style={{ opacity: 0.6, fontSize: 11 }}>({v.unit})</span>
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={slots} syncId={syncId} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`g-${v.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={v.color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={v.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                  domain={domain}
                  ticks={ticks}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  isAnimationActive={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.[0]) return null;
                    return (
                      <div
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <span style={{ color: "var(--muted)" }}>{fmtTime(label as number)}</span>
                        <span className="ml-2 font-semibold" style={{ color: v.color }}>
                          {(payload[0].value as number).toFixed(1)} {v.unit}
                        </span>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={v.key}
                  stroke={v.color}
                  strokeWidth={1.5}
                  fill={`url(#g-${v.key})`}
                  isAnimationActive={false}
                  dot={(props) => (
                    <VitalDot
                      key={`dot-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      value={props.value}
                      vitalKey={v.key}
                      vitalColor={v.color}
                    />
                  )}
                  activeDot={{ r: 4, fill: v.color }}
                >
                  <LabelList content={LabelComp} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
