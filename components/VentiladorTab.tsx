"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useSimulationStore } from "@/store/simulation";
import { computeScoreHistory } from "@/lib/simulation/vitals";
import { buildVentSlots, computeVentParams, type VentParams, type VentParamKey } from "@/lib/simulation/ventilator";
import type { Internacao, SurgicalInternacao } from "@/lib/simulation/types";
import { EWSScoreChart } from "./EWSScoreChart";
import { VentTrendChart, type VentTrendSeries } from "./VentTrendChart";
import { VentParamPairCard } from "./VentParamPairCard";

// Cores por parâmetro — convenção de fabricante de ventilador trazida pelo
// usuário (mesma família de cor por grandeza: pressão em amarelo, volume em
// verde, etc.). Fonte única: alimenta tanto o valor/título de cada card
// (GROUPS, abaixo) quanto a curva correspondente nos painéis combinados
// (Pressões/Volumes/Oxigenação), pra manter as duas telas na mesma cor por
// parâmetro. PIP e PEEP (e VTe/VM exp) compartilham a mesma cor de propósito
// — "mesma família" pedida pelo usuário; a legenda embutida do VentTrendChart
// (mesmo array `series` abaixo alimenta curva + legenda) segue distinguindo
// as duas pelo texto. SpO₂ não tem cor definida pelo usuário — mantém a cor
// cian já usada no Monitor (VitalsChart.tsx), pra consistência entre telas.
const COLOR_PIP   = "#FFD400";
const COLOR_PEEP  = "#FFD400";
const COLOR_VTE   = "#00E676";
const COLOR_VTI   = "#00C853";
const COLOR_CDIN  = "#00E5FF";
const COLOR_R     = "#40C4FF";
const COLOR_VMEXP = "#00E676";
const COLOR_FUGA  = "#FF6D00";
const COLOR_FR    = "#FFD400";
const COLOR_FIO2  = "#448AFF";
const COLOR_IE    = "#FFFFFF";
const COLOR_ETCO2 = "#FF6D00";
const COLOR_SPO2  = "#22d3ee";

const PRESSURE_SERIES: VentTrendSeries[] = [
  { key: "pip",   label: "PIP", unit: "cmH2O", color: COLOR_PIP },
  { key: "peep",  label: "PEEP", unit: "cmH2O", color: COLOR_PEEP },
];
const VOLUME_SERIES: VentTrendSeries[] = [
  { key: "vte",   label: "VTe",    unit: "mL",    color: COLOR_VTE },
  { key: "vti",   label: "VTi",    unit: "mL",    color: COLOR_VTI },
  { key: "vmExp", label: "VM exp", unit: "L/min", color: COLOR_VMEXP, axis: "right" },
];
const OXYGEN_SERIES: VentTrendSeries[] = [
  { key: "fio2", label: "FiO₂", unit: "%", color: COLOR_FIO2 },
  { key: "spo2", label: "SpO₂", unit: "%", color: COLOR_SPO2 },
];

// Gráfico de EWS "replicado" — mesma fonte de dados do Monitor (Janela de Escore
// fixa, 30min/mediana, mínimo 3h — cresce com a Janela escolhida, nunca reduz
// abaixo disso). Ver CONTEXT.md § Janela de Escore.
const EWS_CHART_MIN_WINDOW_MS = 3 * 3_600_000;

interface ParamCardCfg {
  key: VentParamKey | "ie";
  label: string;
  unit: string;
  // Cor fixa do valor (pedido do usuário, convenção de fabricante de
  // ventilador) — substitui a cor por severidade (ventSeverity) nesse valor,
  // já que as faixas de Atenção/Crítico da Ventilação ainda não foram
  // clinicamente validadas pelo usuário.
  color: string;
}

interface ParamGroup {
  label: string;
  items: ParamCardCfg[];
  // Cor do título do card (pedido do usuário) — só Pressão/Volume têm cor por
  // enquanto, os demais grupos ficam no cinza padrão (undefined).
  titleColor?: string;
}

// 6 grupos clínicos, 2 parâmetros cada — mesma ordem pedida pelo usuário. Cor
// de cada valor segue a convenção clínica trazida pelo usuário (mesma família
// de cor por grandeza — pressão em amarelo, volume em verde, etc.). Título do
// card sem cor própria (titleColor) — mesmo cinza padrão dos demais grupos.
const GROUPS: ParamGroup[] = [
  {
    label: "Pressão",
    items: [
      { key: "pip",  label: "PIP",  unit: "cmH2O", color: COLOR_PIP },
      { key: "peep", label: "PEEP", unit: "cmH2O", color: COLOR_PEEP },
    ],
  },
  {
    label: "Volume",
    items: [
      { key: "vte", label: "VTe", unit: "mL", color: COLOR_VTE },
      { key: "vti", label: "VTi", unit: "mL", color: COLOR_VTI },
    ],
  },
  {
    label: "Mecânica Pulmonar",
    items: [
      { key: "cdin", label: "Cdin", unit: "mL/cmH2O",  color: COLOR_CDIN },
      { key: "r",    label: "R",    unit: "cmH2O/L/s", color: COLOR_R },
    ],
  },
  {
    label: "Ventilação",
    items: [
      { key: "vmExp", label: "VM exp",  unit: "L/min", color: COLOR_VMEXP },
      { key: "fuga",  label: "% Fuga",  unit: "%",      color: COLOR_FUGA },
    ],
  },
  {
    label: "Respiração",
    items: [
      { key: "fr",   label: "FR",   unit: "rpm", color: COLOR_FR },
      { key: "fio2", label: "FiO₂", unit: "%",   color: COLOR_FIO2 },
    ],
  },
  {
    label: "Tempo/Gases",
    items: [
      { key: "ie",    label: "I:E",   unit: "",     color: COLOR_IE },
      { key: "etco2", label: "EtCO₂", unit: "mmHg", color: COLOR_ETCO2 },
    ],
  },
];

function paramValue(params: VentParams, key: ParamCardCfg["key"]): number | string {
  return params[key as keyof VentParams];
}

// Cards agora ficam ACIMA do grid de gráficos (pedido do usuário, pra caber a
// aba inteira numa tela só sem rolagem) — o grid preenche o que sobrar de
// altura vertical depois deles. Como nada mais fica abaixo do grid, só
// precisamos do topo dele (já empurrado pra baixo pelos cards no fluxo normal
// do documento), sem precisar medir a altura de nada à parte. Só a Matriz (2x2)
// se ajusta à tela sem rolar — a Linha (4 painéis empilhados) usa altura fixa
// e deixa o container rolar, mesmo padrão do Monitor (ver comentário em
// app/patients/[id]/page.tsx § Linha/Matriz).
const VENT_GRID_ROW_GAP = 8; // gap-2 — mesmo espaçamento entre os gráficos
// Padding + título + legenda embutida de cada gráfico, fora do canvas em si —
// os 3 painéis combinados (Pressões/Volumes/Oxigenação) agora têm uma linha de
// legenda a mais entre o título e o canvas (ver VentTrendChart).
const VENT_CARD_CHROME = 92;
const VENT_CHART_MIN_HEIGHT = 197;
const VENT_CHART_MAX_HEIGHT = 217;
// O container que rola (app/patients/[id]/page.tsx) tem pb-6 (24px) — descontado
// aqui + uma pequena folga de segurança.
const VENT_BOTTOM_BUFFER = 32;

function useVentChartHeight(layout: "matriz" | "linha") {
  const gridRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(VENT_CHART_MIN_HEIGHT);

  useLayoutEffect(() => {
    if (layout !== "matriz") {
      setChartHeight(VENT_CHART_MAX_HEIGHT);
      return;
    }

    function measure() {
      const gridEl = gridRef.current;
      if (!gridEl) return;
      const rows = 2; // grid 2x2 da Matriz
      const top = gridEl.getBoundingClientRect().top;
      const available = window.innerHeight - top - VENT_BOTTOM_BUFFER;
      const perRow = (available - VENT_GRID_ROW_GAP * (rows - 1)) / rows;
      const next = Math.min(
        VENT_CHART_MAX_HEIGHT,
        Math.max(VENT_CHART_MIN_HEIGHT, Math.round(perRow - VENT_CARD_CHROME))
      );
      setChartHeight(next);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [layout]);

  return { gridRef, chartHeight };
}

interface Props {
  internacao: Internacao | SurgicalInternacao;
}

// Grid dos 6 cards de parâmetros, isolado do resto da aba (gráficos, medição de
// altura) pra poder ser reaproveitado na página de Monitor — Antonio pode trazer
// esses cards pra lá via olhinho, sem duplicar GROUPS/paramValue. `className`
// permite um grid mais compacto quando o card fica lado a lado com o painel de
// Bomba (ver SectionPanel em app/patients/[id]/page.tsx).
export function VentParamCardsRow({ internacao, className }: Props & { className?: string }) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();
  const current = computeVentParams(internacao.id, simNow);

  return (
    <div className={className ?? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"}>
      {GROUPS.map((g) => {
        const [leftItem, rightItem] = g.items;
        const toValue = (item: ParamCardCfg) => {
          const value = paramValue(current, item.key);
          return { label: item.label, unit: item.unit, value, color: item.color };
        };
        return (
          <VentParamPairCard
            key={g.label}
            groupLabel={g.label}
            titleColor={g.titleColor}
            left={toValue(leftItem)}
            right={toValue(rightItem)}
          />
        );
      })}
    </div>
  );
}

interface VentiladorTabProps extends Props {
  slotMin: number;
  windowMs: number;
  layout: "matriz" | "linha";
}

export function VentiladorTab({ internacao, slotMin, windowMs, layout }: VentiladorTabProps) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  // Timeline simulada, não Date.now() — mesmo motivo do resto do app (ver
  // store/simulation.ts § advance).
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();

  // Mesmo Slot Temporal do Monitor (última leitura válida do bucket) — ver
  // buildVentSlots. SpO₂ já vem embutido no ponto (vem dos Sinais Vitais, não
  // do ventilador), sem precisar zipar por índice.
  const ventSeries = buildVentSlots(internacao.id, rawHistory, slotMin, windowMs, simNow);
  const oxygenData = ventSeries.map((v) => ({ t: v.t, fio2: v.fio2, spo2: v.spo2 }));

  // Janela de Escore só cresce a partir do mínimo de 3h, nunca reduz abaixo
  // disso, mesmo com uma Janela menor escolhida pro resto dos gráficos — mesma
  // regra do Monitor (CONTEXT.md § Janela de Escore).
  const ewsWindowMs = Math.max(windowMs, EWS_CHART_MIN_WINDOW_MS);
  const ewsSlots = computeScoreHistory(rawHistory, ewsWindowMs, simNow);
  const syncId = `vent-${internacao.id}`;

  const { gridRef, chartHeight } = useVentChartHeight(layout);
  const isMatriz = layout === "matriz";

  return (
    <div className="flex flex-col gap-2">
      {/* Cards de parâmetros — cada grupo clínico unido num único card, os dois
          valores separados por uma linha vertical (ver VentParamPairCard).
          Ficam no topo (pedido do usuário), acima dos gráficos. */}
      <VentParamCardsRow internacao={internacao} />

      {/* 4 painéis: EWS replicado + Pressões/Volumes/Oxigenação combinados
          (várias curvas por painel, cada um com sua própria legenda embutida
          logo abaixo do título — ver docs/ventilador-exemplo.png). Matriz: grid
          2x2 ajustado à tela. Linha: os 4 empilhados, largura total, container
          rola (mesmo padrão do Monitor). */}
      <div ref={gridRef} className={isMatriz ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
        <EWSScoreChart slots={ewsSlots} forecast={internacao.ewsForecast} syncId={syncId} chartHeight={chartHeight} />
        <VentTrendChart
          title="Pressões"
          data={ventSeries}
          series={PRESSURE_SERIES}
          leftDomain={[0, 40]}
          syncId={syncId}
          chartHeight={chartHeight}
        />
        <VentTrendChart
          title="Volumes / Ventilação"
          data={ventSeries}
          series={VOLUME_SERIES}
          leftDomain={[0, 650]}
          rightDomain={[0, 20]}
          syncId={syncId}
          chartHeight={chartHeight}
        />
        <VentTrendChart
          title="Oxigenação"
          data={oxygenData}
          series={OXYGEN_SERIES}
          leftDomain={[0, 100]}
          syncId={syncId}
          chartHeight={chartHeight}
        />
      </div>
    </div>
  );
}
