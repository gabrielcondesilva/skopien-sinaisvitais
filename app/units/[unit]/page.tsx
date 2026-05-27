"use client";

import { use } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";
import { BedCard } from "@/components/BedCard";
import { SurgicalRoomCard } from "@/components/SurgicalRoomCard";
import { useSimulationStore } from "@/store/simulation";

const UNIT_LABELS: Record<string, string> = {
  "pronto-socorro":   "Pronto Socorro",
  "enfermaria":       "Enfermaria",
  "uti":              "UTI",
  "centro-cirurgico": "Centro Cirúrgico",
};

function UnitGrid({ unit }: { unit: string }) {
  const beds = useSimulationStore((s) => s.beds.filter((b) => b.unit === unit));
  const internacoes = useSimulationStore((s) => s.internacoes);

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
          <h1 className="text-lg font-semibold mb-6">{label}</h1>
          <UnitGrid unit={unit} />
        </main>
      </div>
    </AuthGuard>
  );
}
