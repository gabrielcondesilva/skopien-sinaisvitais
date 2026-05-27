export type StatusClinico = "Estável" | "Atenção" | "Risco Elevado" | "Crítico";

export interface VitalSigns {
  fr: number;   // Frequência Respiratória (rpm)
  spo2: number; // Saturação de O₂ (%)
  pas: number;  // Pressão Arterial Sistólica (mmHg)
  fc: number;   // Frequência Cardíaca (bpm)
  temp: number; // Temperatura (°C)
}

export interface EWSResult {
  scores: { fr: number; spo2: number; pas: number; fc: number; temp: number };
  total: number;
  status: StatusClinico;
}

function scoreFR(fr: number): number {
  if (fr <= 8) return 3;
  if (fr <= 11) return 1;
  if (fr <= 20) return 0;
  if (fr <= 24) return 2;
  return 3;
}

function scoreSpO2(spo2: number): number {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function scorePAS(pas: number): number {
  if (pas <= 90) return 3;
  if (pas <= 100) return 2;
  if (pas <= 110) return 1;
  if (pas <= 219) return 0;
  return 3;
}

function scoreFC(fc: number): number {
  if (fc <= 40) return 3;
  if (fc <= 50) return 1;
  if (fc <= 90) return 0;
  if (fc <= 110) return 1;
  if (fc <= 130) return 2;
  return 3;
}

function scoreTEMP(temp: number): number {
  if (temp <= 35.0) return 3;
  if (temp <= 36.0) return 1;
  if (temp <= 38.0) return 0;
  if (temp <= 39.0) return 1;
  return 2;
}

function statusFromTotal(total: number, hasIndividualMax: boolean): StatusClinico {
  if (total >= 7) return "Crítico";
  if (total >= 5) return "Risco Elevado";
  // Exception: any individual score of 3 elevates minimum to Atenção
  if (total >= 3 || hasIndividualMax) return "Atenção";
  return "Estável";
}

export function calculateEWS(vitals: VitalSigns): EWSResult {
  const scores = {
    fr: scoreFR(vitals.fr),
    spo2: scoreSpO2(vitals.spo2),
    pas: scorePAS(vitals.pas),
    fc: scoreFC(vitals.fc),
    temp: scoreTEMP(vitals.temp),
  };

  const total = scores.fr + scores.spo2 + scores.pas + scores.fc + scores.temp;
  const hasIndividualMax = Object.values(scores).some((s) => s === 3);
  const status = statusFromTotal(total, hasIndividualMax);

  return { scores, total, status };
}
