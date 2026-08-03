"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useSimulationStore } from "@/store/simulation";
import { computeScoreHistory } from "@/lib/simulation/vitals";
import { buildVentSeries, computeVentParams, ventSeverity, type VentParams, type VentParamKey } from "@/lib/simulation/ventilator";
import type { Internacao, SurgicalInternacao } from "@/lib/simulation/types";
import { EWSScoreChart } from "./EWSScoreChart";
import { VentTrendChart, type VentTrendSeries } from "./VentTrendChart";
import { VentParamPairCard } from "./VentParamPairCard";

// Cores das curvas dos painéis combinados (Pressões/Volumes/Oxigenação) — mesma
// convenção de cor da referência (docs/ventilador-exemplo.png): Pico vermelho,
// Plat laranja, PEEP azul. SpO₂ reaproveita a mesma cor cian usada no Monitor
// (VitalsChart.tsx), pra manter consistência entre as duas telas. A legenda de
// cada gráfico fica embutida no próprio VentTrendChart (mesmo array `series`
// abaixo alimenta as curvas e a legenda) — sem legenda compartilhada à parte.
const COLOR_PIP   = "#ef4444";
const COLOR_PPLAT = "#f59e0b";
const COLOR_PEEP  = "#3b82f6";
const COLOR_VTE   = "#3b82f6";
const COLOR_VTI   = "#a78bfa";
const COLOR_VMEXP = "#22c55e";
const COLOR_FIO2  = "#f97316";
const COLOR_SPO2  = "#22d3ee";

const PRESSURE_SERIES: VentTrendSeries[] = [
  { key: "pip",   label: "Pico", unit: "cmH2O", color: COLOR_PIP },
  { key: "pplat", label: "Plat", unit: "cmH2O", color: COLOR_PPLAT },
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

// Janela fixa das 3 curvas novas — não segue o Slot/Janela do Monitor (ControlsBar
// fica oculta fora da página Monitor, mesmo padrão do EWSTab). 40min de leituras
// brutas (1/min) dá ~6-7 macro-ciclos visíveis com o CYCLE_MS de ventilator.ts.
const VENT_WINDOW_MS = 40 * 60_000;

// Gráfico de EWS "replicado" — mesma fonte de dados do Monitor (Janela de Escore
// fixa, 30min/mediana, mínimo 3h). Ver CONTEXT.md § Janela de Escore.
const EWS_CHART_MIN_WINDOW_MS = 3 * 3_600_000;

interface ParamCardCfg {
  key: VentParamKey | "ie";
  label: string;
  unit: string;
}

interface ParamGroup {
  label: string;
  items: ParamCardCfg[];
}

// 6 grupos clínicos, 2 parâmetros cada — mesma ordem pedida pelo usuário.
const GROUPS: ParamGroup[] = [
  { label: "Pressão",           items: [{ key: "pip",   label: "PIP",   unit: "cmH2O" },      { key: "peep",  label: "PEEP",  unit: "cmH2O" }] },
  { label: "Volume",            items: [{ key: "vte",   label: "VTe",   unit: "mL" },          { key: "vti",   label: "VTi",   unit: "mL" }] },
  { label: "Mecânica Pulmonar", items: [{ key: "cdin",  label: "Cdin",  unit: "mL/cmH2O" },    { key: "r",     label: "R",     unit: "cmH2O/L/s" }] },
  { label: "Ventilação",        items: [{ key: "vmExp", label: "VM exp", unit: "L/min" },      { key: "fuga",  label: "% Fuga", unit: "%" }] },
  { label: "Respiração",        items: [{ key: "fr",    label: "FR",    unit: "rpm" },         { key: "fio2",  label: "FiO₂",  unit: "%" }] },
  { label: "Tempo/Gases",       items: [{ key: "ie",    label: "I:E",   unit: "" },            { key: "etco2", label: "EtCO₂", unit: "mmHg" }] },
];

function paramValue(params: VentParams, key: ParamCardCfg["key"]): number | string {
  return params[key as keyof VentParams];
}

// Cards agora ficam ACIMA do grid de gráficos (pedido do usuário, pra caber a
// aba inteira numa tela só sem rolagem) — o grid preenche o que sobrar de
// altura vertical depois deles. Como nada mais fica abaixo do grid, só
// precisamos do topo dele (já empurrado pra baixo pelos cards no fluxo normal
// do documento), sem precisar medir a altura de nada à parte.
const VENT_GRID_ROWS = 2;
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

function useVentChartHeight() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(VENT_CHART_MIN_HEIGHT);

  useLayoutEffect(() => {
    function measure() {
      const gridEl = gridRef.current;
      if (!gridEl) return;
      const top = gridEl.getBoundingClientRect().top;
      const available = window.innerHeight - top - VENT_BOTTOM_BUFFER;
      const perRow = (available - VENT_GRID_ROW_GAP * (VENT_GRID_ROWS - 1)) / VENT_GRID_ROWS;
      const next = Math.min(
        VENT_CHART_MAX_HEIGHT,
        Math.max(VENT_CHART_MIN_HEIGHT, Math.round(perRow - VENT_CARD_CHROME))
      );
      setChartHeight(next);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

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
          const score = item.key === "ie" ? 0 : ventSeverity(item.key as VentParamKey, value as number);
          return { label: item.label, unit: item.unit, value, score };
        };
        return (
          <VentParamPairCard
            key={g.label}
            groupLabel={g.label}
            left={toValue(leftItem)}
            right={toValue(rightItem)}
          />
        );
      })}
    </div>
  );
}

export function VentiladorTab({ internacao }: Props) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  // Timeline simulada, não Date.now() — mesmo motivo do resto do app (ver
  // store/simulation.ts § advance).
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();

  const windowedReadings = rawHistory.filter((r) => r.t >= simNow - VENT_WINDOW_MS);
  const ventSeries = buildVentSeries(internacao.id, windowedReadings);
  // SpO₂ vem dos sinais vitais (rawHistory), não do ventilador — zipa pelo mesmo
  // índice porque ventSeries é gerado 1:1 a partir de windowedReadings.
  const oxygenData = ventSeries.map((v, i) => ({ t: v.t, fio2: v.fio2, spo2: windowedReadings[i]?.spo2 }));

  const ewsSlots = computeScoreHistory(rawHistory, EWS_CHART_MIN_WINDOW_MS, simNow);
  const syncId = `vent-${internacao.id}`;

  const { gridRef, chartHeight } = useVentChartHeight();

  return (
    <div className="flex flex-col gap-2">
      {/* Cards de parâmetros — cada grupo clínico unido num único card, os dois
          valores separados por uma linha vertical (ver VentParamPairCard).
          Ficam no topo (pedido do usuário), acima dos gráficos. */}
      <VentParamCardsRow internacao={internacao} />

      {/* 4 painéis: EWS replicado + Pressões/Volumes/Oxigenação combinados
          (várias curvas por painel, cada um com sua própria legenda embutida
          logo abaixo do título — ver docs/ventilador-exemplo.png), grid 2x2 */}
      <div ref={gridRef} className="grid grid-cols-2 gap-2">
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
