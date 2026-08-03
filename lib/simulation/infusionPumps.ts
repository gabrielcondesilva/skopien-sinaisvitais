// ─── Dados de Bombas de Infusão — gerador puro e determinístico ───────────────
// Mesmo padrão de lib/simulation/ventilator.ts (ADR-0002): sem backend, tudo
// derivado só de (internacaoId, t). Cada internação "usa" um subconjunto fixo
// de drogas do catálogo (escolhido por hash do id), com taxa (mL/h) que varia
// lentamente ao longo do tempo — a dose exibida é derivada da taxa por um fator
// fixo por droga (aproximação só pra fins de demonstração, não é cálculo
// farmacológico real).

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

const SLOW_PERIOD_MS = 20 * 60_000;

function slowWave(seed: number, salt: number, t: number, amplitude: number): number {
  const phase = noise(seed + salt * 13.7) * Math.PI * 2;
  return amplitude * Math.sin((t / SLOW_PERIOD_MS) * 2 * Math.PI + phase);
}

function jitter(seed: number, salt: number, t: number, amplitude: number): number {
  return amplitude * (2 * noise(seed * 0.001 + salt * 7.13 + t / 60_000) - 1);
}

interface DrugDef {
  name: string;
  concentration: string;
  doseUnit: string;
  rateMin: number;
  rateBaseline: number;
  rateMax: number;
  doseFactor: number; // dose por 1 mL/h (aproximação, só pra exibição)
}

const DRUG_CATALOG: DrugDef[] = [
  { name: "Noradrenalina", concentration: "50 mL · 8 mg/50mL",     doseUnit: "mcg/kg/min", rateMin: 1,   rateBaseline: 6,    rateMax: 15, doseFactor: 0.031 },
  { name: "Propofol",      concentration: "50 mL · 1% (10mg/mL)",  doseUnit: "mg/kg/h",    rateMin: 5,   rateBaseline: 14,   rateMax: 25, doseFactor: 0.143 },
  { name: "Fentanil",      concentration: "50 mL · 50mcg/mL",      doseUnit: "mcg/kg/h",   rateMin: 1,   rateBaseline: 4.5,  rateMax: 8,  doseFactor: 0.289 },
  { name: "Vasopressina",  concentration: "50 mL · 20 UI/50mL",    doseUnit: "UI/min",     rateMin: 0.5, rateBaseline: 2.4,  rateMax: 5,  doseFactor: 0.0083 },
  { name: "Dobutamina",    concentration: "50 mL · 250mg/50mL",    doseUnit: "mcg/kg/min", rateMin: 2,   rateBaseline: 10,   rateMax: 20, doseFactor: 0.07 },
  { name: "Midazolam",     concentration: "50 mL · 50mg/50mL",     doseUnit: "mg/h",       rateMin: 1,   rateBaseline: 5,    rateMax: 10, doseFactor: 1.0 },
];

// Cores de acento por índice da bomba (ciclo), só decorativo — mesmo espírito
// das cores de status já usadas no app.
export const PUMP_ACCENT_COLORS = ["#f43f5e", "#a855f7", "#f97316", "#3b82f6", "#22c55e", "#eab308"];

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

function formatDose(dose: number): number {
  return dose < 1 ? Math.round(dose * 100) / 100 : Math.round(dose * 10) / 10;
}

// Quantidade de drogas ativas não varia com t — exposto à parte pra quem só
// precisa do total (ex.: badge do painel) sem montar a lista inteira.
export function infusionPumpCount(internacaoId: string): number {
  return 3 + (Math.abs(hashSeed(internacaoId)) % 2);
}

// 3 ou 4 drogas ativas por internação (variedade estável, sem sortear a cada render).
// `admittedAt` ancora a Data de Início de cada droga: sempre entre a admissão e
// agora (t), numa fração estável por bomba — não pode cair no futuro nem
// "andar" conforme t avança dentro da mesma sessão de demo.
export function computeInfusionPumps(internacaoId: string, t: number, admittedAt: number): InfusionPump[] {
  const seed = hashSeed(internacaoId);
  const count = infusionPumpCount(internacaoId);
  const start = Math.abs(seed >> 3) % DRUG_CATALOG.length;

  return Array.from({ length: count }, (_, i) => {
    const drugIndex = (start + i) % DRUG_CATALOG.length;
    const def = DRUG_CATALOG[drugIndex];

    const rate = clamp(
      def.rateBaseline + slowWave(seed, drugIndex + 1, t, (def.rateMax - def.rateMin) * 0.15) + jitter(seed, drugIndex + 1, t, (def.rateMax - def.rateMin) * 0.04),
      def.rateMin, def.rateMax
    );
    const rateRounded = Math.round(rate * 10) / 10;

    const startFrac = 0.05 + noise(seed + drugIndex * 19.1) * 0.55;
    const startedAt = admittedAt + (t - admittedAt) * startFrac;

    return {
      id: `B${i + 1}`,
      drug: def.name,
      concentration: def.concentration,
      rateMlH: rateRounded,
      dose: formatDose(rateRounded * def.doseFactor),
      doseUnit: def.doseUnit,
      accentColor: PUMP_ACCENT_COLORS[i % PUMP_ACCENT_COLORS.length],
      startedAt,
    };
  });
}
