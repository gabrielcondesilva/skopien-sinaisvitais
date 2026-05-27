export type UnitId = "pronto-socorro" | "enfermaria" | "centro-cirurgico" | "uti";
export type StatusClinico = "Estável" | "Atenção" | "Risco Elevado" | "Crítico";
export type ManchesterClass = "Vermelho" | "Laranja" | "Amarelo" | "Verde" | "Azul";
export type Gender = "M" | "F";

export interface VitalsBaseline {
  fr: number;
  spo2: number;
  pas: number;
  fc: number;
  temp: number;
}

export interface RawReading {
  t: number; // timestamp ms
  fr: number;
  spo2: number;
  pas: number;
  fc: number;
  temp: number;
}

export interface SlotReading {
  t: number; // slot start ms
  fr: number;
  spo2: number;
  pas: number;
  fc: number;
  temp: number;
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
}

// ─── Alert types ──────────────────────────────────────────────────────────────

export type AlertType =
  | "sinal-vital"      // EWS → Crítico; badge clears when status normalizes
  | "medicacao"        // scripted delayed medication; badge clears on acknowledge
  | "alta"             // scripted discharge prediction; badge clears on acknowledge, can re-fire
  | "bomba-infusao";   // scripted pump alarm; badge clears on acknowledge

export type AlertStatus = "active" | "dismissed" | "auto-cleared";

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
  dismissAction?: string; // free-text action taken
}
