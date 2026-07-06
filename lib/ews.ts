export type StatusClinico = "Baixo" | "Moderado" | "Alto";
export type NivelConsciencia = "Alerta" | "Confuso" | "Responde à Dor" | "Inconsciente";

export interface VitalSigns {
  fr: number;   // Frequência Respiratória (rpm)
  spo2: number; // Saturação de O₂ (%) — exibido, não entra no cálculo do MEWS
  pas: number;  // Pressão Arterial Sistólica (mmHg)
  fc: number;   // Frequência Cardíaca (bpm)
  temp: number; // Temperatura (°C)
  nc: NivelConsciencia; // Nível de Consciência (AVPU)
}

export interface EWSResult {
  scores: { fr: number; pas: number; fc: number; temp: number; nc: number };
  total: number;
  status: StatusClinico;
}

function scoreFR(fr: number): number {
  if (fr < 9) return 3;
  if (fr <= 14) return 2;
  if (fr <= 20) return 1;
  if (fr <= 29) return 1;
  return 2;
}

function scorePAS(pas: number): number {
  if (pas <= 70) return 3;
  if (pas <= 80) return 2;
  if (pas <= 100) return 1;
  if (pas <= 199) return 0;
  return 1;
}

function scoreFC(fc: number): number {
  if (fc <= 40) return 3;
  if (fc <= 50) return 2;
  if (fc <= 100) return 1;
  if (fc <= 110) return 0;
  if (fc <= 120) return 1;
  return 2;
}

function scoreTEMP(temp: number): number {
  if (temp <= 35.0) return 3;
  if (temp <= 37.8) return 2;
  return 1;
}

function scoreNC(nc: NivelConsciencia): number {
  switch (nc) {
    case "Alerta": return 0;
    case "Confuso": return 1;
    case "Responde à Dor": return 2;
    case "Inconsciente": return 3;
  }
}

function statusFromTotal(total: number): StatusClinico {
  if (total >= 5) return "Alto";
  if (total >= 3) return "Moderado";
  return "Baixo";
}

export function calculateEWS(vitals: VitalSigns): EWSResult {
  const scores = {
    fr: scoreFR(vitals.fr),
    pas: scorePAS(vitals.pas),
    fc: scoreFC(vitals.fc),
    temp: scoreTEMP(vitals.temp),
    nc: scoreNC(vitals.nc),
  };

  const total = scores.fr + scores.pas + scores.fc + scores.temp + scores.nc;
  const status = statusFromTotal(total);

  return { scores, total, status };
}
