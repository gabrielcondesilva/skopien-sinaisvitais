import type { RawReading } from "./simulation/types";

// ─── Limite de Alarme do dispositivo ────────────────────────────────────────
// Faixa por parâmetro que, ultrapassada, dispara um Alerta de Sinal Vital
// Crítico em tempo real, avaliada sobre a leitura bruta assim que ela chega
// (1/min) — não espera nenhuma agregação (Slot Temporal ou Janela de Escore).
// Conceito desacoplado do Escore EWS (lib/ews.ts) e do vitalSeverity
// (lib/vitalSeverity.ts) — ver CONTEXT.md § Limite de Alarme.

export type AlarmVitalKey = "fr" | "spo2" | "pas" | "fc" | "temp";

export const ALARM_LABEL: Record<AlarmVitalKey, string> = {
  fr: "FR",
  spo2: "SpO₂",
  pas: "PAS",
  fc: "FC",
  temp: "TEMP",
};

export const ALARM_UNIT: Record<AlarmVitalKey, string> = {
  fr: "rpm",
  spo2: "%",
  pas: "mmHg",
  fc: "bpm",
  temp: "°C",
};

export function isOutOfAlarmLimit(key: AlarmVitalKey, value: number): boolean {
  switch (key) {
    case "fc":   return value < 40 || value > 120;
    case "pas":  return value < 90 || value > 180;
    case "spo2": return value < 88;
    case "fr":   return value > 30;
    case "temp": return value < 35 || value > 37.8;
  }
}

export const ALARM_VITAL_KEYS: AlarmVitalKey[] = ["fr", "spo2", "pas", "fc", "temp"];

// FR vem do ventilador — usa o emoji de ventilador; os demais parâmetros usam
// o emoji de monitor genérico. Ver CONTEXT.md § Alertas.
export function alarmIconFor(key: AlarmVitalKey): "monitor" | "ventilador" {
  return key === "fr" ? "ventilador" : "monitor";
}

export interface VitalAlarmEvent {
  firedAt: number;
  value: number;
  clearedAt?: number; // undefined = ainda ativo no fim do histórico
}

// Backfill: reconstrói retroativamente os cruzamentos do Limite de Alarme dentro
// do histórico já semeado (buildHistory pré-popula até 62h de uma vez, antes do
// motor de Alarme existir pra ver ao vivo). Mesma regra de checkVitalAlerts
// (store/alerts.ts) — supressão fixa de cooldownMs a partir do disparo original,
// não importa como o alerta anterior encerrou.
export function computeVitalAlarmBackfill(
  history: RawReading[],
  key: AlarmVitalKey,
  cooldownMs: number
): { events: VitalAlarmEvent[]; pendingCooldownSince: number | null } {
  const events: VitalAlarmEvent[] = [];
  let active: VitalAlarmEvent | null = null;
  let cooldownSince: number | null = null;

  for (const r of history) {
    const value = r[key];
    if (!value) continue; // leitura vazia/zerada (falha de equipamento) — ignora

    const outOfRange = isOutOfAlarmLimit(key, value);

    if (active) {
      if (!outOfRange) {
        active.clearedAt = r.t;
        events.push(active);
        cooldownSince = active.firedAt;
        active = null;
      }
      continue;
    }

    if (!outOfRange) continue;

    if (cooldownSince != null) {
      if (r.t - cooldownSince < cooldownMs) continue; // ainda suprimido
      cooldownSince = null;
    }

    active = { firedAt: r.t, value };
  }

  if (active) events.push(active);
  return { events, pendingCooldownSince: active ? null : cooldownSince };
}
