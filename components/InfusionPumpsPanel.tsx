"use client";

import { useSimulationStore } from "@/store/simulation";
import { computeInfusionPumps, type InfusionPump } from "@/lib/simulation/infusionPumps";
import type { Internacao, SurgicalInternacao } from "@/lib/simulation/types";

interface Props {
  internacao: Internacao | SurgicalInternacao;
}

function formatPumpStart(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// "Fim" reaproveita o mesmo formato de "Início" — só o rótulo muda.
const formatPumpEnd = formatPumpStart;

// Tempo restante até a próxima "Troca de Bolsa" prevista, em "Xh Ymin".
function formatRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min}min`;
  return `${h}h ${min.toString().padStart(2, "0")}min`;
}

// Mesmo padrão visual dos cards de Monitor/Ventilador (VitalCard/VentParamPairCard):
// caixa própria por bomba, valor principal em destaque, secundários em cinza.
function InfusionPumpCard({ pump, now }: { pump: InfusionPump; now: number }) {
  return (
    <div
      className="rounded-lg p-2.5 flex flex-col gap-1.5 flex-1 min-w-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 flex items-center justify-center text-[10px] font-bold rounded w-6 h-6"
            style={{ background: `${pump.accentColor}20`, color: pump.accentColor }}
          >
            {pump.id}
          </span>
          <span className="text-sm font-bold truncate" style={{ color: "var(--foreground)" }}>{pump.drug}</span>
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: "var(--foreground)" }}>
          {pump.rateMlH.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <span className="text-sm" style={{ color: "var(--muted)" }}>mL/h</span>
      </div>

      <span className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
        {pump.dose.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {pump.doseUnit} · {pump.concentration}
      </span>

      <div className="flex flex-col gap-0.5 pt-0.5" style={{ borderTop: "1px solid var(--border)" }}>
        <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--muted)" }}>
          Início {formatPumpStart(pump.startedAt)} · Fim previsto {formatPumpEnd(pump.endsAt)}
        </span>
        <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: pump.accentColor }}>
          {formatRemaining(pump.endsAt - now)} restantes
        </span>
      </div>
    </div>
  );
}

// Grid tem 6 colunas (xl:grid-cols-6) mas cada internação só usa 3-4 bombas
// (computeInfusionPumps) — sem preenchimento a última linha ficava com um
// vão em branco de 2-3 colunas. Completa até 6 slots com cards "Bomba Livre",
// mesmo padrão visual de estação de bombas real (slots sem droga carregada).
const TOTAL_PUMP_SLOTS = 6;

function EmptyPumpCard({ slot }: { slot: number }) {
  return (
    <div
      className="rounded-lg p-2.5 flex flex-col items-center justify-center gap-1 flex-1 min-w-0 min-h-[86px]"
      style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}
    >
      <span
        className="shrink-0 flex items-center justify-center text-[10px] font-bold rounded w-6 h-6"
        style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}
      >
        B{slot}
      </span>
      <span className="text-[11px]" style={{ color: "var(--muted)" }}>Bomba Livre</span>
    </div>
  );
}

// Grid de cards isolado do resto do painel (cálculo das bombas, medição de
// altura) pra poder ser reaproveitado onde já tivermos os `pumps` computados
// (ex.: aba Bomba, que já os deriva de `computePumpTimelines`) sem duplicar a
// chamada a computeInfusionPumps. `className` permite um grid mais compacto
// quando o card fica lado a lado com a tabela de eventos (ver BombaTab).
export function InfusionPumpsGrid({ pumps, now, className }: { pumps: InfusionPump[]; now: number; className?: string }) {
  const emptySlots = Math.max(0, TOTAL_PUMP_SLOTS - pumps.length);

  return (
    <div className={className ?? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"}>
      {pumps.map((pump) => (
        <InfusionPumpCard key={pump.id} pump={pump} now={now} />
      ))}
      {Array.from({ length: emptySlots }, (_, i) => (
        <EmptyPumpCard key={`empty-${i}`} slot={pumps.length + i + 1} />
      ))}
    </div>
  );
}

export function InfusionPumpsPanel({ internacao }: Props) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();
  const pumps = computeInfusionPumps(internacao.id, simNow, internacao.patient.admittedAt);

  return <InfusionPumpsGrid pumps={pumps} now={simNow} />;
}
