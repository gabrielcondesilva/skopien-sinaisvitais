"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation";
import { useAlertStore } from "@/store/alerts";
import { ALARM_VITAL_KEYS, ALARM_LABEL, ALARM_UNIT, computeVitalAlarmBackfill } from "@/lib/vitalAlarm";
import { computeScoreTransitionHistory } from "@/lib/simulation/vitals";
import { VITAL_ALERT_COOLDOWN_MS } from "@/store/alerts";
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
  const seedBackfilledScoreAlerts = useAlertStore((s) => s.seedBackfilledScoreAlerts);
  const seedBackfilledVitalAlerts = useAlertStore((s) => s.seedBackfilledVitalAlerts);

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

  // Backfill do Alerta de Escore: buildHistory pré-popula até 62h de histórico de
  // uma vez no carregamento, antes do motor de alerta existir pra ver ao vivo — sem
  // isso o gráfico mostraria uma piora de categoria sem marcador nenhum. Reconstrói
  // retroativamente as transições e recria os alertas que teriam disparado (os já
  // resolvidos viram histórico, o que ainda estivesse aberto vira Alerta Ativo).
  // Ver CONTEXT.md § Alertas.
  useEffect(() => {
    const { beds, internacoes } = useSimulationStore.getState();
    const items: Array<Omit<Alert, "id">> = [];

    for (const inv of Object.values(internacoes)) {
      const b = beds.find((bed) => bed.internacaoId === inv.id);
      const simNow = inv.rawHistory[inv.rawHistory.length - 1]?.t ?? Date.now();
      const events = computeScoreTransitionHistory(inv.rawHistory, simNow);

      for (const ev of events) {
        items.push({
          type: "escore",
          internacaoId: inv.id,
          patientName: inv.patient.name,
          bedLabel: b?.label ?? inv.bedId,
          unit: inv.unit,
          message: `Status Clínico piorou para ${ev.status} (Escore ${ev.ewsTotal})`,
          firedAt: ev.firedAt,
          status: ev.clearedAt ? "auto-cleared" : "active",
          dismissedAt: ev.clearedAt,
        });
      }
    }

    if (items.length) seedBackfilledScoreAlerts(items);
  }, [seedBackfilledScoreAlerts]);

  // Backfill do Alerta de Sinal Vital Crítico — mesma ideia do Escore acima, mas por
  // parâmetro (fr/spo2/pas/fc/temp) e com a regra de supressão fixa de 30min (ver
  // computeVitalAlarmBackfill). Também semeia a supressão ainda pendente no fim do
  // histórico, senão o primeiro tick ao vivo poderia disparar de novo antes da hora.
  useEffect(() => {
    const { beds, internacoes } = useSimulationStore.getState();
    const items: Array<Omit<Alert, "id">> = [];
    const pendingCooldowns: Array<{ internacaoId: string; parametro: (typeof ALARM_VITAL_KEYS)[number]; since: number }> = [];

    for (const inv of Object.values(internacoes)) {
      const b = beds.find((bed) => bed.internacaoId === inv.id);

      for (const key of ALARM_VITAL_KEYS) {
        const { events, pendingCooldownSince } = computeVitalAlarmBackfill(
          inv.rawHistory,
          key,
          VITAL_ALERT_COOLDOWN_MS
        );

        for (const ev of events) {
          items.push({
            type: "sinal-vital",
            internacaoId: inv.id,
            patientName: inv.patient.name,
            bedLabel: b?.label ?? inv.bedId,
            unit: inv.unit,
            message: `${ALARM_LABEL[key]} ${ev.value}${ALARM_UNIT[key]} — fora do Limite de Alarme`,
            firedAt: ev.firedAt,
            status: ev.clearedAt ? "auto-cleared" : "active",
            dismissedAt: ev.clearedAt,
            parametro: key,
            valor: ev.value,
          });
        }

        if (pendingCooldownSince != null) {
          pendingCooldowns.push({ internacaoId: inv.id, parametro: key, since: pendingCooldownSince });
        }
      }
    }

    if (items.length || pendingCooldowns.length) seedBackfilledVitalAlerts(items, pendingCooldowns);
  }, [seedBackfilledVitalAlerts]);

  useEffect(() => {
    const id = setInterval(() => {
      advance();

      const internacoesAfter = Object.values(useSimulationStore.getState().internacoes);
      const bedsAfter = useSimulationStore.getState().beds;

      // Relógio simulado (timestamp da própria leitura), nunca Date.now() — todas as
      // internações avançam em lockstep (mesmo seed, mesmo passo de 60s por tick),
      // então uma leitura qualquer serve de referência pro tick inteiro. Se o firedAt
      // do alerta usasse o relógio real, ele desalinharia do bucket que o gráfico usa
      // pra plotar (mesmo problema já corrigido nas funções de janela/slot).
      const simNow = internacoesAfter[0]?.rawHistory[internacoesAfter[0].rawHistory.length - 1]?.t ?? Date.now();

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
      checkVitalAlerts(vitalSnapshot, simNow);

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
      checkScoreAlerts(scoreSnapshot, simNow);

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
