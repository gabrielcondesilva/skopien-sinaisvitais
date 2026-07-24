// ─── Limite de Alarme do dispositivo ────────────────────────────────────────
// Faixa por parâmetro que, ultrapassada na leitura do Slot Temporal fixo do
// sistema (15 min), dispara um Alerta de Sinal Vital Crítico. Conceito
// desacoplado do Escore EWS (lib/ews.ts) e do vitalSeverity (lib/vitalSeverity.ts)
// — ver CONTEXT.md § Limite de Alarme.

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
