import type { UnitId, UtiTipo } from "./simulation/types";

export const UNIT_LABELS: Record<UnitId, string> = {
  "pronto-socorro":   "Pronto Socorro",
  "enfermaria":       "Enfermaria",
  "uti":              "UTI",
  "centro-cirurgico": "Centro Cirúrgico",
};

export const UTI_TIPO_LABELS: Record<UtiTipo, string> = {
  adulto:     "UTI Adulto",
  neonatal:   "UTI Neonatal",
  pediatrica: "UTI Pediátrica",
};
