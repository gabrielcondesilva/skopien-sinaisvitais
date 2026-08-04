"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export interface VentTrendSeries {
  key: string;
  label: string;
  unit: string;
  color: string;
  axis?: "left" | "right"; // default "left"
}

interface Props {
  title: string;
  data: Array<{ t: number }>;
  series: VentTrendSeries[];
  leftDomain: [number, number];
  rightDomain?: [number, number];
  syncId?: string;
  chartHeight?: number;
  lineType?: "linear" | "stepAfter"; // default "linear" (curva contínua); "stepAfter" pra doses em degrau (ver BombaTab)
}

// Painel combinado (várias curvas sobrepostas por categoria clínica — Pressões,
// Volumes, Oxigenação), inspirado no exemplo trazido pelo usuário
// (docs/ventilador-exemplo.png). A legenda fica embutida logo abaixo do
// título, gerada a partir do mesmo array `series` que alimenta as curvas —
// não do lado do gráfico como na referência.
export function VentTrendChart({ title, data, series, leftDomain, rightDomain, syncId, chartHeight = 180, lineType }: Props) {
  const hasRight = series.some((s) => s.axis === "right");

  return (
    <div
      className="rounded-lg p-4 flex flex-col"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-base font-semibold mb-1" style={{ color: "var(--muted)" }}>{title}</p>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--foreground)" }}>
            <span className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={data} syncId={syncId} margin={{ top: 8, right: hasRight ? 8 : 8, left: 0, bottom: 0 }}>
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
            yAxisId="left"
            domain={leftDomain}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          {hasRight && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={rightDomain}
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
          )}
          <Tooltip
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div
                  className="text-xs px-2 py-1.5 rounded flex flex-col gap-0.5"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <span style={{ color: "var(--muted)" }}>{fmtTime(label as number)}</span>
                  {series.map((s) => {
                    const v = payload.find((p) => p.dataKey === s.key)?.value;
                    if (v == null) return null;
                    return (
                      <span key={s.key} className="font-semibold" style={{ color: s.color }}>
                        {s.label}: {(v as number).toFixed(1)} {s.unit}
                      </span>
                    );
                  })}
                </div>
              );
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type={lineType ?? "linear"}
              yAxisId={s.axis === "right" ? "right" : "left"}
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: s.color }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
