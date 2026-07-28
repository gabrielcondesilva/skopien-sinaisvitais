"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useSimulationStore } from "@/store/simulation";
import { computeScoreHistory } from "@/lib/simulation/vitals";
import { buildVentSeries, computeVentParams, ventSeverity, type VentParams, type VentParamKey } from "@/lib/simulation/ventilator";
import type { Internacao, SurgicalInternacao } from "@/lib/simulation/types";
import { EWSScoreChart } from "./EWSScoreChart";
import { VentilatorChart, VENT_CHARTS_CFG } from "./VentilatorChart";
import { VentParamPairCard } from "./VentParamPairCard";

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

// Em vez de altura fixa (sobrava espaço em branco embaixo dos cards), os 4
// gráficos (grid 2x2) preenchem a altura vertical realmente disponível — mede o
// topo do grid e a altura já renderizada do grid de cards (que vem depois) pra
// descontar do que sobra na tela. Mesmo espírito de useEnfermariaChartHeight em
// app/patients/[id]/page.tsx, adaptado pro layout desta aba (2 linhas, cards
// abaixo em vez de acima).
const VENT_GRID_ROWS = 2;
const VENT_GRID_ROW_GAP = 8; // gap-2 — mesmo espaçamento entre os gráficos e entre o grid e os cards
const VENT_SECTION_GAP = 8; // gap-2 entre o grid de gráficos e o grid de cards
const VENT_CARD_CHROME = 70; // padding + linha de título de cada gráfico, fora do canvas em si
// As últimas reduções (até 88-96) foram feitas "às cegas" — o Fast Refresh não
// tava aplicando o valor novo (ver nota acima), então cada ajuste empilhava em
// cima do anterior sem refletir na tela de verdade. Voltando pra um tamanho
// confortável agora que o refresh já mostra o valor real.
const VENT_CHART_MIN_HEIGHT = 197;
const VENT_CHART_MAX_HEIGHT = 217;
// O container que rola (app/patients/[id]/page.tsx) tem pb-6 (24px) — descontado
// aqui + uma pequena folga de segurança.
const VENT_BOTTOM_BUFFER = 32;

function useVentChartHeight() {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(VENT_CHART_MIN_HEIGHT);

  useLayoutEffect(() => {
    function measure() {
      const gridEl = gridRef.current;
      if (!gridEl) return;
      const top = gridEl.getBoundingClientRect().top;
      const cardsHeight = cardsRef.current?.getBoundingClientRect().height ?? 0;
      const available = window.innerHeight - top - cardsHeight - VENT_SECTION_GAP - VENT_BOTTOM_BUFFER;
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

  return { gridRef, cardsRef, chartHeight };
}

interface Props {
  internacao: Internacao | SurgicalInternacao;
}

export function VentiladorTab({ internacao }: Props) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  // Timeline simulada, não Date.now() — mesmo motivo do resto do app (ver
  // store/simulation.ts § advance).
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();

  const windowedReadings = rawHistory.filter((r) => r.t >= simNow - VENT_WINDOW_MS);
  const ventSeries = buildVentSeries(internacao.id, windowedReadings);
  const current = ventSeries[ventSeries.length - 1] ?? {
    ...computeVentParams(internacao.id, simNow),
    t: simNow, paw: 0, flow: 0, volume: 0,
  };

  const ewsSlots = computeScoreHistory(rawHistory, EWS_CHART_MIN_WINDOW_MS, simNow);
  const syncId = `vent-${internacao.id}`;

  const { gridRef, cardsRef, chartHeight } = useVentChartHeight();

  return (
    <div className="flex flex-col gap-2">
      {/* 4 gráficos: EWS replicado + Pressão/Fluxo/Volume, grid 2x2 */}
      <div ref={gridRef} className="grid grid-cols-2 gap-2">
        <EWSScoreChart slots={ewsSlots} forecast={internacao.ewsForecast} syncId={syncId} chartHeight={chartHeight} />
        {VENT_CHARTS_CFG.map((cfg) => (
          <VentilatorChart key={cfg.key} cfg={cfg} data={ventSeries} syncId={syncId} chartHeight={chartHeight} />
        ))}
      </div>

      {/* Cards de parâmetros — cada grupo clínico unido num único card, os dois
          valores separados por uma linha vertical (ver VentParamPairCard) */}
      <div ref={cardsRef} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
    </div>
  );
}
