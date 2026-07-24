"use client";

import {
  ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ResponsiveContainer, LabelList,
} from "recharts";
import type { Internacao, SurgicalInternacao, SlotReading } from "@/lib/simulation/types";

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Janela fixa desta visualização: 3h de histórico + 3h de previsão
const FORECAST_WINDOW_MS = 3 * 3_600_000;

function statusColor(total: number): string {
  if (total >= 7) return "#F03E3E"; // Crítico
  if (total >= 5) return "#F76707"; // Risco Elevado
  if (total >= 4) return "#F59F00"; // Atenção
  return "#2F9E44"; // Estável
}

// Recharts não repassa o datum original ao content de LabelList — usamos o
// índice posicional dentro do array ordenado do gráfico (`chartData`) para
// decidir quais pontos ganham rótulo.
function makeEwsLabel(dashed: boolean, isVisible: (index: number) => boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function EwsLabel(props: any) {
    const { x, y, value, index } = props as {
      x?: string | number; y?: string | number; value?: unknown; index?: number;
    };
    const nx = typeof x === "string" ? parseFloat(x) : (x as number | undefined);
    const ny = typeof y === "string" ? parseFloat(y) : (y as number | undefined);
    const numVal = typeof value === "number" ? value : undefined;
    if (nx == null || isNaN(nx) || ny == null || isNaN(ny) || numVal == null) return null;
    if (index == null || !isVisible(index)) return null;

    return (
      <text
        x={nx}
        y={ny - 9}
        textAnchor="middle"
        fontSize={9}
        fontWeight={numVal >= 4 ? 600 : 400}
        fill={statusColor(numVal)}
        fontStyle={dashed ? "italic" : "normal"}
      >
        {numVal}
      </text>
    );
  };
}

interface Props {
  internacao: Internacao | SurgicalInternacao;
  slots: SlotReading[];
}

export function EWSForecastChart({ internacao, slots }: Props) {
  const now = Date.now();
  const currentEws = internacao.currentEws;
  const forecast = internacao.ewsForecast;

  const hasHighForecast = forecast.some((f) => f.ews >= 7);
  const forecastColor = hasHighForecast ? "#F03E3E" : "#3b82f6";
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

  // chartData preserva a ordem de concatenação (hist < now < forecast), então
  // o índice posicional de cada ponto é estável e pode ser usado p/ rótulos
  const connectorIndex = histPoints.length;
  const forecastStartIndex = connectorIndex + 1;
  const histLabel = makeEwsLabel(false, () => true);
  const fcastLabel = makeEwsLabel(true, (index) => {
    // ponto "agora" já é rotulado pela linha histórica — evita label duplicado
    const fi = index - forecastStartIndex;
    return fi >= 0 && fi % 6 === 5; // 1 a cada 30min (passos de 5min)
  });

  const chartData = [...histPoints, connector, ...fcastPoints].sort((a, b) => a.t - b.t);

  const xDomain: [number, number] = [now - FORECAST_WINDOW_MS, now + FORECAST_WINDOW_MS];

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Title row */}
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm font-medium">Histórico + Previsão EWS</p>
        <span className="text-xs" style={{ color: "var(--muted)" }}>3h histórico · 3h previsão</span>
        {hasHighForecast && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded font-medium"
            style={{ background: "#F03E3E20", color: "#F03E3E" }}
          >
            ⚠ Previsão Crítica
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 18, right: 20, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={xDomain}
            tickFormatter={fmtTime}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            domain={[0, 15]}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
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
          <ReferenceLine y={4} stroke="#F59F00" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={7} stroke="#F03E3E" strokeDasharray="3 3" strokeOpacity={0.5} />

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
          >
            <LabelList content={histLabel} />
          </Line>

          {/* Forecast dashed line */}
          <Line
            dataKey="ewsFcast"
            stroke={forecastColor}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          >
            <LabelList content={fcastLabel} />
          </Line>
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
          <span style={{ color: "#2F9E44" }}>— Estável</span>
          <span style={{ color: "#F59F00" }}>— Atenção ≥4</span>
          <span style={{ color: "#F76707" }}>— Risco Elevado ≥5</span>
          <span style={{ color: "#F03E3E" }}>— Crítico ≥7</span>
        </div>
      </div>
    </div>
  );
}
