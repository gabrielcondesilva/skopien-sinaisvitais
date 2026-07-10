import type { NivelConsciencia } from "./simulation/types";

// ─── Severidade visual por sinal (limiares clínicos independentes do Escore MEWS) ──
// Não corresponde 1:1 à pontuação MEWS de lib/ews.ts, que segue a tabela literal do
// documento institucional (com faixas não-intuitivas, ex.: FR nunca pontua 0). Aqui
// usamos faixas de normalidade clínica padrão só para destacar visualmente valores
// fora do comum — cartões e gráficos de sinais vitais compartilham esta mesma escala.

export type VitalKey = "fr" | "spo2" | "pas" | "fc" | "temp" | "nc";

// 0 = normal, 1 = atenção, 2 = crítico
export function vitalSeverity(key: VitalKey | string, value: number | NivelConsciencia): number {
  switch (key) {
    case "fr":
      if (typeof value !== "number") return 0;
      if (value <= 9  || value >= 25) return 2;
      if (value <= 11 || value >= 21) return 1;
      return 0;
    case "spo2":
      if (typeof value !== "number") return 0;
      if (value <= 91) return 2;
      if (value <= 94) return 1;
      return 0;
    case "pas":
      if (typeof value !== "number") return 0;
      if (value <= 89  || value >= 180) return 2;
      if (value <= 99  || value >= 140) return 1;
      return 0;
    case "fc":
      if (typeof value !== "number") return 0;
      if (value <= 49  || value >= 121) return 2;
      if (value <= 59  || value >= 101) return 1;
      return 0;
    case "temp":
      if (typeof value !== "number") return 0;
      if (value <= 35.4 || value >= 38.5) return 2;
      if (value <= 35.9 || value >= 37.5) return 1;
      return 0;
    case "nc":
      if (value === "Alerta") return 0;
      if (value === "Confuso") return 1;
      return 2; // "Responde à Dor" | "Inconsciente"
    default:
      return 0;
  }
}

// Normal (cinza) / Atenção (amarelo) / Crítico (vermelho)
export const VITAL_SEVERITY_COLOR = ["#888888", "#eab308", "#ef4444"];
