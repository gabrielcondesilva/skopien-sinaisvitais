"use client";

import { useSimulationStore } from "@/store/simulation";
import { computeInfusionPumps } from "@/lib/simulation/infusionPumps";
import type { Internacao, SurgicalInternacao } from "@/lib/simulation/types";

interface Props {
  internacao: Internacao | SurgicalInternacao;
}

export function InfusionPumpsPanel({ internacao }: Props) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();
  const pumps = computeInfusionPumps(internacao.id, simNow);

  return (
    <div className="flex flex-col">
      {pumps.map((pump, i) => (
        <div
          key={pump.id}
          className="flex items-center gap-3 py-2.5"
          style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
        >
          <span
            className="shrink-0 flex items-center justify-center text-[10px] font-bold rounded w-6 h-6"
            style={{ background: `${pump.accentColor}20`, color: pump.accentColor }}
          >
            {pump.id}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{pump.drug}</p>
            <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>Seringa {pump.concentration}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {pump.rateMlH.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-[10px] font-normal ml-0.5" style={{ color: "var(--muted)" }}>mL/h</span>
            </p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              {pump.dose.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {pump.doseUnit}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
