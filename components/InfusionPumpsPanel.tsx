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

// Mesmo padrão visual dos cards de Monitor/Ventilador (VitalCard/VentParamPairCard):
// caixa própria por bomba, valor principal em destaque, secundários em cinza.
function InfusionPumpCard({ pump }: { pump: InfusionPump }) {
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
        <span className="text-[11px] whitespace-nowrap shrink-0" style={{ color: "var(--muted)" }}>
          Início {formatPumpStart(pump.startedAt)}
        </span>
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
    </div>
  );
}

export function InfusionPumpsPanel({ internacao }: Props) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();
  const pumps = computeInfusionPumps(internacao.id, simNow, internacao.patient.admittedAt);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {pumps.map((pump) => (
        <InfusionPumpCard key={pump.id} pump={pump} />
      ))}
    </div>
  );
}
