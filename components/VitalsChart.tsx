"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LabelList,
} from "recharts";
import type { SlotReading } from "@/lib/simulation/types";

// ─── EWS score per vital (mesmos limiares do ews.ts) ─────────────────────────

// 0 = normal, 1 = yellow, 2 = red
function scoreVal(key: string, v: number): number {
  switch (key) {
    case "fr":
      if (v <= 9  || v >= 25) return 2;
      if (v <= 11 || v >= 21) return 1;
      return 0;
    case "spo2":
      if (v <= 91) return 2;
      if (v <= 94) return 1;
      return 0;
    case "pas":
      if (v <= 89  || v >= 180) return 2;
      if (v <= 99  || v >= 140) return 1;
      return 0;
    case "fc":
      if (v <= 49  || v >= 121) return 2;
      if (v <= 59  || v >= 101) return 1;
      return 0;
    case "temp":
      if (v <= 35.4 || v >= 38.5) return 2;
      if (v <= 35.9 || v >= 37.5) return 1;
      return 0;
    default:
      return 0;
  }
}

const ALERT_YELLOW = "#eab308";
const ALERT_RED    = "#ef4444";

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

function makeLabel(vitalKey: string, vitalColor: string, showAll: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function VitalLabel(props: any) {
    const { x, y, value } = props as { x?: string | number; y?: string | number; value?: unknown };
    const nx = typeof x === "string" ? parseFloat(x) : (x as number | undefined);
    const ny = typeof y === "string" ? parseFloat(y) : (y as number | undefined);
    const numVal = typeof value === "number" ? value : undefined;
    if (nx == null || isNaN(nx) || ny == null || isNaN(ny) || numVal == null) return null;
    const [cx2, cy2] = [nx, ny];
    const value2 = numVal;

    // Em alta densidade, só mostra labels de valores fora do padrão
    const score = scoreVal(vitalKey, value2);
    if (!showAll && score === 0) return null;

    const formatted =
      vitalKey === "temp"
        ? value2.toFixed(1)
        : String(Math.round(value2));

    const color = score >= 2 ? ALERT_RED : score === 1 ? ALERT_YELLOW : "#888888";

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

const VITALS_CFG = [
  { key: "fr"   as const, label: "FR",   unit: "rpm",  color: "#3b82f6", absMin: 4,  absMax: 60,  minRange: 8   },
  { key: "spo2" as const, label: "SpO₂", unit: "%",    color: "#a78bfa", absMin: 70, absMax: 100, minRange: 4   },
  { key: "pas"  as const, label: "PAS",  unit: "mmHg", color: "#fb923c", absMin: 40, absMax: 250, minRange: 20  },
  { key: "fc"   as const, label: "FC",   unit: "bpm",  color: "#f472b6", absMin: 20, absMax: 220, minRange: 20  },
  { key: "temp" as const, label: "TEMP", unit: "°C",   color: "#facc15", absMin: 33, absMax: 43,  minRange: 1.5 },
];

function computeDomain(
  slots: SlotReading[],
  key: (typeof VITALS_CFG)[number]["key"],
  absMin: number,
  absMax: number,
  minRange: number,
): [number, number] {
  const vals = slots
    .map((s) => s[key] as number | undefined)
    .filter((v): v is number => v != null && !isNaN(v));
  if (vals.length === 0) return [absMin, absMax];
  const dataMin = Math.min(...vals);
  const dataMax = Math.max(...vals);
  const range   = Math.max(dataMax - dataMin, minRange);
  const pad     = range * 0.25;
  return [
    Math.max(absMin, Math.floor(dataMin - pad)),
    Math.min(absMax, Math.ceil(dataMax  + pad)),
  ];
}

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Chart ───────────────────────────────────────────────────────────────────

interface Props { slots: SlotReading[] }

export function VitalsChart({ slots }: Props) {
  if (slots.length === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>Sem dados no intervalo</p>;
  }

  // Acima de 24 pontos, labels somente para valores fora do padrão
  const showAllLabels = slots.length <= 24;

  return (
    <div className="flex flex-col gap-3">
      {VITALS_CFG.map((v) => {
        const domain    = computeDomain(slots, v.key, v.absMin, v.absMax, v.minRange);
        const LabelComp = makeLabel(v.key, v.color, showAllLabels);

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
              <AreaChart data={slots} margin={{ top: 18, right: 8, left: -16, bottom: 0 }}>
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
                  tick={{ fontSize: 10, fill: "#666" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={domain}
                  tick={{ fontSize: 10, fill: "#666" }}
                  tickLine={false}
                  axisLine={false}
                  width={34}
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
                          {payload[0].value} {v.unit}
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
