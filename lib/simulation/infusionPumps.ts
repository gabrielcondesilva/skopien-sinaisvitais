// ─── Dados de Bombas de Infusão — gerador puro e determinístico ───────────────
// Mesmo padrão de lib/simulation/ventilator.ts (ADR-0002): sem backend, tudo
// derivado só de (internacaoId, t). Cada internação "usa" um subconjunto fixo
// de drogas do catálogo (escolhido por hash do id).
//
// A dose (mL/h) é PIECEWISE CONSTANT — só muda em eventos discretos de "Ajuste
// de Dose" (ver docs/bomba-exemplo.png: o gráfico de referência é em degraus,
// não uma curva contínua). Eventos são espaçados a cada EVENT_INTERVAL_MS,
// com horário levemente jitterado por bomba (via `phase`) pra não ficarem
// todos alinhados no mesmo minuto. "Bolus Adicional" e "Troca de Bolsa" são
// eventos informativos que aparecem na tabela mas não alteram a taxa.
//
// Os timestamps dos eventos são calculados a partir de um `phase` fixo por
// bomba (não de startedAt, que "anda" com t) — assim a posição de cada evento
// no tempo nunca muda entre re-renders, só a janela visível cresce conforme a
// simulação avança.

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

function frac(x: number): number {
  return x - Math.floor(x);
}

function noise(seed: number): number {
  return frac(Math.sin(seed) * 43758.5453);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

interface DrugDef {
  name: string;
  concentration: string;
  doseUnit: string;
  rateMin: number;
  rateBaseline: number;
  rateMax: number;
  doseFactor: number; // dose por 1 mL/h (aproximação, só pra exibição)
  // Viés determinístico aplicado a cada "Ajuste de Dose" (0 = sem viés, só
  // ruído simétrico). Negativo puxa a dose pra baixo ao longo da janela —
  // usado só na Dobutamina, pra demo mostrar uma queda visível de dose, não
  // só subidas (ver computePumpTimeline).
  trendBias?: number;
}

const DRUG_CATALOG: DrugDef[] = [
  { name: "Noradrenalina", concentration: "50 mL · 8 mg/50mL",     doseUnit: "mcg/kg/min", rateMin: 1,   rateBaseline: 6,    rateMax: 15, doseFactor: 0.031 },
  { name: "Propofol",      concentration: "50 mL · 1% (10mg/mL)",  doseUnit: "mg/kg/h",    rateMin: 5,   rateBaseline: 14,   rateMax: 25, doseFactor: 0.143 },
  { name: "Fentanil",      concentration: "50 mL · 50mcg/mL",      doseUnit: "mcg/kg/h",   rateMin: 1,   rateBaseline: 4.5,  rateMax: 8,  doseFactor: 0.289 },
  { name: "Vasopressina",  concentration: "50 mL · 20 UI/50mL",    doseUnit: "UI/min",     rateMin: 0.5, rateBaseline: 2.4,  rateMax: 5,  doseFactor: 0.0083 },
  { name: "Dobutamina",    concentration: "50 mL · 250mg/50mL",    doseUnit: "mcg/kg/min", rateMin: 2,   rateBaseline: 10,   rateMax: 20, doseFactor: 0.07, trendBias: 0.35 },
  { name: "Midazolam",     concentration: "50 mL · 50mg/50mL",     doseUnit: "mg/h",       rateMin: 1,   rateBaseline: 5,    rateMax: 10, doseFactor: 1.0 },
];

// Cores de acento por índice da bomba (ciclo), só decorativo — mesmo espírito
// das cores de status já usadas no app.
export const PUMP_ACCENT_COLORS = ["#f43f5e", "#a855f7", "#f97316", "#3b82f6", "#22c55e", "#eab308"];

const CLINICIANS = ["Enf. Costa", "Dr. Arantes", "Dr. Silva", "Enf. Ramos", "Dra. Nogueira", "Enf. Lima"];

export interface InfusionPump {
  id: string; // "B1", "B2", ...
  drug: string;
  concentration: string;
  rateMlH: number;
  dose: number;
  doseUnit: string;
  accentColor: string;
  startedAt: number; // timestamp ms — quando a droga começou a correr
}

export type PumpEventType = "Ajuste de Dose" | "Bolus Adicional" | "Troca de Bolsa";

export interface PumpEvent {
  id: string;
  t: number;
  pumpId: string;
  drug: string;
  accentColor: string;
  type: PumpEventType;
  doseSet?: number; // mL/h — só em "Ajuste de Dose"
  clinician: string;
}

export interface PumpTimeline {
  pump: InfusionPump;
  rateDomain: [number, number]; // pra domínio do eixo Y do gráfico dessa bomba
  rateSeries: { t: number; rate: number }[]; // em degraus — pra chart (type="stepAfter")
  events: PumpEvent[]; // cronológico, já recortado pra dentro da janela pedida
}

function formatDose(dose: number): number {
  return dose < 1 ? Math.round(dose * 100) / 100 : Math.round(dose * 10) / 10;
}

// Quantidade de drogas ativas não varia com t — exposto à parte pra quem só
// precisa do total (ex.: badge do painel) sem montar a lista inteira.
export function infusionPumpCount(internacaoId: string): number {
  return 3 + (Math.abs(hashSeed(internacaoId)) % 2);
}

// 1 evento a cada ~12min por bomba (aproximação de demo — clinicamente os
// intervalos reais variam muito mais). Dá densidade suficiente pra encher o
// gráfico/tabela numa janela de 1-2h sem ficar poluído.
const EVENT_INTERVAL_MS = 12 * 60_000;
// Quantos eventos olhar pra trás do "agora" pra estabilizar a taxa atual antes
// do início da janela visível (evita a curva "resetar" pra baseline bem na
// borda esquerda do gráfico a cada refresh).
const EVENT_LOOKBACK = 40;
// Quantos eventos recentes recebem o `trendBias` de uma droga (ver DrugDef) —
// só perto de "agora", não em todo o lookback. Sem isso, um viés constante ao
// longo de 40 eventos já teria saturado no rateMin bem antes da janela
// visível começar, e a curva apareceria travada no chão o tempo todo em vez
// de mostrar a queda de fato.
const TREND_BIAS_EVENTS = 16;

function pickEventType(seed: number, drugIndex: number, k: number): PumpEventType {
  const r = noise(seed + drugIndex * 5.5 + k * 2.9);
  if (r < 0.5) return "Ajuste de Dose";
  if (r < 0.78) return "Bolus Adicional";
  return "Troca de Bolsa";
}

function pickClinician(seed: number, drugIndex: number, k: number): string {
  const idx = Math.floor(noise(seed + drugIndex * 17.3 + k * 11.9) * CLINICIANS.length) % CLINICIANS.length;
  return CLINICIANS[idx];
}

function computePumpTimeline(
  seed: number,
  pumpIndex: number,
  drugIndex: number,
  def: DrugDef,
  admittedAt: number,
  t: number,
  windowStart: number
): PumpTimeline {
  const id = `B${pumpIndex + 1}`;
  const accentColor = PUMP_ACCENT_COLORS[pumpIndex % PUMP_ACCENT_COLORS.length];

  // Offset fixo por bomba (não depende de t) — espalha os eventos das várias
  // bombas pra não caírem todos no mesmo minuto.
  const phase = noise(seed + drugIndex * 4.7 + pumpIndex) * EVENT_INTERVAL_MS;
  const k0 = Math.floor((t - phase) / EVENT_INTERVAL_MS);
  const kStart = Math.max(0, k0 - EVENT_LOOKBACK);

  let rate = def.rateBaseline;
  let rateAtWindowStart = def.rateBaseline;
  const events: PumpEvent[] = [];
  const rateSeries: { t: number; rate: number }[] = [];

  for (let k = kStart; k <= k0; k++) {
    const et = phase + k * EVENT_INTERVAL_MS;
    if (et > t) break;

    const type = pickEventType(seed, drugIndex, k);
    if (type === "Ajuste de Dose") {
      const recency = k0 - k; // 0 = evento mais recente, cresce indo pro passado
      const biasStrength = Math.max(0, 1 - recency / TREND_BIAS_EVENTS);
      const delta = (noise(seed + drugIndex * 23 + k * 4.1) - 0.5 - (def.trendBias ?? 0) * biasStrength) * (def.rateMax - def.rateMin) * 0.9;
      rate = clamp(rate + delta, def.rateMin, def.rateMax);
    }

    if (et < windowStart) {
      rateAtWindowStart = rate;
      continue;
    }

    const rateRounded = Math.round(rate * 10) / 10;
    events.push({
      id: `${id}-${k}`,
      t: et,
      pumpId: id,
      drug: def.name,
      accentColor,
      type,
      doseSet: type === "Ajuste de Dose" ? rateRounded : undefined,
      clinician: pickClinician(seed, drugIndex, k),
    });
    if (type === "Ajuste de Dose") {
      rateSeries.push({ t: et, rate: rateRounded });
    }
  }

  const currentRate = Math.round(rate * 10) / 10;
  const startFrac = 0.05 + noise(seed + drugIndex * 19.1) * 0.55;
  const startedAt = admittedAt + (t - admittedAt) * startFrac;

  return {
    pump: {
      id,
      drug: def.name,
      concentration: def.concentration,
      rateMlH: currentRate,
      dose: formatDose(currentRate * def.doseFactor),
      doseUnit: def.doseUnit,
      accentColor,
      startedAt,
    },
    rateDomain: [0, Math.ceil(def.rateMax * 1.15)],
    rateSeries: [
      { t: windowStart, rate: Math.round(rateAtWindowStart * 10) / 10 },
      ...rateSeries,
      { t, rate: currentRate },
    ],
    events,
  };
}

function activeDrugs(internacaoId: string): { pumpIndex: number; drugIndex: number; def: DrugDef }[] {
  const seed = hashSeed(internacaoId);
  const count = infusionPumpCount(internacaoId);
  const start = Math.abs(seed >> 3) % DRUG_CATALOG.length;
  return Array.from({ length: count }, (_, i) => ({
    pumpIndex: i,
    drugIndex: (start + i) % DRUG_CATALOG.length,
    def: DRUG_CATALOG[(start + i) % DRUG_CATALOG.length],
  }));
}

// 3 ou 4 drogas ativas por internação (variedade estável, sem sortear a cada render).
export function computeInfusionPumps(internacaoId: string, t: number, admittedAt: number): InfusionPump[] {
  const seed = hashSeed(internacaoId);
  return activeDrugs(internacaoId).map(({ pumpIndex, drugIndex, def }) =>
    computePumpTimeline(seed, pumpIndex, drugIndex, def, admittedAt, t, t).pump
  );
}

// Linha do tempo completa (curva em degraus + eventos) de cada bomba ativa,
// recortada pra dentro de [windowStart, t] — usada pela aba Bomba (gráfico +
// tabela de eventos).
export function computePumpTimelines(
  internacaoId: string,
  t: number,
  admittedAt: number,
  windowStart: number
): PumpTimeline[] {
  const seed = hashSeed(internacaoId);
  return activeDrugs(internacaoId).map(({ pumpIndex, drugIndex, def }) =>
    computePumpTimeline(seed, pumpIndex, drugIndex, def, admittedAt, t, windowStart)
  );
}
