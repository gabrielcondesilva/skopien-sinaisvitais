"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation";
import { useAlertStore } from "@/store/alerts";
import { ALARM_VITAL_KEYS } from "@/lib/vitalAlarm";
import type { Alert } from "@/lib/simulation/types";

// Tempo real: 1 tick = 1 leitura simulada, alinhado à cadência real do
// equipamento (1 leitura/min, ver CLAUDE.md § SimulationEngine).
const TICK_INTERVAL_MS = 60_000;

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const advance          = useSimulationStore((s) => s.advance);
  const checkScenes      = useSimulationStore((s) => s.checkScenes);
  const checkVitalAlerts = useAlertStore((s) => s.checkVitalAlerts);
  const checkScoreAlerts = useAlertStore((s) => s.checkScoreAlerts);
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
    const enf03 = find("ENF-03");

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

    if (enf03) {
      items.push({
        type: "escore",
        internacaoId: enf03.id,
        patientName: enf03.patient.name,
        bedLabel: "ENF-03",
        unit: "enfermaria",
        message: "Status Clínico piorou para Risco Elevado (Escore 6)",
      });
    }

    seedDemoAlerts(items);
  }, [seedDemoAlerts]);

  useEffect(() => {
    const id = setInterval(() => {
      advance();

      const internacoesAfter = Object.values(useSimulationStore.getState().internacoes);
      const bedsAfter = useSimulationStore.getState().beds;

      // Limite de Alarme reage em tempo real à leitura bruta assim que ela chega
      // (1/min) — não espera o Slot Temporal nem qualquer seletor de granularidade.
      // Ver CONTEXT.md § Limite de Alarme.
      const vitalSnapshot = internacoesAfter.map((inv) => {
        const b = bedsAfter.find((b) => b.internacaoId === inv.id);
        const latest = inv.rawHistory[inv.rawHistory.length - 1];

        return {
          id: inv.id,
          patientName: inv.patient.name,
          bedLabel: b?.label ?? inv.bedId,
          unit: inv.unit,
          vitals: Object.fromEntries(ALARM_VITAL_KEYS.map((k) => [k, latest[k]])) as Record<
            (typeof ALARM_VITAL_KEYS)[number],
            number
          >,
        };
      });
      checkVitalAlerts(vitalSnapshot);

      // Alerta de Escore reage à mudança de categoria do Status Clínico, calculado
      // sobre a Janela de Escore (mediana/30min fixo) por advance(). Ver CONTEXT.md § Alertas.
      const scoreSnapshot = internacoesAfter.map((inv) => {
        const b = bedsAfter.find((b) => b.internacaoId === inv.id);
        return {
          id: inv.id,
          patientName: inv.patient.name,
          bedLabel: b?.label ?? inv.bedId,
          unit: inv.unit,
          status: inv.currentStatus,
          ewsTotal: inv.currentEws,
        };
      });
      checkScoreAlerts(scoreSnapshot);

      // Check and fire scripted scenes
      const sceneAlerts = checkScenes();
      for (const a of sceneAlerts) {
        fireAlert(a);
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [advance, checkScenes, checkVitalAlerts, checkScoreAlerts, fireAlert]);

  return <>{children}</>;
}
