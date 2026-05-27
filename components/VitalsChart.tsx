"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { SlotReading } from "@/lib/simulation/types";

const VITALS_CFG = [
  { key: "fr"   as const, label: "FR",   unit: "rpm",  color: "#3b82f6", domain: [0,   40]  as [number,number] },
  { key: "spo2" as const, label: "SpO₂", unit: "%",    color: "#a78bfa", domain: [82, 102]  as [number,number] },
  { key: "pas"  as const, label: "PAS",  unit: "mmHg", color: "#fb923c", domain: [60, 250]  as [number,number] },
  { key: "fc"   as const, label: "FC",   unit: "bpm",  color: "#f472b6", domain: [30, 160]  as [number,number] },
  { key: "temp" as const, label: "TEMP", unit: "°C",   color: "#facc15", domain: [34,  42]  as [number,number] },
];

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Props { slots: SlotReading[] }

export function VitalsChart({ slots }: Props) {
  if (slots.length === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>Sem dados no intervalo</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {VITALS_CFG.map((v) => (
        <div
          key={v.key}
          className="rounded-lg p-4 flex flex-col"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>
            {v.label}&nbsp;<span style={{ opacity: 0.6, fontSize: 11 }}>({v.unit})</span>
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={slots} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${v.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor={v.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={v.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="t"
                tickFormatter={fmtTime}
                tick={{ fontSize: 10, fill: "#666" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={v.domain}
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
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
