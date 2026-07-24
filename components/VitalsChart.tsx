"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LabelList,
} from "recharts";
import type { Alert, SlotReading } from "@/lib/simulation/types";
import { vitalSeverity, VITAL_SEVERITY_COLOR } from "@/lib/vitalSeverity";
import { ALARM_UNIT } from "@/lib/vitalAlarm";

function scoreVal(key: string, v: number): number {
  return vitalSeverity(key, v);
}

const [, ALERT_YELLOW, ALERT_RED] = VITAL_SEVERITY_COLOR;

// ─── Custom dot ──────────────────────────────────────────────────────────────

function VitalDot({
  cx, cy, value, vitalKey, isAlert,
}: {
  cx?: number; cy?: number; value?: number;
  vitalKey: string; vitalColor: string; isAlert?: boolean;
}) {
  if (cx == null || cy == null || value == null) return null;

  // Marca de horário de alerta (toggle "Alertas" ligado) sobrepõe a cor de severidade —
  // é o ponto onde o alerta disparou, independente do valor estar ou não em faixa crítica.
  // Fixo (sem piscar), vermelho, borda branca — precisa chamar mais atenção que o
  // ponto normal do gráfico.
  if (isAlert) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={10} fill={ALERT_RED} fillOpacity={0.25} />
        <circle cx={cx} cy={cy} r={6} fill={ALERT_RED} stroke="#fff" strokeWidth={2} />
      </g>
    );
  }

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
        y={cy2 - 10}
        textAnchor="middle"
        fontSize={12}
        fontWeight={score > 0 ? 600 : 400}
        fill={color}
      >
        {formatted}
      </text>
    );
  };
}

// ─── Domain dinâmico ─────────────────────────────────────────────────────────
// Janela no eixo Y ajustada aos dados: folga de meio step acima do máximo e
// abaixo do mínimo — não a janela inteira arredondada em múltiplos de step,
// que deixava os pontos "encostados" numa borda distante do valor real.

export const VITALS_CFG = [
  { key: "fr"   as const, label: "FR",   unit: "rpm",  color: "#3b82f6", absMin: 4,  absMax: 60,  step: 2   },
  { key: "spo2" as const, label: "SpO₂", unit: "%",    color: "#a78bfa", absMin: 70, absMax: 100, step: 1   },
  { key: "pas"  as const, label: "PAS",  unit: "mmHg", color: "#fb923c", absMin: 40, absMax: 250, step: 5   },
  { key: "fc"   as const, label: "FC",   unit: "bpm",  color: "#f472b6", absMin: 20, absMax: 220, step: 5   },
  { key: "temp" as const, label: "TEMP", unit: "°C",   color: "#facc15", absMin: 33, absMax: 43,  step: 0.5 },
];

export type VitalChartConfig = (typeof VITALS_CFG)[number];

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
  const pad = step / 2;
  const vals = slots
    .map((s) => s[key] as number | undefined)
    .filter((v): v is number => v != null && !isNaN(v));

  const dataMin = vals.length ? Math.min(...vals) : absMin;
  const dataMax = vals.length ? Math.max(...vals) : absMin;

  let base = dataMin - pad;
  let top  = dataMax + pad;

  if (base < absMin) base = absMin;
  if (top  > absMax) top  = absMax;
  if (top <= base) top = base + pad * 2;

  return { domain: [round2(base), round2(top)], ticks: [round2(base), round2(top)] };
}

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Chart ───────────────────────────────────────────────────────────────────

interface CardProps {
  vital: VitalChartConfig;
  slots: SlotReading[];
  syncId?: string;
  compact?: boolean;
  headerExtra?: React.ReactNode;
  chartHeight?: number;
  // Alertas de sinal-vital do PRÓPRIO parâmetro deste gráfico, indexados pelo slot
  // exibido — pisca só aqui, nunca nos outros vitais (CONTEXT.md § Alertas).
  alertSlotMap?: Map<number, Alert>;
}

export function VitalChartCard({ vital: v, slots, syncId, compact = false, headerExtra, chartHeight: chartHeightProp, alertSlotMap }: CardProps) {
  const chartHeight = chartHeightProp ?? (compact ? 85 : 180);
  const { domain, ticks } = computeDomain(slots, v.key, v.absMin, v.absMax, v.step);
  const LabelComp = makeLabel(v.key, v.color);

  return (
    <div
      className={compact ? "rounded-lg p-2 flex flex-col" : "rounded-lg p-4 flex flex-col"}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className={`flex items-center justify-between gap-2 ${compact ? "mb-0.5" : "mb-3"}`}>
        <p className={compact ? "text-xs font-semibold" : "text-base font-semibold"} style={{ color: "var(--muted)" }}>
          {v.label}&nbsp;<span style={{ opacity: 0.6, fontSize: compact ? 11 : 12 }}>({v.unit})</span>
        </p>
        {headerExtra}
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
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
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            padding={{ left: 20, right: 20 }}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.[0]) return null;
              const alert = alertSlotMap?.get(label as number);
              return (
                <div
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <span style={{ color: "var(--muted)" }}>{fmtTime(label as number)}</span>
                    <span className="ml-2 font-semibold" style={{ color: v.color }}>
                      {(payload[0].value as number).toFixed(1)} {v.unit}
                    </span>
                  </div>
                  {alert && (
                    <div className="mt-0.5 font-semibold" style={{ color: ALERT_RED }}>
                      {`Alerta - ${alert.valor ?? ""}${ALARM_UNIT[v.key]} às ${fmtTime(alert.firedAt)}`}
                    </div>
                  )}
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
                isAlert={alertSlotMap?.has((props.payload as SlotReading)?.t)}
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
}

interface Props { slots: SlotReading[]; syncId?: string; compact?: boolean; chartHeight?: number }

export function VitalsChart({ slots, syncId, compact = false, chartHeight }: Props) {
  if (slots.length === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>Sem dados no intervalo</p>;
  }

  const cards = VITALS_CFG.map((v) => (
    <VitalChartCard key={v.key} vital={v} slots={slots} syncId={syncId} compact={compact} chartHeight={chartHeight} />
  ));

  if (compact) return <>{cards}</>;
  return <div className="flex flex-col gap-3">{cards}</div>;
}
