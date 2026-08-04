"use client";

import { useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, type DotItemDotProps,
} from "recharts";
import type { PumpEvent, PumpTimeline } from "@/lib/simulation/infusionPumps";

// Cada bomba ocupa uma faixa 0-30 mL/h dentro de UM eixo Y compartilhado — 30
// cobre a taxa máxima de qualquer droga do catálogo (Propofol, até 25) com
// folga. Mesmo espírito do gráfico de referência (docs/bomba-exemplo.png):
// lá são 4 faixas 0-100 empilhadas num único chart, com "0" e "100" marcados
// no eixo de cada faixa; aqui usamos 0-30 porque é a escala real (mL/h) das
// nossas bombas, não um percentual normalizado.
const BAND_HEIGHT = 30;
// Espaço em branco entre faixas — precisa ser largo o bastante (em px, depois
// de convertido pela escala) pra caber os rótulos "0"/"30" das duas faixas
// vizinhas sem colidir (o Recharts esconde ticks que se sobrepõem).
const BAND_GAP = 20;
const BAND_STRIDE = BAND_HEIGHT + BAND_GAP;

// Eixo X em grade fixa de 15 em 15 min, nos horários redondos do relógio
// (13:00, 13:15, 13:30, 13:45, ...) — mesmo princípio do Slot Temporal usado
// nos gráficos de Monitor (CONTEXT.md): o "agora" do gráfico é o início do
// slot de 15min em andamento, não o milissegundo exato do relógio — por isso
// a última bolinha fica parada em (ex.) 14:45 até a simulação realmente bater
// 15:00, e não flutua solta um pouco à frente da última marca do eixo (o que
// não fazia sentido visualmente). Eventos reais (horários "quebrados", ex.:
// 13:22) são encaixados na PRÓXIMA marca de grade (13:30) — mesma regra da
// curva em degrau, que só reflete a nova dose a partir do primeiro horário de
// grade igual ou posterior ao evento — pra as bolinhas das 4 bombas ficarem
// alinhadas verticalmente. O horário exato de cada evento continua disponível
// ao passar o mouse (tooltip).
const GRID_MS = 15 * 60_000;

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtRate(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function floorTo15(t: number): number {
  const d = new Date(t);
  d.setSeconds(0, 0);
  d.setMinutes(Math.floor(d.getMinutes() / 15) * 15);
  return d.getTime();
}

function ceilTo15(t: number): number {
  const floored = floorTo15(t);
  return floored === t ? floored : floored + GRID_MS;
}

function buildGrid(windowStart: number, simNow: number): number[] {
  const start = floorTo15(windowStart);
  const end = floorTo15(simNow);
  const ticks: number[] = [];
  for (let g = start; g <= end; g += GRID_MS) {
    ticks.push(g);
  }
  return ticks;
}

// Variação % da dose só faz sentido quando o evento é um "Ajuste de Dose" (só
// esse tipo muda a taxa) — pra Bolus Adicional/Troca de Bolsa o tooltip
// simplesmente omite a setinha.
function rateChangeFor(tl: PumpTimeline, ev: PumpEvent): number | null {
  if (ev.type !== "Ajuste de Dose" || ev.doseSet == null) return null;
  const idx = tl.rateSeries.findIndex((p) => p.t === ev.t);
  if (idx <= 0) return null;
  const previous = tl.rateSeries[idx - 1].rate;
  if (previous <= 0 || previous === ev.doseSet) return null;
  return ((ev.doseSet - previous) / previous) * 100;
}

interface HoverInfo {
  pumpId: string;
  event: PumpEvent | null; // null = ponto "agora" (não é um evento específico)
  raw: number;
  cx: number;
  cy: number;
}

interface Props {
  timelines: PumpTimeline[];
  height: number;
}

// Gráfico único com uma curva em degrau por bomba, cada uma na sua própria
// faixa horizontal (sem sobreposição) — layout inspirado em
// docs/bomba-exemplo.png. O nome da droga + valor atual ficam junto da
// bolinha no fim da curva (não numa legenda à parte).
//
// O tooltip NÃO usa o <Tooltip> do Recharts: com 4 curvas no mesmo dataset
// compartilhado, o cursor/hover embutido do Recharts rastreia por posição X
// (não por curva), então passar o mouse em qualquer ponto de uma coluna
// vertical acaba "grudando" nas 4 linhas ao mesmo tempo — e ainda desenha
// aquela linha de cursor cinza atravessando o gráfico inteiro, que não é o
// que queremos aqui. Em vez disso, cada bolinha (marcador de evento) tem seu
// próprio onMouseEnter/onMouseLeave, e um tooltip HTML simples é posicionado
// à mão em cima das coordenadas (cx, cy) daquele ponto específico.
export function PumpDoseChart({ timelines, height }: Props) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const n = timelines.length;
  // windowStart/simNow vêm dos boundaries que computePumpTimelines já injeta
  // em rateSeries[0] e rateSeries[último] — iguais pra todas as bombas.
  const windowStart = timelines[0]?.rateSeries[0]?.t ?? 0;
  const simNow = timelines[0]?.rateSeries[timelines[0].rateSeries.length - 1]?.t ?? windowStart;
  const grid = buildGrid(windowStart, simNow);
  // Último ponto plotado = última marca da grade (o slot de 15min em
  // andamento) — não o milissegundo exato de "agora", pro "agora" do gráfico
  // não ficar solto à frente do último rótulo do eixo.
  const lastT = grid[grid.length - 1];

  // Por bomba: eventos (todos os tipos) encaixados na PRÓXIMA marca de grade
  // (nunca antes do horário real) — quando duas trocas caem na mesma marca
  // (comum com eventos a cada ~12min numa grade de 15min), fica só a mais
  // recente das duas. Eventos muito perto de "agora" que arredondariam pra
  // além da última marca ficam presos em `lastT` (o slot em andamento).
  const eventsByPumpAtGrid = new Map(
    timelines.map((tl) => {
      const byGrid = new Map<number, PumpEvent>();
      for (const ev of tl.events) byGrid.set(Math.min(ceilTo15(ev.t), lastT), ev);
      return [tl.pump.id, byGrid];
    })
  );

  const data = grid.map((t) => {
    const point: Record<string, number> = { t };
    timelines.forEach((tl, i) => {
      const band = n - 1 - i; // primeira bomba ocupa a faixa de cima
      let rate = tl.rateSeries[0]?.rate ?? 0;
      for (const p of tl.rateSeries) {
        if (p.t > t) break;
        rate = p.rate;
      }
      point[tl.pump.id] = band * BAND_STRIDE + Math.min(Math.max(rate, 0), BAND_HEIGHT);
      point[`${tl.pump.id}__raw`] = rate;
    });
    return point;
  });

  const domainMax = (n - 1) * BAND_STRIDE + BAND_HEIGHT;
  const timelineByPumpId = new Map(timelines.map((tl) => [tl.pump.id, tl]));

  const hoveredTl = hover ? timelineByPumpId.get(hover.pumpId) : undefined;
  const pctChange = hover?.event && hoveredTl ? rateChangeFor(hoveredTl, hover.event) : null;

  // "0" na base e "30" no topo de cada faixa — mesmo padrão da referência
  // (0/100 repetido em cada uma das 4 faixas de docs/bomba-exemplo.png).
  const yTicks: number[] = [];
  const yTickLabel = new Map<number, string>();
  for (let k = 0; k < n; k++) {
    const bottom = k * BAND_STRIDE;
    const top = bottom + BAND_HEIGHT;
    yTicks.push(bottom, top);
    yTickLabel.set(bottom, "0");
    yTickLabel.set(top, String(BAND_HEIGHT));
  }

  return (
    <div
      className="rounded-lg p-3 flex flex-col min-h-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--muted)" }}>
        Dosagem das Bombas
      </p>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 8, right: 140, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="t"
              type="number"
              domain={[grid[0], lastT]}
              ticks={grid}
              tickFormatter={fmtTime}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, domainMax]}
              ticks={yTicks}
              interval={0}
              tickFormatter={(v: number) => yTickLabel.get(v) ?? ""}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            {Array.from({ length: n - 1 }, (_, k) => (
              <ReferenceLine key={k} y={k * BAND_STRIDE + BAND_HEIGHT + BAND_GAP / 2} stroke="var(--border)" strokeDasharray="3 3" />
            ))}
            {timelines.map((tl) => (
              <Line
                key={tl.pump.id}
                type="stepAfter"
                dataKey={tl.pump.id}
                stroke={tl.pump.accentColor}
                strokeWidth={1.5}
                isAnimationActive={false}
                connectNulls
                activeDot={false}
                dot={(dotProps: DotItemDotProps) => {
                  const point = dotProps.payload as Record<string, number> | undefined;
                  const pointT = point?.t;
                  const raw = point?.[`${tl.pump.id}__raw`];
                  const { cx, cy } = dotProps;
                  const ev = pointT != null ? eventsByPumpAtGrid.get(tl.pump.id)?.get(pointT) : undefined;

                  const hoverFor = (event: PumpEvent | null) => () => {
                    if (raw != null) {
                      setHover({ pumpId: tl.pump.id, event, raw, cx: cx ?? 0, cy: cy ?? 0 });
                    }
                  };
                  const onLeave = () => setHover(null);

                  if (pointT === lastT) {
                    return (
                      <g key={`end-${tl.pump.id}`}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={tl.pump.accentColor}
                          stroke="var(--surface)"
                          strokeWidth={1.5}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={hoverFor(ev ?? null)}
                          onMouseLeave={onLeave}
                        />
                        <text x={(cx ?? 0) + 9} y={cy} dy={4} fontSize={12} fontWeight={600} fill={tl.pump.accentColor}>
                          {tl.pump.drug} · {fmtRate(tl.pump.rateMlH)} mL/h
                        </text>
                      </g>
                    );
                  }
                  if (ev) {
                    return (
                      <circle
                        key={`ev-${tl.pump.id}-${pointT}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={tl.pump.accentColor}
                        stroke="var(--surface)"
                        strokeWidth={1.5}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={hoverFor(ev)}
                        onMouseLeave={onLeave}
                      />
                    );
                  }
                  return null;
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>

        {hover && hoveredTl && (
          <div
            className="absolute pointer-events-none text-xs px-2 py-1.5 rounded flex flex-col gap-0.5 z-10"
            style={{
              left: hover.cx + 10,
              top: Math.max(0, hover.cy - 26),
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ color: "var(--muted)" }}>{fmtTime(hover.event?.t ?? simNow)}</span>
            <span className="font-semibold" style={{ color: hoveredTl.pump.accentColor }}>
              {hoveredTl.pump.drug}: {fmtRate(hover.raw)} mL/h
              {pctChange != null && (
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                  {" "}{pctChange > 0 ? "▲" : "▼"} {Math.abs(pctChange).toFixed(0)}%
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
