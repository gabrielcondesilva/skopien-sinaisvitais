import type { RawReading } from "./types";

// ─── Dados de ventilador — gerador puro e determinístico ──────────────────────
// Sem backend (ADR-0002): tudo é derivado só de (internacaoId, t), onde t já vem
// do rawHistory existente (avança 1x/min via store/simulation.ts § advance). Não
// há estado novo pra persistir — cada chamada com o mesmo (internacaoId, t)
// devolve exatamente o mesmo resultado, então não precisamos estender o
// SimulationEngine (RawReading/SlotReading/seed/store) só pra isso.
//
// O "ciclo respiratório" das 3 curvas (Pressão/Fluxo/Volume) é um macro-ciclo de
// alguns minutos (CYCLE_MS), não a duração real de uma respiração (~3-5s) — como
// a cadência de amostragem é 1 leitura/min (decisão do usuário: acompanha o ritmo
// do simulador, não um monitor "ao vivo"), um ciclo do tamanho real ficaria
// irreconhecível entre dois pontos consecutivos. Esse macro-ciclo só existe pra
// dar às curvas a silhueta visual de inspiração/expiração ao longo da janela
// exibida — as magnitudes (L/min, mL, cmH2O) continuam na escala clínica real.

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

function frac(x: number): number {
  return x - Math.floor(x);
}

// Hash determinístico em [0,1) — mesmo padrão comum de "noise" via seno, só
// pra dar variedade estável (sem Math.random, sem estado) a partir de um número.
function noise(seed: number): number {
  return frac(Math.sin(seed) * 43758.5453);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// Offset fixo por paciente (não varia com t) — dá variedade de paciente pra
// paciente sem precisar guardar nada no estado, só o hash do id.
function patientOffset(seed: number, salt: number, amplitude: number): number {
  return amplitude * (2 * noise(seed * 0.0001 + salt) - 1);
}

// Oscilação lenta (variabilidade natural do paciente ao longo do tempo).
const SLOW_PERIOD_MS = 25 * 60_000;

function slowWave(seed: number, salt: number, t: number, amplitude: number): number {
  const phase = noise(seed + salt * 13.7) * Math.PI * 2;
  return amplitude * Math.sin((t / SLOW_PERIOD_MS) * 2 * Math.PI + phase);
}

// Ruído fino que muda a cada leitura (1/min) — é o que faz os cartões "avançarem"
// a cada tick do simulador, igual ao resto do app.
function jitter(seed: number, salt: number, t: number, amplitude: number): number {
  return amplitude * (2 * noise(seed * 0.001 + salt * 7.13 + t / 60_000) - 1);
}

export interface VentParams {
  pip: number;    // cmH2O — Pressão de Pico
  peep: number;   // cmH2O — Pressão Expiratória Final Positiva
  vte: number;    // mL — Volume Corrente Expirado
  vti: number;    // mL — Volume Corrente Inspirado
  r: number;      // cmH2O/L/s — Resistência
  cdin: number;   // mL/cmH2O — Complacência Dinâmica (derivado: vte / (pip - peep))
  vmExp: number;  // L/min — Volume Minuto Expirado (derivado: vte * fr / 1000)
  fuga: number;   // % — Vazamento
  fr: number;     // rpm — Frequência Respiratória (ventilador)
  fio2: number;   // % — Fração Inspirada de Oxigênio
  ie: string;     // relação Inspiração:Expiração (fixa nesta simulação)
  etco2: number;  // mmHg — CO2 Expirado Final
}

export interface VentSeriesPoint extends VentParams {
  t: number;
  paw: number;    // cmH2O — Pressão de Vias Aéreas (ponto da curva)
  flow: number;   // L/min — Fluxo (ponto da curva, + inspiração / - expiração)
  volume: number; // mL — Volume Corrente (ponto da curva)
}

// Parâmetros "lentos" — baseline por paciente + variabilidade natural + ruído por
// leitura. Pip/Peep/VTe/Fuga/R/FR/FiO2/EtCO2 são a fonte de verdade; Cdin, VMexp e
// VTi são sempre derivados deles pra manter coerência clínica (nunca sorteados à parte).
export function computeVentParams(internacaoId: string, t: number): VentParams {
  const seed = hashSeed(internacaoId);

  const peep = clamp(
    7 + patientOffset(seed, 1, 1.2) + slowWave(seed, 1, t, 0.5) + jitter(seed, 1, t, 0.15),
    3, 12
  );
  const pip = clamp(
    22 + patientOffset(seed, 2, 4) + slowWave(seed, 2, t, 2) + jitter(seed, 2, t, 0.5),
    peep + 8, 38
  );
  const vte = clamp(
    480 + patientOffset(seed, 3, 60) + slowWave(seed, 3, t, 25) + jitter(seed, 3, t, 8),
    320, 580
  );
  const fuga = clamp(
    3 + Math.abs(patientOffset(seed, 4, 3)) + Math.abs(slowWave(seed, 4, t, 2)) + Math.abs(jitter(seed, 4, t, 1)),
    0, 25
  );
  const vti = vte / (1 - fuga / 100);
  const r = clamp(
    10 + patientOffset(seed, 5, 4) + slowWave(seed, 5, t, 2) + jitter(seed, 5, t, 0.6),
    4, 26
  );
  const fr = clamp(
    16 + patientOffset(seed, 6, 3) + slowWave(seed, 6, t, 2) + jitter(seed, 6, t, 0.5),
    8, 32
  );
  const fio2 = clamp(
    35 + Math.abs(patientOffset(seed, 7, 15)) + Math.abs(slowWave(seed, 7, t, 8)),
    21, 100
  );
  const etco2 = clamp(
    38 + patientOffset(seed, 8, 4) + slowWave(seed, 8, t, 3) + jitter(seed, 8, t, 1),
    20, 60
  );

  return {
    pip: round1(pip),
    peep: round1(peep),
    vte: Math.round(vte),
    vti: Math.round(vti),
    r: round1(r),
    cdin: round1(vte / (pip - peep)),
    vmExp: round1((vte * fr) / 1000),
    fuga: round1(fuga),
    fr: Math.round(fr),
    fio2: Math.round(fio2),
    ie: "1:2",
    etco2: Math.round(etco2),
  };
}

const CYCLE_MS = 6 * 60_000; // macro-ciclo visual — ver nota no topo do arquivo
const INSP_FRACTION = 1 / 3; // I:E ~1:2

function peakInspFlow(params: VentParams): number {
  return 35 + ((params.vte - 480) / 480) * 12;
}

function peakExpFlow(params: VentParams): number {
  return 28 + ((params.vte - 480) / 480) * 10;
}

function computeVentWavePoint(
  params: VentParams,
  internacaoId: string,
  t: number
): { paw: number; flow: number; volume: number } {
  const seed = hashSeed(internacaoId);
  const cyclePos = ((t % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  const phase01 = cyclePos / CYCLE_MS;
  const { peep, pip, vte } = params;

  let paw: number, flow: number, volume: number;

  if (phase01 < INSP_FRACTION) {
    // Inspiração: pressão sobe (côncava) de PEEP a PIP, fluxo positivo, volume
    // sobe quase linear (dente de serra) até o VT alvo.
    const p = phase01 / INSP_FRACTION;
    paw = peep + (pip - peep) * Math.pow(p, 0.6);
    flow = peakInspFlow(params) * Math.sin(Math.PI * p);
    volume = vte * p;
  } else {
    // Expiração: pressão decai de volta a PEEP, fluxo negativo, volume decai.
    const p = (phase01 - INSP_FRACTION) / (1 - INSP_FRACTION);
    paw = peep + (pip - peep) * Math.exp(-5 * p);
    flow = -peakExpFlow(params) * Math.sin(Math.PI * p);
    volume = vte * Math.exp(-4 * p);
  }

  const jit = 1 + jitter(seed, 9, t, 0.03);
  return {
    paw: round1(paw * jit),
    flow: round1(flow * jit),
    volume: Math.round(volume * jit),
  };
}

export function buildVentSeries(internacaoId: string, readings: RawReading[]): VentSeriesPoint[] {
  return readings.map((r) => {
    const params = computeVentParams(internacaoId, r.t);
    const wave = computeVentWavePoint(params, internacaoId, r.t);
    return { t: r.t, ...params, ...wave };
  });
}

// ─── Severidade visual por parâmetro (mesmo padrão de lib/vitalSeverity.ts) ────
// 0 = normal, 1 = atenção, 2 = crítico. Faixas de referência clínica padrão,
// independentes do Escore MEWS (que não cobre ventilação mecânica).

export type VentParamKey =
  | "pip" | "peep" | "vte" | "vti" | "cdin" | "r" | "vmExp" | "fuga" | "fr" | "fio2" | "etco2";

export function ventSeverity(key: VentParamKey, value: number): number {
  switch (key) {
    case "pip":
      if (value >= 35) return 2;
      if (value >= 30 || value < 15) return 1;
      return 0;
    case "peep":
      if (value < 3 || value > 12) return 2;
      if (value < 5 || value > 10) return 1;
      return 0;
    case "vte":
    case "vti":
      if (value < 300 || value > 600) return 2;
      if (value < 350 || value > 550) return 1;
      return 0;
    case "cdin":
      if (value < 20) return 2;
      if (value < 30) return 1;
      return 0;
    case "r":
      if (value >= 20) return 2;
      if (value >= 15) return 1;
      return 0;
    case "vmExp":
      if (value < 4 || value > 10) return 2;
      if (value < 5 || value > 8) return 1;
      return 0;
    case "fuga":
      if (value > 20) return 2;
      if (value > 10) return 1;
      return 0;
    case "fr":
      if (value <= 8 || value >= 28) return 2;
      if (value < 12 || value > 20) return 1;
      return 0;
    case "fio2":
      if (value > 80) return 2;
      if (value > 60) return 1;
      return 0;
    case "etco2":
      if (value < 30 || value > 50) return 2;
      if (value < 35 || value > 45) return 1;
      return 0;
    default:
      return 0;
  }
}
