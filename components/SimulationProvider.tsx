"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation";
import { useAlertStore } from "@/store/alerts";
import { currentSlotValues, CARD_SLOT_MINUTES } from "@/lib/simulation/vitals";
import { ALARM_VITAL_KEYS } from "@/lib/vitalAlarm";
import type { Alert } from "@/lib/simulation/types";

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
    const enf02 = find("ENF-02");

    type Item = Omit<Alert, "id" | "firedAt" | "status">;
    const items: Item[] = [];

    if (uti02) {
      // Cada parâmetro fora do Limite de Alarme é um alerta independente (CONTEXT.md § Alertas)
      items.push({
        type: "sinal-vital",
        internacaoId: uti02.id,
        patientName: uti02.patient.name,
        bedLabel: "UTI-02",
        unit: "uti",
        message: "FR 32 rpm — fora do Limite de Alarme",
        parametro: "fr",
        valor: 32,
      });
      items.push({
        type: "sinal-vital",
        internacaoId: uti02.id,
        patientName: uti02.patient.name,
        bedLabel: "UTI-02",
        unit: "uti",
        message: "PAS 84 mmHg — fora do Limite de Alarme",
        parametro: "pas",
        valor: 84,
      });
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

    if (enf02) {
      items.push({
        type: "alta",
        internacaoId: enf02.id,
        patientName: enf02.patient.name,
        bedLabel: "ENF-02",
        unit: "enfermaria",
        message: "Alta prevista — 72% de probabilidade",
      });
    }

    seedDemoAlerts(items);
  }, [seedDemoAlerts]);

  useEffect(() => {
    const id = setInterval(() => {
      advance();

      // Build vitals snapshot for alert engine — sempre o Slot Temporal fixo do
      // sistema (CARD_SLOT_MINUTES), nunca a granularidade que uma tela escolheu exibir.
      const snapshot = Object.values(
        useSimulationStore.getState().internacoes
      ).map((inv) => {
        const b = useSimulationStore.getState().beds.find((b) => b.internacaoId === inv.id);
        const vitals = currentSlotValues(inv.rawHistory, CARD_SLOT_MINUTES, Date.now());

        return {
          id: inv.id,
          patientName: inv.patient.name,
          bedLabel: b?.label ?? inv.bedId,
          unit: inv.unit,
          vitals: Object.fromEntries(ALARM_VITAL_KEYS.map((k) => [k, vitals[k]])) as Record<
            (typeof ALARM_VITAL_KEYS)[number],
            number
          >,
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
