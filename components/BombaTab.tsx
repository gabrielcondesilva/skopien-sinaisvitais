"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSimulationStore } from "@/store/simulation";
import { computePumpTimelines, type PumpEvent } from "@/lib/simulation/infusionPumps";
import type { Internacao, SurgicalInternacao } from "@/lib/simulation/types";
import { PumpDoseChart } from "./PumpDoseChart";
import { InfusionPumpsGrid } from "./InfusionPumpsPanel";
import { Icon } from "./ui/Icon";

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Ajuste de altura pra caber a aba inteira numa tela só sem rolagem ────────
// Metade da altura disponível pro gráfico, metade pra linha de baixo (tabela +
// cards, lado a lado) — mesmo espírito de useVentChartHeight (VentiladorTab),
// mas com split fixo 50/50 em vez de grid de N linhas.
const CHART_CHROME = 44; // título + padding da caixa do gráfico
const TABLE_CHROME = 44; // título + padding das caixas da linha de baixo
const MIN_PANEL_HEIGHT = 160;
const BOTTOM_BUFFER = 24; // pb-6 do container que rola, já descontado

function useBombaLayout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(MIN_PANEL_HEIGHT);
  const [tableHeight, setTableHeight] = useState(MIN_PANEL_HEIGHT);

  useLayoutEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const available = window.innerHeight - top - BOTTOM_BUFFER;
      const half = (available - CHART_CHROME - TABLE_CHROME) / 2;
      setChartHeight(Math.round(Math.max(MIN_PANEL_HEIGHT, half)));
      setTableHeight(Math.round(Math.max(MIN_PANEL_HEIGHT, half)));
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return { containerRef, chartHeight, tableHeight };
}

interface DrugOption {
  name: string;
  color: string;
}

// Botão de filtro ao lado do cabeçalho "Droga" — deixa ver só os eventos de
// uma droga específica (pedido do usuário), "Todas as drogas" limpa o filtro.
function DrugFilter({ drugs, selected, onSelect }: {
  drugs: DrugOption[];
  selected: string | null;
  onSelect: (drug: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Filtrar por droga"
        title="Filtrar por droga"
        className="inline-flex items-center justify-center w-5 h-5 rounded transition-colors"
        style={{
          color: selected ? "#4DABF7" : "var(--muted)",
          background: selected ? "rgba(77,171,247,0.15)" : "transparent",
        }}
      >
        <Icon name="filter" size={12} color="currentColor" />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 6,
            width: 170,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className="w-full text-left text-xs px-2 py-1.5 rounded transition-colors normal-case"
            style={{
              background: selected === null ? "rgba(77,171,247,0.15)" : "transparent",
              color: selected === null ? "#4DABF7" : "var(--foreground)",
            }}
          >
            Todas as drogas
          </button>
          {drugs.map((d) => (
            <button
              key={d.name}
              onClick={() => { onSelect(d.name); setOpen(false); }}
              className="w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded transition-colors normal-case"
              style={{
                background: selected === d.name ? "rgba(77,171,247,0.15)" : "transparent",
                color: selected === d.name ? "#4DABF7" : "var(--foreground)",
              }}
            >
              <span className="shrink-0 inline-block rounded-full" style={{ width: 8, height: 8, background: d.color }} />
              {d.name}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

// Tabela de eventos — mesmo padrão visual dos cards do app (caixa própria,
// título + conteúdo), colunas em português (pedido do usuário). Eventos de
// todas as bombas combinados, mais recente primeiro (igual à referência).
// Sem a coluna Profissional e com paddings mais enxutos (pedido do usuário) —
// a tabela agora ocupa só metade da largura da página, ao lado dos cards de
// bomba (ver BombaTab).
function PumpEventsTable({ events, maxHeight, drugs, drugFilter, onDrugFilterChange }: {
  events: PumpEvent[];
  maxHeight: number;
  drugs: DrugOption[];
  drugFilter: string | null;
  onDrugFilterChange: (drug: string | null) => void;
}) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col min-h-0 h-full"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>Eventos das Bombas</p>
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left sticky top-0" style={{ background: "var(--surface)" }}>
              {["Horário", "Droga", "Tipo de Evento", "Dose Definida"].map((h) => (
                <th
                  key={h}
                  className="font-semibold pb-2 pr-3"
                  style={{ color: "var(--muted)", borderBottom: "2px solid var(--border)" }}
                >
                  {h === "Droga" ? (
                    <span className="inline-flex items-center gap-1">
                      {h}
                      <DrugFilter drugs={drugs} selected={drugFilter} onSelect={onDrugFilterChange} />
                    </span>
                  ) : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => (
              <tr
                key={ev.id}
                style={{
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                  borderBottom: "2px solid var(--border)",
                }}
              >
                <td className="py-2 pr-3 tabular-nums whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {fmtTime(ev.t)}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <span className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: ev.accentColor }} />
                    <span style={{ color: "var(--foreground)" }}>{ev.drug}</span>
                  </span>
                </td>
                <td className="py-2 pr-3 whitespace-nowrap" style={{ color: "var(--foreground)" }}>{ev.type}</td>
                <td className="py-2 tabular-nums whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {ev.doseSet != null ? `${ev.doseSet.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mL/h` : "–"}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center" style={{ color: "var(--muted)" }}>
                  Nenhum evento na janela exibida
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Props {
  internacao: Internacao | SurgicalInternacao;
  slotMin: number;
  windowMs: number;
}

export function BombaTab({ internacao, slotMin, windowMs }: Props) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();
  const windowStart = simNow - windowMs;

  const timelines = computePumpTimelines(internacao.id, simNow, internacao.patient.admittedAt, windowStart);
  const allEvents = timelines.flatMap((tl) => tl.events).sort((a, b) => b.t - a.t);

  const drugs = useMemo<DrugOption[]>(() => {
    const seen = new Map<string, string>();
    for (const tl of timelines) {
      if (!seen.has(tl.pump.drug)) seen.set(tl.pump.drug, tl.pump.accentColor);
    }
    return Array.from(seen, ([name, color]) => ({ name, color }));
  }, [timelines]);

  const [drugFilter, setDrugFilter] = useState<string | null>(null);
  // Reseta o filtro se a droga escolhida sumir do rol de bombas ativas — evita
  // ficar "preso" filtrando uma droga de outro paciente ao trocar de internação
  // sem desmontar a aba.
  useEffect(() => {
    if (drugFilter && !drugs.some((d) => d.name === drugFilter)) setDrugFilter(null);
  }, [drugs, drugFilter]);

  const events = drugFilter ? allEvents.filter((ev) => ev.drug === drugFilter) : allEvents;

  const { containerRef, chartHeight, tableHeight } = useBombaLayout();

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <PumpDoseChart timelines={timelines} height={chartHeight} slotMin={slotMin} />
      <div className="flex gap-2 min-h-0">
        <div className="w-1/2 min-w-0">
          <PumpEventsTable
            events={events}
            maxHeight={tableHeight}
            drugs={drugs}
            drugFilter={drugFilter}
            onDrugFilterChange={setDrugFilter}
          />
        </div>
        <div className="w-1/2 min-w-0">
          <div
            className="rounded-lg p-3 flex flex-col min-h-0 h-full"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>Bombas de Infusão</p>
            <div className="overflow-y-auto" style={{ maxHeight: tableHeight }}>
              <InfusionPumpsGrid pumps={timelines.map((tl) => tl.pump)} className="grid grid-cols-2 gap-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
