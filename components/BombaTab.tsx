"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useSimulationStore } from "@/store/simulation";
import { computePumpTimelines, type PumpEvent } from "@/lib/simulation/infusionPumps";
import type { Internacao, SurgicalInternacao } from "@/lib/simulation/types";
import { PumpDoseChart } from "./PumpDoseChart";

// Janela fixa da curva de dose — maior que a do Ventilador (VENT_WINDOW_MS,
// 40min) porque os eventos de bomba são bem mais espaçados (EVENT_INTERVAL_MS
// em lib/simulation/infusionPumps.ts, ~12min): 2h dá uma densidade de eventos
// próxima da referência trazida pelo usuário (docs/bomba-exemplo.png).
const BOMBA_WINDOW_MS = 2 * 3_600_000;

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Ajuste de altura pra caber a aba inteira numa tela só sem rolagem ────────
// Metade da altura disponível pro gráfico, metade pra tabela (pedido do
// usuário) — mesmo espírito de useVentChartHeight (VentiladorTab), mas com
// split fixo 50/50 em vez de grid de N linhas.
const CHART_CHROME = 44; // título + padding da caixa do gráfico
const TABLE_CHROME = 44; // título + padding da caixa da tabela
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

// Tabela de eventos — mesmo padrão visual dos cards do app (caixa própria,
// título + conteúdo), colunas em português (pedido do usuário). Eventos de
// todas as bombas combinados, mais recente primeiro (igual à referência).
function PumpEventsTable({ events, maxHeight }: { events: PumpEvent[]; maxHeight: number }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col min-h-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>Eventos das Bombas</p>
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left sticky top-0" style={{ background: "var(--surface)" }}>
              {["Horário", "Droga", "Tipo de Evento", "Dose Definida", "Profissional"].map((h) => (
                <th
                  key={h}
                  className="font-semibold pb-2.5 pr-4"
                  style={{ color: "var(--muted)", borderBottom: "2px solid var(--border)" }}
                >
                  {h}
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
                <td className="py-3 pr-4 tabular-nums whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {fmtTime(ev.t)}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <span className="inline-block rounded-full shrink-0" style={{ width: 9, height: 9, background: ev.accentColor }} />
                    <span style={{ color: "var(--foreground)" }}>{ev.drug}</span>
                  </span>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap" style={{ color: "var(--foreground)" }}>{ev.type}</td>
                <td className="py-3 pr-4 tabular-nums whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {ev.doseSet != null ? `${ev.doseSet.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mL/h` : "–"}
                </td>
                <td className="py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>{ev.clinician}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center" style={{ color: "var(--muted)" }}>
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
}

export function BombaTab({ internacao }: Props) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();
  const windowStart = simNow - BOMBA_WINDOW_MS;

  const timelines = computePumpTimelines(internacao.id, simNow, internacao.patient.admittedAt, windowStart);
  const events = timelines.flatMap((tl) => tl.events).sort((a, b) => b.t - a.t);

  const { containerRef, chartHeight, tableHeight } = useBombaLayout();

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <PumpDoseChart timelines={timelines} height={chartHeight} />
      <PumpEventsTable events={events} maxHeight={tableHeight} />
    </div>
  );
}
