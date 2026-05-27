import { calculateEWS } from "@/lib/ews";
import type { RawReading, SlotReading, VitalsBaseline } from "./types";

const BOUNDS = {
  fr:   { min: 6,    max: 35,   step: 0.8 },
  spo2: { min: 85,   max: 100,  step: 0.4 },
  pas:  { min: 70,   max: 240,  step: 2.0 },
  fc:   { min: 35,   max: 155,  step: 1.5 },
  temp: { min: 34.5, max: 40.5, step: 0.05 },
};

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

export function nextReading(
  prev: RawReading,
  baseline: VitalsBaseline,
  drift?: Partial<VitalsBaseline>
): RawReading {
  const keys = ["fr", "spo2", "pas", "fc", "temp"] as const;
  const next: Partial<RawReading> = { t: prev.t + 5000 };

  for (const k of keys) {
    // Pull toward baseline (mean reversion) then add drift if scripted
    const target = baseline[k] + (drift?.[k] ?? 0);
    const reverted = prev[k] + (target - prev[k]) * 0.05;
    next[k] = round(walk(reverted, k));
  }

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
  };
  history.push(initial);

  let prev = initial;
  while (prev.t + 5000 <= untilMs) {
    prev = nextReading(prev, baseline);
    history.push(prev);
  }

  return history;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
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
      const fr   = round(median(readings.map((r) => r.fr)));
      const spo2 = round(median(readings.map((r) => r.spo2)));
      const pas  = round(median(readings.map((r) => r.pas)));
      const fc   = round(median(readings.map((r) => r.fc)));
      const temp = round(median(readings.map((r) => r.temp)), 1);
      const ews  = calculateEWS({ fr, spo2, pas, fc, temp });
      return {
        t: slotStart,
        fr, spo2, pas, fc, temp,
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
    return last ?? { t: now, fr: 16, spo2: 98, pas: 120, fc: 75, temp: 37.0 };
  }

  return {
    t: now,
    fr:   round(median(inSlot.map((r) => r.fr))),
    spo2: round(median(inSlot.map((r) => r.spo2))),
    pas:  round(median(inSlot.map((r) => r.pas))),
    fc:   round(median(inSlot.map((r) => r.fc))),
    temp: round(median(inSlot.map((r) => r.temp)), 1),
  };
}
