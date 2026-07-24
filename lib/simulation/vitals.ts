import { calculateEWS } from "@/lib/ews";
import type { RawReading, SlotReading, StatusClinico, VitalsBaseline } from "./types";

// Ranking de severidade do Status Clínico — usado pra detectar piora/melhora de
// categoria tanto no Alerta de Escore ao vivo (store/alerts.ts) quanto no backfill
// retroativo (computeScoreTransitionHistory). Fonte única, evita as duas divergirem.
export const SCORE_STATUS_RANK: Record<StatusClinico, number> = {
  "Estável": 0,
  "Atenção": 1,
  "Risco Elevado": 2,
  "Crítico": 3,
};

const BOUNDS = {
  fr:   { min: 6,    max: 35,   step: 0.8 },
  spo2: { min: 85,   max: 100,  step: 0.4 },
  pas:  { min: 70,   max: 240,  step: 2.0 },
  fc:   { min: 35,   max: 155,  step: 1.5 },
  temp: { min: 34.5, max: 40.5, step: 0.05 },
};

// Janela de Escore: bucket fixo de 30min agregado pela mediana, exclusivo do cálculo
// do Escore EWS — distinto do Slot Temporal (última leitura válida, ajustável por
// tela). Não segue nenhum seletor de granularidade. Ver CONTEXT.md § Janela de Escore
// e ADR-0004 pro racional de usar mediana aqui e última leitura nos demais casos.
export const SCORE_WINDOW_MINUTES = 30;

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

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Mediana das leituras válidas do bucket — se nenhuma leitura do bucket for válida
// (falha de equipamento generalizada), cai para a mediana bruta em vez de deixar a
// Janela de Escore vazia.
function medianInBucket(readings: RawReading[], key: VitalKey): number {
  const valid = readings.map((r) => r[key]).filter(isValidReading);
  return median(valid.length ? valid : readings.map((r) => r[key]));
}

// Série histórica do Escore EWS para o gráfico "Histórico e Predição EWS" — sempre
// em buckets fixos de Janela de Escore (30min/mediana), independente de qualquer
// Slot escolhido nos gráficos de Sinais Vitais. Ver CONTEXT.md § Janela de Escore.
export function computeScoreHistory(
  history: RawReading[],
  windowMs: number,
  now: number
): SlotReading[] {
  const bucketMs = SCORE_WINDOW_MINUTES * 60 * 1000;
  const windowStart = now - windowMs;
  // Bucket em andamento ainda não fechou — mediana instável (poucas leituras),
  // nunca entra na série. Ver currentScoreVitals.
  const openBucketStart = Math.floor(now / bucketMs) * bucketMs;

  // Bucketiza TODAS as leituras primeiro, sem cortar pela Janela — cortar aqui
  // truncaria o bucket que fica bem na borda da Janela, fazendo a mediana daquele
  // bucket variar conforme o tamanho da Janela escolhida. A Janela só decide DEPOIS
  // quais buckets (inteiros) aparecem na série, nunca corta leitura de dentro de um.
  const buckets = new Map<number, RawReading[]>();
  for (const r of history) {
    const bucketKey = Math.floor(r.t / bucketMs) * bucketMs;
    if (bucketKey >= openBucketStart) continue;
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
    buckets.get(bucketKey)!.push(r);
  }

  return Array.from(buckets.entries())
    .filter(([bucketStart]) => bucketStart + bucketMs > windowStart)
    .sort(([a], [b]) => a - b)
    .map(([bucketStart, readings]) => {
      const fr   = round(medianInBucket(readings, "fr"));
      const spo2 = round(medianInBucket(readings, "spo2"));
      const pas  = round(medianInBucket(readings, "pas"));
      const fc   = round(medianInBucket(readings, "fc"));
      const temp = round(medianInBucket(readings, "temp"), 1);
      const nc   = readings[readings.length - 1].nc;
      const ews  = calculateEWS({ fr, spo2, pas, fc, temp, nc });
      return {
        // Plota no fechamento do bucket (quando o valor passa a valer), não no
        // início — senão o ponto mais recente parece "atrasado" 30min no eixo X.
        t: bucketStart + bucketMs,
        fr, spo2, pas, fc, temp, nc,
        ewsTotal: ews.total,
        ewsStatus: ews.status,
      };
    });
}

export interface ScoreTransitionEvent {
  firedAt: number;       // fechamento do bucket em que a categoria piorou
  status: StatusClinico;
  ewsTotal: number;
  clearedAt?: number;    // fechamento do bucket em que melhorou depois — undefined = ainda em aberto
}

// Backfill: reconstrói retroativamente as transições de categoria do Status Clínico
// dentro do histórico já semeado (buildHistory pré-popula até 62h de uma vez, antes
// do motor de Alerta de Escore existir pra ver acontecer ao vivo). Mesma regra do
// checkScoreAlerts (store/alerts.ts) — só não reavalia a carência de 60min, que
// depende de uma ação humana de dispensa que não existe em dado sintético.
export function computeScoreTransitionHistory(history: RawReading[], now: number): ScoreTransitionEvent[] {
  if (history.length === 0) return [];

  const bucketMs = SCORE_WINDOW_MINUTES * 60 * 1000;
  const earliest = history[0].t;
  const fullWindowMs = now - earliest + bucketMs;
  const closedSlots = computeScoreHistory(history, fullWindowMs, now);

  const events: ScoreTransitionEvent[] = [];
  let prevStatus: StatusClinico | null = null;
  let openEvent: ScoreTransitionEvent | null = null;

  for (const slot of closedSlots) {
    if (prevStatus == null) {
      prevStatus = slot.ewsStatus;
      continue;
    }

    const prevRank = SCORE_STATUS_RANK[prevStatus];
    const rank = SCORE_STATUS_RANK[slot.ewsStatus];

    if (rank > prevRank) {
      if (openEvent) {
        openEvent.clearedAt = slot.t;
        events.push(openEvent);
      }
      openEvent = { firedAt: slot.t, status: slot.ewsStatus, ewsTotal: slot.ewsTotal };
    } else if (rank < prevRank && openEvent) {
      openEvent.clearedAt = slot.t;
      events.push(openEvent);
      openEvent = null;
    }
    prevStatus = slot.ewsStatus;
  }

  if (openEvent) events.push(openEvent);
  return events;
}

// Recalcula só quando o bucket de 30min FECHA — nunca o bucket em andamento, que
// tem poucas leituras e reintroduziria ruído (era pra ser um bucket fixo, não uma
// janela rolante). Ver CONTEXT.md § Janela de Escore.
export function currentScoreVitals(history: RawReading[], now: number): RawReading {
  const bucketMs = SCORE_WINDOW_MINUTES * 60 * 1000;
  const bucketEnd = Math.floor(now / bucketMs) * bucketMs;
  const bucketStart = bucketEnd - bucketMs;
  const inBucket = history.filter((r) => r.t >= bucketStart && r.t < bucketEnd);

  if (inBucket.length === 0) {
    const last = history[history.length - 1];
    return last ?? { t: now, fr: 16, spo2: 98, pas: 120, fc: 75, temp: 37.0, nc: "Alerta" };
  }

  return {
    t: bucketEnd,
    fr:   round(medianInBucket(inBucket, "fr")),
    spo2: round(medianInBucket(inBucket, "spo2")),
    pas:  round(medianInBucket(inBucket, "pas")),
    fc:   round(medianInBucket(inBucket, "fc")),
    temp: round(medianInBucket(inBucket, "temp"), 1),
    nc:   inBucket[inBucket.length - 1].nc,
  };
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
