"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation";
import { useAlertStore } from "@/store/alerts";
import { currentSlotValues } from "@/lib/simulation/vitals";
import { calculateEWS } from "@/lib/ews";
import type { Alert } from "@/lib/simulation/types";

const VITAL_META = [
  { key: "fr"   as const, label: "FR",   unit: "rpm",  fmt: (v: number) => `${v} rpm`  },
  { key: "spo2" as const, label: "SpO₂", unit: "%",    fmt: (v: number) => `${v}%`     },
  { key: "pas"  as const, label: "PAS",  unit: "mmHg", fmt: (v: number) => `${v} mmHg` },
  { key: "fc"   as const, label: "FC",   unit: "bpm",  fmt: (v: number) => `${v} bpm`  },
  { key: "temp" as const, label: "TEMP", unit: "°C",   fmt: (v: number) => `${v} °C`   },
];

const TICK_INTERVAL_MS = 15_000;

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const advance          = useSimulationStore((s) => s.advance);
  const checkScenes      = useSimulationStore((s) => s.checkScenes);
  const checkVitalAlerts = useAlertStore((s) => s.checkVitalAlerts);
  const fireAlert        = useAlertStore((s) => s.fireAlert);
  const seedDemoAlerts   = useAlertStore((s) => s.seedDemoAlerts);

  // Seed one alert of each type at startup so demo always shows all alert kinds
  useEffect(() => {
    const { beds, internacoes } = useSimulationStore.getState();

    const find = (label: string) => {
      const bed = beds.find((b) => b.label === label);
      if (!bed?.internacaoId) return null;
      return internacoes[bed.internacaoId];
    };

    const uti02 = find("UTI-02");
    const enf01 = find("ENF-01");
    const ps01  = find("PS-01");

    type Item = Omit<Alert, "id" | "firedAt" | "status">;
    const items: Item[] = [];
    const criticalIds: string[] = [];

    if (uti02) {
      items.push({
        type: "sinal-vital",
        internacaoId: uti02.id,
        patientName: uti02.patient.name,
        bedLabel: "UTI-02",
        unit: "uti",
        message: "SpO₂ 88% · FR 27 rpm · PAS 84 mmHg",
      });
      criticalIds.push(uti02.id);
    }

    if (enf01) {
      items.push({
        type: "medicacao",
        internacaoId: enf01.id,
        patientName: enf01.patient.name,
        bedLabel: "ENF-01",
        unit: "enfermaria",
        message: "Furosemida 40mg — administração em atraso",
      });
    }

    if (ps01) {
      items.push({
        type: "alta",
        internacaoId: ps01.id,
        patientName: ps01.patient.name,
        bedLabel: "PS-01",
        unit: "pronto-socorro",
        message: "Alta prevista — 72% de probabilidade",
      });
    }

    seedDemoAlerts(items, criticalIds);
  }, [seedDemoAlerts]);

  useEffect(() => {
    const id = setInterval(() => {
      advance();

      // Build vitals snapshot for alert engine
      const snapshot = Object.values(
        useSimulationStore.getState().internacoes
      ).map((inv) => {
        const b = useSimulationStore.getState().beds.find((b) => b.internacaoId === inv.id);

        const vitals = currentSlotValues(inv.rawHistory, 15, Date.now());
        const ews = calculateEWS(vitals);
        const altered = VITAL_META
          .filter((m) => ews.scores[m.key] >= 2)
          .map((m) => `${m.label} ${m.fmt(vitals[m.key])}`);
        const criticalMessage = altered.length
          ? altered.join(" · ")
          : "Sinais vitais críticos — EWS elevado";

        return {
          id: inv.id,
          patientName: inv.patient.name,
          bedLabel: b?.label ?? inv.bedId,
          unit: inv.unit,
          currentStatus: inv.currentStatus,
          criticalMessage,
        };
      });
      checkVitalAlerts(snapshot);

      // Check and fire scripted scenes
      const sceneAlerts = checkScenes();
      for (const a of sceneAlerts) {
        fireAlert(a);
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [advance, checkScenes, checkVitalAlerts, fireAlert]);

  return <>{children}</>;
}
