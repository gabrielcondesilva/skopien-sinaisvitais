"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation";
import { useAlertStore } from "@/store/alerts";

const TICK_INTERVAL_MS = 5000;

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
        return {
          id: inv.id,
          patientName: inv.patient.name,
          bedLabel: b?.label ?? inv.bedId,
          unit: inv.unit,
          currentStatus: inv.currentStatus,
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
