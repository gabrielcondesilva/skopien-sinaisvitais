import type { AlarmVitalKey } from "../vitalAlarm";

export type UnitId = "pronto-socorro" | "enfermaria" | "centro-cirurgico" | "uti";
export type UtiTipo = "adulto" | "neonatal" | "pediatrica";
export type StatusClinico = "Estável" | "Atenção" | "Risco Elevado" | "Crítico";
export type NivelConsciencia = "Alerta" | "Confuso" | "Responde à Dor" | "Inconsciente";
export type ManchesterClass = "Vermelho" | "Laranja" | "Amarelo" | "Verde" | "Azul";
export type Gender = "M" | "F";

export interface VitalsBaseline {
  fr: number;
  spo2: number;
  pas: number;
  fc: number;
  temp: number;
  nc: NivelConsciencia;
}

export interface RawReading {
  t: number; // timestamp ms
  fr: number;
  spo2: number;
  pas: number;
  fc: number;
  temp: number;
  nc: NivelConsciencia;
}

export interface SlotReading {
  t: number; // slot start ms
  fr: number;
  spo2: number;
  pas: number;
  fc: number;
  temp: number;
  nc: NivelConsciencia;
  ewsTotal: number;
  ewsStatus: StatusClinico;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  admissionReason: string;
  admittedAt: number;
}

export interface Internacao {
  id: string;
  patient: Patient;
  bedId: string;
  unit: UnitId;
  hasPump: boolean;
  baseline: VitalsBaseline;
  rawHistory: RawReading[];
  currentEws: number;
  currentStatus: StatusClinico;
  ewsForecast: { t: number; ews: number }[];
  admissionProbability: number;
  manchesterClass: ManchesterClass;
}

export interface SurgicalStep {
  name: string;
  startedAt: number | null;
  completedAt: number | null;
}

export interface SurgicalInternacao extends Internacao {
  procedureName: string;
  surgeonName: string;
  surgicalFlow: SurgicalStep[];
  currentStep: number; // 0–3
}

export interface Bed {
  id: string;
  label: string;
  unit: UnitId;
  internacaoId: string | null;
  inoperante?: boolean;
  utiTipo?: UtiTipo; // só relevante para unit === "uti"
}

// ─── Alert types ──────────────────────────────────────────────────────────────

export type AlertType =
  | "sinal-vital"  // parâmetro cruza o Limite de Alarme do dispositivo (independente do Escore EWS)
  | "medicacao"    // scripted delayed medication; badge clears on acknowledge
  | "alta";        // scripted discharge prediction; badge clears on acknowledge, can re-fire
// Note: hasPump on Internacao is the visual pump indicator — not an alert type

export type AlertStatus = "active" | "dismissed" | "auto-cleared";

// Como um alerta de sinal-vital foi encerrado por um humano — uso interno pra
// decidir a regra de carência de re-disparo (ver store/alerts.ts), não é
// exibido na UI de histórico (CONTEXT.md § Alertas).
export type VitalAlertResolution = "acao-tomada" | "falso-positivo";

export interface Alert {
  id: string;
  type: AlertType;
  internacaoId: string;
  patientName: string;
  bedLabel: string;
  unit: UnitId;
  message: string;
  firedAt: number;
  status: AlertStatus;
  dismissedAt?: number;
  dismissAction?: string; // free-text action taken — só medicacao/alta
  parametro?: AlarmVitalKey; // só type === "sinal-vital"
  valor?: number;                                    // valor que cruzou o Limite de Alarme
  resolvidoComo?: VitalAlertResolution;               // só type === "sinal-vital"
}
