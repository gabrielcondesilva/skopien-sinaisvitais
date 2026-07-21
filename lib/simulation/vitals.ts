import { calculateEWS } from "@/lib/ews";
import type { RawReading, SlotReading, VitalsBaseline } from "./types";

const BOUNDS = {
  fr:   { min: 6,    max: 35,   step: 0.8 },
  spo2: { min: 85,   max: 100,  step: 0.4 },
  pas:  { min: 70,   max: 240,  step: 2.0 },
  fc:   { min: 35,   max: 155,  step: 1.5 },
  temp: { min: 34.5, max: 40.5, step: 0.05 },
};

// Slot Temporal padrão usado para o valor exibido nos cards (EWS/status) — nunca o valor bruto.
export const CARD_SLOT_MINUTES = 15;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function walk(current: number, key: keyof typeof BOUNDS): number {
  const { min, max, step } = BOUNDS[key];
  const delta = (Math.random() - 0.5) * 2 * step;
  return clamp(current + delta, min, max);
}

function round(v: number, decimals = 1) {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

// Cadência de coleta do equipamento: 1 leitura por minuto.
const READING_INTERVAL_MS = 60_000;

export function nextReading(
  prev: RawReading,
  baseline: VitalsBaseline,
  drift?: Partial<VitalsBaseline>
): RawReading {
  const keys = ["fr", "spo2", "pas", "fc", "temp"] as const;
  const next: Partial<RawReading> = { t: prev.t + READING_INTERVAL_MS };

  for (const k of keys) {
    // Pull toward baseline (mean reversion) then add drift if scripted
    const target = baseline[k] + (drift?.[k] ?? 0);
    const reverted = prev[k] + (target - prev[k]) * 0.05;
    next[k] = round(walk(reverted, k));
  }

  // Nível de Consciência é avaliação pontual (AVPU), não sofre random walk —
  // acompanha o estado atual do baseline/roteiro
  next.nc = drift?.nc ?? baseline.nc;

  return next as RawReading;
}

export function buildHistory(
  baseline: VitalsBaseline,
  untilMs: number,
  windowMs: number
): RawReading[] {
  const history: RawReading[] = [];
  const startMs = untilMs - windowMs;
  const initial: RawReading = {
    t: startMs,
    fr: round(baseline.fr),
    spo2: round(baseline.spo2),
    pas: round(baseline.pas),
    fc: round(baseline.fc),
    temp: round(baseline.temp, 1),
    nc: baseline.nc,
  };
  history.push(initial);

  let prev = initial;
  while (prev.t + READING_INTERVAL_MS <= untilMs) {
    prev = nextReading(prev, baseline);
    history.push(prev);
  }

  return history;
}

type VitalKey = "fr" | "spo2" | "pas" | "fc" | "temp";

// 0/null/undefined/NaN indicam leitura ausente ou falha do equipamento.
function isValidReading(v: number): boolean {
  return !!v;
}

// Não existe "média" nem "mediana" de sinal vital na prática clínica: o valor exibido é
// sempre a leitura mais recente. Se ela vier vazia/zerada (falha do equipamento), cai
// para a leitura válida anterior dentro do mesmo slot. Leituras simuladas nunca são
// inválidas (ver BOUNDS), então esse fallback só entra em jogo com dados reais.
function lastValidInSlot(readings: RawReading[], key: VitalKey): number {
  for (let i = readings.length - 1; i >= 0; i--) {
    const v = readings[i][key];
    if (isValidReading(v)) return v;
  }
  return readings[readings.length - 1][key];
}

export function computeSlots(
  history: RawReading[],
  slotMinutes: number,
  windowMs: number,
  now: number
): SlotReading[] {
  const slotMs = slotMinutes * 60 * 1000;
  const windowStart = now - windowMs;

  const buckets = new Map<number, RawReading[]>();

  for (const r of history) {
    if (r.t < windowStart) continue;
    const slotKey = Math.floor(r.t / slotMs) * slotMs;
    if (!buckets.has(slotKey)) buckets.set(slotKey, []);
    buckets.get(slotKey)!.push(r);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([slotStart, readings]) => {
      const fr   = round(lastValidInSlot(readings, "fr"));
      const spo2 = round(lastValidInSlot(readings, "spo2"));
      const pas  = round(lastValidInSlot(readings, "pas"));
      const fc   = round(lastValidInSlot(readings, "fc"));
      const temp = round(lastValidInSlot(readings, "temp"), 1);
      // NC é estado categórico pontual — usa o valor mais recente do slot, igual aos demais
      const nc   = readings[readings.length - 1].nc;
      const ews  = calculateEWS({ fr, spo2, pas, fc, temp, nc });
      return {
        t: slotStart,
        fr, spo2, pas, fc, temp, nc,
        ewsTotal: ews.total,
        ewsStatus: ews.status,
      };
    });
}

export function currentSlotValues(
  history: RawReading[],
  slotMinutes: number,
  now: number
): RawReading {
  const slotMs = slotMinutes * 60 * 1000;
  const currentSlotStart = Math.floor(now / slotMs) * slotMs;
  const inSlot = history.filter((r) => r.t >= currentSlotStart);

  if (inSlot.length === 0) {
    const last = history[history.length - 1];
    return last ?? { t: now, fr: 16, spo2: 98, pas: 120, fc: 75, temp: 37.0, nc: "Alerta" };
  }

  return {
    t: now,
    fr:   round(lastValidInSlot(inSlot, "fr")),
    spo2: round(lastValidInSlot(inSlot, "spo2")),
    pas:  round(lastValidInSlot(inSlot, "pas")),
    fc:   round(lastValidInSlot(inSlot, "fc")),
    temp: round(lastValidInSlot(inSlot, "temp"), 1),
    nc:   inSlot[inSlot.length - 1].nc,
  };
}
