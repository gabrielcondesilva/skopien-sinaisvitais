"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import type { VentSeriesPoint } from "@/lib/simulation/ventilator";

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export interface VentChartConfig {
  key: "paw" | "flow" | "volume";
  label: string;
  unit: string;
  color: string;
  domain: [number, number];
  zeroLine?: boolean;
}

// Cores por convenção clínica (pedido do usuário): Pressão em âmbar/laranja,
// Fluxo em verde, Volume em azul. Domínios fixos (não dinâmicos como os de
// VitalsChart) — cobrem confortavelmente os clamps de lib/simulation/ventilator.ts.
export const VENT_CHARTS_CFG: VentChartConfig[] = [
  { key: "paw",    label: "Pressão de Vias Aéreas", unit: "cmH2O", color: "#f59e0b", domain: [-5, 40] },
  { key: "flow",   label: "Fluxo",                  unit: "L/min", color: "#22c55e", domain: [-50, 50], zeroLine: true },
  { key: "volume", label: "Volume Corrente",        unit: "mL",    color: "#3b82f6", domain: [0, 650] },
];

interface Props {
  cfg: VentChartConfig;
  data: VentSeriesPoint[];
  syncId?: string;
  compact?: boolean;
  headerExtra?: React.ReactNode;
  chartHeight?: number;
}

export function VentilatorChart({ cfg, data, syncId, compact = false, headerExtra, chartHeight: chartHeightProp }: Props) {
  const chartHeight = chartHeightProp ?? (compact ? 85 : 180);

  return (
    <div
      className={compact ? "rounded-lg p-2 flex flex-col" : "rounded-lg p-4 flex flex-col"}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className={compact ? "mb-0.5" : "mb-3"}>
        <div className="flex items-center justify-between gap-2">
          <p className={compact ? "text-xs font-semibold" : "text-base font-semibold"} style={{ color: "var(--muted)" }}>
            {cfg.label}&nbsp;<span style={{ opacity: 0.6, fontSize: compact ? 11 : 12 }}>({cfg.unit})</span>
          </p>
          {headerExtra}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart data={data} syncId={syncId} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-vent-${cfg.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="10%" stopColor={cfg.color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
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
            domain={cfg.domain}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
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
                  <span className="ml-2 font-semibold" style={{ color: cfg.color }}>
                    {(payload[0].value as number).toFixed(1)} {cfg.unit}
                  </span>
                </div>
              );
            }}
          />
          {/* Linha de zero — só Fluxo, separa visualmente inspiração (+) de expiração (-) */}
          {cfg.zeroLine && (
            <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.5} strokeWidth={1.5} />
          )}
          <Area
            type="monotone"
            dataKey={cfg.key}
            stroke={cfg.color}
            strokeWidth={1.5}
            fill={`url(#g-vent-${cfg.key})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, fill: cfg.color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
