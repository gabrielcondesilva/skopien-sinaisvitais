"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation";
import { useAlertStore } from "@/store/alerts";
import { currentSlotValues } from "@/lib/simulation/vitals";
import { calculateEWS } from "@/lib/ews";

const VITAL_META = [
  { key: "fr"   as const, label: "FR",   unit: "rpm",  fmt: (v: number) => `${v} rpm`  },
  { key: "spo2" as const, label: "SpO₂", unit: "%",    fmt: (v: number) => `${v}%`     },
  { key: "pas"  as const, label: "PAS",  unit: "mmHg", fmt: (v: number) => `${v} mmHg` },
  { key: "fc"   as const, label: "FC",   unit: "bpm",  fmt: (v: number) => `${v} bpm`  },
  { key: "temp" as const, label: "TEMP", unit: "°C",   fmt: (v: number) => `${v} °C`   },
];

const TICK_INTERVAL_MS = 15_000;

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const advance        = useSimulationStore((s) => s.advance);
  const checkScenes    = useSimulationStore((s) => s.checkScenes);
  const checkVitalAlerts = useAlertStore((s) => s.checkVitalAlerts);
  const fireAlert      = useAlertStore((s) => s.fireAlert);

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
