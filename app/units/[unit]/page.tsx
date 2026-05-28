"use client";

import { use } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";
import { BedCard } from "@/components/BedCard";
import { SurgicalRoomCard } from "@/components/SurgicalRoomCard";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";

const UNIT_LABELS: Record<string, string> = {
  "pronto-socorro":   "Pronto Socorro",
  "enfermaria":       "Enfermaria",
  "uti":              "UTI",
  "centro-cirurgico": "Centro Cirúrgico",
};

function UnitStats({ unit }: { unit: string }) {
  const beds = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === unit)));
  const ativos      = beds.filter((b) => b.internacaoId !== null).length;
  const disponiveis = beds.filter((b) => b.internacaoId === null && !b.inoperante).length;
  const inoperantes = beds.filter((b) => b.inoperante).length;

  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      <Chip value={ativos}      label="Ativos"      dot="var(--status-attention)" />
      <Chip value={disponiveis} label="Disponíveis" dot="var(--status-stable)"    />
      <Chip value={inoperantes} label="Inoperantes" dot="var(--muted)"            />
    </div>
  );
}

function Chip({ value, label, dot }: { value: number; label: string; dot: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
      <span className="tabular-nums font-semibold">{value}</span>
      <span style={{ color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

function UnitGrid({ unit }: { unit: string }) {
  const beds = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === unit)));
  const internacoes = useSimulationStore(useShallow((s) => s.internacoes));

  if (unit === "centro-cirurgico") {
    return (
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
      >
        {beds.map((bed) => (
          <SurgicalRoomCard
            key={bed.id}
            bed={bed}
            internacao={bed.internacaoId ? (internacoes[bed.internacaoId] ?? null) : null}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
    >
      {beds.map((bed) => (
        <BedCard
          key={bed.id}
          bed={bed}
          internacao={bed.internacaoId ? (internacoes[bed.internacaoId] ?? null) : null}
        />
      ))}
    </div>
  );
}

export default function UnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit } = use(params);
  const label = UNIT_LABELS[unit] ?? unit;

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main
          className="flex-1 ml-56 overflow-y-auto min-h-screen p-6"
          style={{ background: "var(--background)" }}
        >
          <h1 className="text-lg font-semibold mb-4">{label}</h1>
          <UnitStats unit={unit} />
          <UnitGrid unit={unit} />
        </main>
      </div>
    </AuthGuard>
  );
}
