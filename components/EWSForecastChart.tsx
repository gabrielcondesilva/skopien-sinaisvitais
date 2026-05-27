"use client";

import {
  ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { Internacao, SurgicalInternacao, SlotReading } from "@/lib/simulation/types";

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  internacao: Internacao | SurgicalInternacao;
  slots: SlotReading[];
  windowMs: number;
}

export function EWSForecastChart({ internacao, slots, windowMs }: Props) {
  const now = Date.now();
  const currentEws = internacao.currentEws;
  const forecast = internacao.ewsForecast;

  const hasHighForecast = forecast.some((f) => f.ews >= 7);
  const forecastColor = hasHighForecast ? "#ef4444" : "#3b82f6";
  const n = forecast.length;

  // Build unified dataset: history + connector + forecast
  const histPoints = slots.map((s) => ({
    t: s.t,
    ewsHist: s.ewsTotal as number | null,
    ewsFcast: null as number | null,
    bandBase: null as number | null,
    bandSpan: null as number | null,
  }));

  const connector = {
    t: now,
    ewsHist: currentEws,
    ewsFcast: n > 0 ? currentEws : null,
    bandBase: n > 0 ? currentEws : null,
    bandSpan: n > 0 ? 0 : null,
  };

  const fcastPoints = forecast.map((f, i) => {
    const half = Math.round((i / Math.max(n - 1, 1)) * 3);
    const lo = Math.max(0, f.ews - half);
    const hi = Math.min(14, f.ews + half);
    return {
      t: f.t,
      ewsHist: null as number | null,
      ewsFcast: f.ews,
      bandBase: lo,
      bandSpan: hi - lo,
    };
  });

  const chartData = [...histPoints, connector, ...fcastPoints].sort((a, b) => a.t - b.t);

  const xDomain: [number, number] = [now - windowMs, now + 2 * 3_600_000];

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Title row */}
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm font-medium">Histórico + Previsão EWS</p>
        <span className="text-xs" style={{ color: "var(--muted)" }}>próximas 2h</span>
        {hasHighForecast && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded font-medium"
            style={{ background: "#ef444420", color: "#ef4444" }}
          >
            ⚠ Previsão Crítica
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={xDomain}
            tickFormatter={fmtTime}
            tick={{ fontSize: 10, fill: "#666" }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            domain={[0, 15]}
            tick={{ fontSize: 10, fill: "#666" }}
            tickLine={false}
            axisLine={false}
            width={28}
            tickCount={6}
          />

          <Tooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const h = payload.find((p) => p.dataKey === "ewsHist" && p.value != null);
              const f = payload.find((p) => p.dataKey === "ewsFcast" && p.value != null);
              const val = h?.value ?? f?.value;
              if (val == null) return null;
              return (
                <div
                  className="text-xs px-2 py-1.5 rounded"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <span style={{ color: "var(--muted)" }}>{fmtTime(label as number)}</span>
                  <span
                    className="ml-2 font-bold"
                    style={{ color: f && !h ? forecastColor : "#3b82f6" }}
                  >
                    EWS {val}{f && !h ? " (prev)" : ""}
                  </span>
                </div>
              );
            }}
          />

          {/* EWS threshold lines */}
          <ReferenceLine y={3} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.35} />
          <ReferenceLine y={5} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.45} />
          <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.55} />

          {/* "Agora" vertical line */}
          <ReferenceLine
            x={now}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
            label={{
              value: "agora",
              position: "insideTopRight",
              fill: "#555",
              fontSize: 9,
              offset: 6,
            }}
          />

          {/* Uncertainty band (stacked: transparent base + colored span) */}
          <Area
            dataKey="bandBase"
            stackId="band"
            stroke="none"
            fill="none"
            isAnimationActive={false}
            legendType="none"
          />
          <Area
            dataKey="bandSpan"
            stackId="band"
            stroke="none"
            fill={forecastColor}
            fillOpacity={0.12}
            isAnimationActive={false}
            legendType="none"
          />

          {/* Historical solid line */}
          <Line
            dataKey="ewsHist"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* Forecast dashed line */}
          <Line
            dataKey="ewsFcast"
            stroke={forecastColor}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-6 mt-3 flex-wrap"
        style={{ color: "var(--muted)" }}
      >
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-5 h-0.5" style={{ background: "#3b82f6" }} />
          Histórico
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <svg width={20} height={4}>
            <line x1={0} y1={2} x2={20} y2={2} stroke={forecastColor} strokeWidth={2} strokeDasharray="5 3" />
          </svg>
          Previsão
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span style={{ color: "#eab308" }}>— Atenção ≥3</span>
          <span style={{ color: "#f97316" }}>— Risco ≥5</span>
          <span style={{ color: "#ef4444" }}>— Crítico ≥7</span>
        </div>
      </div>
    </div>
  );
}
