"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── types & data ─────────────────────────────────────────────────────────────

type Delay    = 0 | 1;                // 0=no prazo, 1=atrasado
type ViewMode = "realtime" | "historico" | "analise";
type RowType  = "realizada" | "andamento" | "agendada";

interface TimestampCell {
  value: string;
}

interface SurgicalRow {
  type: RowType;
  paciente: string;
  procedimento: string;
  medico: string;
  sala: string;
  progInicio: string;
  entradaCC: TimestampCell;
  inicioAnest: TimestampCell;
  inicioCirug: TimestampCell;
  fimCirug: TimestampCell;
  entradaRA: TimestampCell;
  altaRA: TimestampCell;
  destino: TimestampCell;
  duracao: TimestampCell;
  status: Delay;
  // etapa ilustrativa apontada como causa do atraso — mock; a regra real ainda será definida com a equipe
  delayStep?: string;
}

// atraso cirúrgico = entrada no CC mais de 15min após o horário programado
const DELAY_THRESHOLD_MIN = 15;

function toMinutes(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function computeDelay(scheduled: string, actual: string): Delay {
  const s = toMinutes(scheduled);
  const a = toMinutes(actual);
  if (s === null || a === null) return 0;
  return a - s > DELAY_THRESHOLD_MIN ? 1 : 0;
}

function ts(value: string): TimestampCell {
  return { value };
}

const DASH = ts("–");

const ROWS: SurgicalRow[] = [
  // ── Realizadas ────────────────────────────────────────────────────────────
  {
    type: "realizada",
    paciente:    "Roberto Fagundes Lima",
    procedimento:"Prostatectomia Radical",
    medico:      "Dr. Alexandre Faria",
    sala:        "CC01",
    progInicio:  "07:00",
    entradaCC:   ts("07:05"),
    inicioAnest: ts("07:22"),
    inicioCirug: ts("07:48"),
    fimCirug:    ts("09:30"),
    entradaRA:   ts("09:36"),
    altaRA:      ts("10:50"),
    destino:     ts("11:15"),
    duracao:     ts("4h 15min"),
    status:      computeDelay("07:00", "07:05"),
  },
  {
    type: "realizada",
    paciente:    "Ana Cláudia Barbosa",
    procedimento:"Artroscopia de Joelho",
    medico:      "Dra. Camila Borges",
    sala:        "CC03",
    progInicio:  "07:00",
    entradaCC:   ts("07:08"),
    inicioAnest: ts("07:20"),
    inicioCirug: ts("07:40"),
    fimCirug:    ts("09:10"),
    entradaRA:   ts("09:15"),
    altaRA:      ts("10:20"),
    destino:     ts("10:45"),
    duracao:     ts("3h 45min"),
    status:      computeDelay("07:00", "07:08"),
  },
  {
    type: "realizada",
    paciente:    "Fátima Regina Sousa",
    procedimento:"Histerectomia Total",
    medico:      "Dra. Beatriz Andrade",
    sala:        "CC02",
    progInicio:  "07:00",
    entradaCC:   ts("07:10"),
    inicioAnest: ts("07:28"),
    inicioCirug: ts("07:52"),
    fimCirug:    ts("09:45"),
    entradaRA:   ts("09:50"),
    altaRA:      ts("10:55"),
    destino:     ts("11:20"),
    duracao:     ts("4h 20min"),
    status:      computeDelay("07:00", "07:10"),
  },
  {
    type: "realizada",
    paciente:    "Carlos Eduardo Mota",
    procedimento:"Bypass Coronariano",
    medico:      "Dr. Marcelo Tavares",
    sala:        "CC04",
    progInicio:  "07:00",
    entradaCC:   ts("07:20"),
    inicioAnest: ts("07:38"),
    inicioCirug: ts("08:10"),
    fimCirug:    ts("12:30"),
    entradaRA:   ts("12:40"),
    altaRA:      ts("14:20"),
    destino:     ts("15:00"),
    duracao:     ts("8h 00min"),
    status:      computeDelay("07:00", "07:20"),
    delayStep:   "Entrada CC",
  },
  {
    type: "realizada",
    paciente:    "Eduardo Lima Castro",
    procedimento:"Artroscopia de Joelho",
    medico:      "Dra. Camila Borges",
    sala:        "CC03",
    progInicio:  "07:30",
    entradaCC:   ts("07:36"),
    inicioAnest: ts("07:50"),
    inicioCirug: ts("08:10"),
    fimCirug:    ts("09:35"),
    entradaRA:   ts("09:40"),
    altaRA:      ts("10:40"),
    destino:     ts("11:05"),
    duracao:     ts("3h 35min"),
    status:      computeDelay("07:30", "07:36"),
  },
  {
    type: "realizada",
    paciente:    "Sônia Maria Pires",
    procedimento:"Colecistectomia Laparoscópica",
    medico:      "Dr. Fernando Castro",
    sala:        "CC01",
    progInicio:  "08:00",
    entradaCC:   ts("08:07"),
    inicioAnest: ts("08:22"),
    inicioCirug: ts("08:45"),
    fimCirug:    ts("10:15"),
    entradaRA:   ts("10:20"),
    altaRA:      ts("11:25"),
    destino:     ts("11:50"),
    duracao:     ts("3h 50min"),
    status:      computeDelay("08:00", "08:07"),
  },
  {
    type: "realizada",
    paciente:    "Marcos Paulo Andrade",
    procedimento:"Histerectomia Total",
    medico:      "Dra. Beatriz Andrade",
    sala:        "CC02",
    progInicio:  "08:00",
    entradaCC:   ts("08:25"),
    inicioAnest: ts("08:50"),
    inicioCirug: ts("09:15"),
    fimCirug:    ts("11:10"),
    entradaRA:   ts("11:15"),
    altaRA:      ts("12:20"),
    destino:     ts("12:45"),
    duracao:     ts("4h 20min"),
    status:      computeDelay("08:00", "08:25"),
    delayStep:   "Início Anestesia",
  },
  {
    type: "realizada",
    paciente:    "Renata Silva Brito",
    procedimento:"Apendicectomia",
    medico:      "Dr. Henrique Salles",
    sala:        "CC03",
    progInicio:  "09:00",
    entradaCC:   ts("09:05"),
    inicioAnest: ts("09:20"),
    inicioCirug: ts("09:40"),
    fimCirug:    ts("10:50"),
    entradaRA:   ts("10:55"),
    altaRA:      ts("11:55"),
    destino:     ts("12:20"),
    duracao:     ts("3h 15min"),
    status:      computeDelay("09:00", "09:05"),
  },
  {
    type: "realizada",
    paciente:    "Vitor Hugo Ramos",
    procedimento:"Colecistectomia Laparoscópica",
    medico:      "Dr. Fernando Castro",
    sala:        "CC01",
    progInicio:  "10:00",
    entradaCC:   ts("10:08"),
    inicioAnest: ts("10:22"),
    inicioCirug: ts("10:50"),
    fimCirug:    ts("12:20"),
    entradaRA:   ts("12:25"),
    altaRA:      ts("13:30"),
    destino:     ts("13:55"),
    duracao:     ts("3h 55min"),
    status:      computeDelay("10:00", "10:08"),
    delayStep:   "Início Cirurgia",
  },
  {
    type: "realizada",
    paciente:    "Isabela Cristina Moura",
    procedimento:"Prostatectomia Radical",
    medico:      "Dr. Alexandre Faria",
    sala:        "CC04",
    progInicio:  "10:30",
    entradaCC:   ts("10:38"),
    inicioAnest: ts("10:55"),
    inicioCirug: ts("11:20"),
    fimCirug:    ts("13:05"),
    entradaRA:   ts("13:10"),
    altaRA:      ts("14:25"),
    destino:     ts("14:50"),
    duracao:     ts("4h 12min"),
    status:      computeDelay("10:30", "10:38"),
  },
  {
    type: "realizada",
    paciente:    "Thiago Almeida Souza",
    procedimento:"Bypass Coronariano",
    medico:      "Dr. Marcelo Tavares",
    sala:        "CC04",
    progInicio:  "11:00",
    entradaCC:   ts("11:20"),
    inicioAnest: ts("11:42"),
    inicioCirug: ts("12:15"),
    fimCirug:    ts("16:30"),
    entradaRA:   ts("16:40"),
    altaRA:      ts("18:20"),
    destino:     ts("19:00"),
    duracao:     ts("7h 40min"),
    status:      computeDelay("11:00", "11:20"),
    delayStep:   "Entrada RA",
  },
  {
    type: "realizada",
    paciente:    "Larissa Gomes Pinto",
    procedimento:"Cesariana Eletiva",
    medico:      "Dra. Renata Campos",
    sala:        "CC02",
    progInicio:  "11:30",
    entradaCC:   ts("11:36"),
    inicioAnest: ts("11:50"),
    inicioCirug: ts("12:10"),
    fimCirug:    ts("13:20"),
    entradaRA:   ts("13:25"),
    altaRA:      ts("14:30"),
    destino:     ts("14:55"),
    duracao:     ts("3h 25min"),
    status:      computeDelay("11:30", "11:36"),
  },
  {
    type: "realizada",
    paciente:    "Bruno Cardoso Lima",
    procedimento:"Herniorrafia Inguinal",
    medico:      "Dr. Paulo Silveira",
    sala:        "CC03",
    progInicio:  "13:00",
    entradaCC:   ts("13:22"),
    inicioAnest: ts("13:40"),
    inicioCirug: ts("14:00"),
    fimCirug:    ts("15:10"),
    entradaRA:   ts("15:15"),
    altaRA:      ts("16:10"),
    destino:     ts("16:35"),
    duracao:     ts("3h 35min"),
    status:      computeDelay("13:00", "13:22"),
    delayStep:   "Entrada CC",
  },
  {
    type: "realizada",
    paciente:    "Camila Rezende Tavares",
    procedimento:"Apendicectomia",
    medico:      "Dr. Henrique Salles",
    sala:        "CC03",
    progInicio:  "13:30",
    entradaCC:   ts("13:50"),
    inicioAnest: ts("14:15"),
    inicioCirug: ts("14:35"),
    fimCirug:    ts("15:45"),
    entradaRA:   ts("15:50"),
    altaRA:      ts("16:50"),
    destino:     ts("17:15"),
    duracao:     ts("3h 25min"),
    status:      computeDelay("13:30", "13:50"),
    delayStep:   "Início Anestesia",
  },
  // ── Em andamento (aparecem no Tempo Real) ─────────────────────────────────
  {
    type: "andamento",
    paciente:    "Maurício Pinto Azevedo",
    procedimento:"Colecistectomia Laparoscópica",
    medico:      "Dr. Fernando Castro",
    sala:        "CC01",
    progInicio:  "09:00",
    entradaCC:   ts("09:03"),
    inicioAnest: ts("09:18"),
    inicioCirug: ts("09:42"),
    fimCirug:    ts("Pendente"),
    entradaRA:   DASH,
    altaRA:      DASH,
    destino:     ts("Pendente"),
    duracao:     ts("Em andamento"),
    status:      computeDelay("09:00", "09:03"),
  },
  {
    type: "andamento",
    paciente:    "Juliana Mendes Freitas",
    procedimento:"Cesariana Eletiva",
    medico:      "Dra. Renata Campos",
    sala:        "CC02",
    progInicio:  "08:30",
    entradaCC:   ts("08:34"),
    inicioAnest: ts("08:48"),
    inicioCirug: ts("09:10"),
    fimCirug:    ts("Pendente"),
    entradaRA:   DASH,
    altaRA:      DASH,
    destino:     ts("Pendente"),
    duracao:     ts("Em andamento"),
    status:      computeDelay("08:30", "08:34"),
  },
  {
    type: "andamento",
    paciente:    "Gustavo Henrique Leal",
    procedimento:"Herniorrafia Inguinal",
    medico:      "Dr. Paulo Silveira",
    sala:        "CC03",
    progInicio:  "07:30",
    entradaCC:   ts("07:52"),
    inicioAnest: ts("08:15"),
    inicioCirug: ts("08:35"),
    fimCirug:    ts("09:50"),
    entradaRA:   ts("09:55"),
    altaRA:      ts("Pendente"),
    destino:     ts("Pendente"),
    duracao:     ts("Em andamento"),
    status:      computeDelay("07:30", "07:52"),
  },
  {
    type: "andamento",
    paciente:    "Neide Aparecida Cunha",
    procedimento:"Tireoidectomia Total",
    medico:      "Dr. Ricardo Nogueira",
    sala:        "CC04",
    progInicio:  "10:30",
    entradaCC:   ts("10:33"),
    inicioAnest: ts("Pendente"),
    inicioCirug: ts("Pendente"),
    fimCirug:    ts("Pendente"),
    entradaRA:   ts("Pendente"),
    altaRA:      ts("Pendente"),
    destino:     ts("Pendente"),
    duracao:     ts("Em andamento"),
    status:      computeDelay("10:30", "10:33"),
  },
  // ── Agendadas (ainda não iniciadas) ───────────────────────────────────────
  {
    type: "agendada",
    paciente:    "Beatriz Santos Oliveira",
    procedimento:"Colectomia Parcial",
    medico:      "Dr. Alexandre Faria",
    sala:        "CC01",
    progInicio:  "13:00",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
  {
    type: "agendada",
    paciente:    "Rodrigo Fernandes Costa",
    procedimento:"Apendicectomia",
    medico:      "Dra. Camila Borges",
    sala:        "CC03",
    progInicio:  "13:30",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
  {
    type: "agendada",
    paciente:    "Maria Luiza Pereira",
    procedimento:"Mastectomia Conservadora",
    medico:      "Dra. Patrícia Souza Lima",
    sala:        "CC02",
    progInicio:  "14:00",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
  {
    type: "agendada",
    paciente:    "José Antonio Ribeiro",
    procedimento:"Prótese Total de Quadril",
    medico:      "Dr. Henrique Salles",
    sala:        "CC04",
    progInicio:  "14:30",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
  {
    type: "agendada",
    paciente:    "Patrícia Helena Souza",
    procedimento:"Colectomia Parcial",
    medico:      "Dr. Alexandre Faria",
    sala:        "CC01",
    progInicio:  "15:00",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
  {
    type: "agendada",
    paciente:    "Rafael Augusto Lima",
    procedimento:"Apendicectomia",
    medico:      "Dra. Camila Borges",
    sala:        "CC03",
    progInicio:  "15:30",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
  {
    type: "agendada",
    paciente:    "Fernanda Beatriz Costa",
    procedimento:"Tireoidectomia Total",
    medico:      "Dr. Ricardo Nogueira",
    sala:        "CC04",
    progInicio:  "16:00",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
  {
    type: "agendada",
    paciente:    "Gabriel Henrique Souza",
    procedimento:"Artroscopia de Joelho",
    medico:      "Dra. Camila Borges",
    sala:        "CC03",
    progInicio:  "16:30",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
];

const DELAY_BG: Record<Delay, string> = {
  0: "rgba(34,197,94,0.08)",
  1: "rgba(239,68,68,0.14)",
};

const DELAY_COLOR: Record<Delay, string> = {
  0: "var(--status-stable)",
  1: "var(--status-critical)",
};

const DELAY_LABEL: Record<Delay, string> = {
  0: "No prazo",
  1: "Atrasado",
};

// ─── analytics do histórico ─────────────────────────────────────────────────────

interface CountItem { name: string; count: number }

function countBy(rows: SurgicalRow[], key: (r: SurgicalRow) => string): CountItem[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

const REALIZADAS_ROWS = ROWS.filter((r) => r.type === "realizada");
const AGENDADAS_ROWS  = ROWS.filter((r) => r.type === "agendada");
const ATRASADAS_ROWS  = REALIZADAS_ROWS.filter((r) => r.status === 1);

const POR_PROCEDIMENTO_REALIZADA = countBy(REALIZADAS_ROWS, (r) => r.procedimento);
const POR_PROCEDIMENTO_AGENDADA  = countBy(AGENDADAS_ROWS,  (r) => r.procedimento);
const POR_MEDICO                 = countBy(REALIZADAS_ROWS, (r) => r.medico);
const POR_ETAPA_ATRASO           = countBy(ATRASADAS_ROWS,  (r) => r.delayStep ?? "Não informado");

function getColHeaders(mode: ViewMode): string[] {
  const headers = [
    "Paciente",
    "Procedimento",
    "Médico Responsável",
    "Sala",
    "Prog. Início",
    "Entrada CC",
    "Início Anest.",
    "Início Cirug.",
    "Fim Cirug.",
    "Entrada RA",
    "Alta RA",
    "Destino",
    "Duração",
    "Status",
  ];
  // em andamento a duração ainda não existe — não faz sentido mostrar "Em andamento" na coluna
  return mode === "realtime" ? headers.filter((h) => h !== "Duração") : headers;
}

const STEP_KEYS: Array<keyof Pick<SurgicalRow, "entradaCC"|"inicioAnest"|"inicioCirug"|"fimCirug"|"entradaRA"|"altaRA"|"destino">> = [
  "entradaCC", "inicioAnest", "inicioCirug", "fimCirug", "entradaRA", "altaRA", "destino",
];

// passo atual = última etapa já realizada (o paciente ainda está nela até a próxima começar)
function getCurrentStepIndex(row: SurgicalRow): number {
  let idx = -1;
  for (let i = 0; i < STEP_KEYS.length; i++) {
    const cell = row[STEP_KEYS[i]] as TimestampCell;
    if (cell.value !== "Pendente" && cell.value !== "–") idx = i;
  }
  return idx;
}

// a cor da célula segue o status da linha — uma cirurgia Atrasada não pode ter etapas em verde
function Cell({
  cell,
  rowDelay,
  isCurrent = false,
  isFuture = false,
}: {
  cell: TimestampCell;
  rowDelay: Delay;
  isCurrent?: boolean;
  isFuture?: boolean;
}) {
  if (isFuture) {
    return <td className="px-4 py-3" style={{ background: "var(--surface)" }} />;
  }
  if (isCurrent) {
    return (
      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ background: "var(--surface)" }}>
        <span className="sk-border-blink tabular-nums font-semibold" style={{
          display: "inline-flex", alignItems: "center",
          padding: "2px 10px", color: "#3b82f6",
        }}>
          {cell.value}
        </span>
      </td>
    );
  }
  return (
    <td className="px-4 py-3 tabular-nums text-sm whitespace-nowrap"
      style={{ background: DELAY_BG[rowDelay], color: DELAY_COLOR[rowDelay] }}>
      {cell.value}
    </td>
  );
}

function DashCell() {
  return (
    <td className="px-4 py-3 tabular-nums text-sm"
      style={{ background: "var(--surface)", color: "var(--muted)" }}>
      –
    </td>
  );
}

// ─── analytics subcomponents ────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, fontSize: 12, color: "var(--foreground)",
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg px-3 py-2 flex flex-col gap-0.5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-lg font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function RankBarChart({ title, data, color }: { title: string; data: CountItem[]; color: string }) {
  return (
    <div className="rounded-lg p-3 flex flex-col"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", height: "100%", minHeight: 0 }}>
      <p className="text-xs font-semibold mb-2 shrink-0" style={{ color: "var(--foreground)" }}>{title}</p>
      <div style={{ flex: 1, minHeight: 0 }}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: "var(--muted)" }}>
            Sem dados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis type="category" dataKey="name" width={230} interval={0} tick={{ fill: "#f7f7f7", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={false} labelStyle={{ color: "#f7f7f7" }} itemStyle={{ color: "#f7f7f7" }} />
              <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="count" position="right" style={{ fill: "#f7f7f7", fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex gap-5 shrink-0" style={{ color: "var(--muted)", fontSize: 13 }}>
      {([0, 1] as Delay[]).map((d) => (
        <span key={d} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: DELAY_BG[d] }} />
          <span style={{ color: DELAY_COLOR[d] }}>{DELAY_LABEL[d]}</span>
        </span>
      ))}
    </div>
  );
}

function SurgicalTable({ rows, mode }: { rows: SurgicalRow[]; mode: ViewMode }) {
  return (
    <table className="w-full border-collapse" style={{ fontSize: 14 }}>
      <thead>
        <tr style={{ background: "rgba(0,0,0,0.30)" }}>
          {getColHeaders(mode).map((h) => (
            <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap"
              style={{ color: "var(--foreground)", borderBottom: "1px solid var(--border)", fontSize: 13, letterSpacing: "0.01em" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isRealized = row.type === "realizada";
          const showDash   = mode === "historico" && !isRealized;
          const currentIdx = !showDash && mode === "realtime" ? getCurrentStepIndex(row) : -1;
          const stepCells  = [
            row.entradaCC, row.inicioAnest, row.inicioCirug,
            row.fimCirug,  row.entradaRA,   row.altaRA, row.destino,
          ];

          return (
            <tr key={row.paciente} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
              <td className="px-4 py-3 font-semibold whitespace-nowrap"
                style={{ background: "var(--surface)", fontSize: 14 }}>
                {row.paciente}
              </td>
              <td className="px-4 py-3 whitespace-nowrap"
                style={{ background: "var(--surface)", fontSize: 14, color: "var(--foreground)" }}>
                {row.procedimento}
              </td>
              <td className="px-4 py-3 whitespace-nowrap"
                style={{ background: "var(--surface)", fontSize: 14, color: "var(--foreground)" }}>
                {row.medico}
              </td>
              <td className="px-4 py-3 font-mono"
                style={{ background: "var(--surface)", fontSize: 14 }}>
                {row.sala}
              </td>
              <td className="px-4 py-3 tabular-nums font-medium"
                style={{ background: "var(--surface)", fontSize: 14, color: "var(--foreground)" }}>
                {row.progInicio}
              </td>

              {/* Step cells */}
              {stepCells.map((cell, si) =>
                showDash ? (
                  <DashCell key={si} />
                ) : (
                  <Cell
                    key={si}
                    cell={cell}
                    rowDelay={row.status}
                    isCurrent={mode === "realtime" && si === currentIdx}
                    isFuture={mode === "realtime" && currentIdx >= 0 && si > currentIdx}
                  />
                )
              )}

              {/* Duração — não exibida em Tempo Real, ainda não existe enquanto a cirurgia está em andamento */}
              {mode === "realtime" ? null : showDash ? <DashCell /> : <Cell cell={row.duracao} rowDelay={row.status} />}

              {/* Status */}
              {showDash ? (
                <td className="px-4 py-3" style={{ background: "var(--surface)" }} />
              ) : (
                <td className="px-4 py-3 font-semibold whitespace-nowrap"
                  style={{ background: DELAY_BG[row.status], color: DELAY_COLOR[row.status], fontSize: 14 }}>
                  {DELAY_LABEL[row.status]}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const VIEW_LABEL: Record<ViewMode, string> = {
  realtime:  "Tempo Real",
  historico: "Histórico",
  analise:   "Análise dos Dados",
};

export default function GestaoCirurgicaPage() {
  const [mode,       setMode]       = useState<ViewMode>("realtime");
  const [lastUpdate, setLastUpdate] = useState(getLastUpdateLabel);

  useEffect(() => {
    const id = setInterval(() => setLastUpdate(getLastUpdateLabel()), 30_000);
    return () => clearInterval(id);
  }, []);

  const realizadasRows = ROWS.filter((r) => r.type === "realizada");
  const agendadas      = ROWS.filter((r) => r.type !== "realizada").length;
  const realizadas     = realizadasRows.length;
  const agendadasOnly  = AGENDADAS_ROWS.length;

  const displayRows = mode === "realtime"
    ? ROWS.filter((r) => r.type === "andamento")
    : ROWS;

  const statusSource = mode === "realtime" ? displayRows : realizadasRows;
  const onTime  = statusSource.filter((r) => r.status === 0).length;
  const delayed = statusSource.filter((r) => r.status === 1).length;

  return (
    <AuthGuard>
      <div style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--background)" }}>
        {/* Top bar */}
        <div
          className="px-6 shrink-0"
          style={{ height: 52, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/command" className="text-xs transition-colors" style={{ color: "#F7F7F7" }}>← Voltar</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Gestão de Atraso Cirúrgico</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>
              Atualizado às: <span style={{ color: "var(--foreground)" }}>{lastUpdate}</span>
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
            <RealtimeClock />
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, minHeight: 0, padding: 14,
          display: "flex", flexDirection: "column", gap: 10,
          overflow: "hidden",
        }}>
          {/* Summary chips + view toggle */}
          <div className="flex gap-3 flex-wrap shrink-0 items-center">
            {mode === "historico" && (
              <>
                <span className="text-sm font-semibold px-4 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)" }}>
                  {agendadas} Agendadas
                </span>
                <span className="text-sm font-semibold px-4 py-1.5 rounded-full"
                  style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
                  {realizadas} Realizadas
                </span>
                <span style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
              </>
            )}
            {mode !== "analise" && ([
              { label: "No prazo", count: onTime,  delay: 0 },
              { label: "Atrasado", count: delayed, delay: 1 },
            ] as { label: string; count: number; delay: Delay }[]).map((s) => (
              <span key={s.label} className="text-sm font-semibold px-4 py-1.5 rounded-full"
                style={{ background: DELAY_BG[s.delay], color: DELAY_COLOR[s.delay] }}>
                {s.count} {s.label}
              </span>
            ))}

            {/* View mode toggle */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 2, border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
              {(["realtime", "historico", "analise"] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 6,
                  border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "#fff" : "var(--muted)",
                  transition: "all 0.15s",
                }}>
                  {VIEW_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          {mode === "analise" ? (
            <>
              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flexShrink: 0 }}>
                <StatCard label="Cirurgias Realizadas" value={realizadas}    color="#38bdf8" />
                <StatCard label="Cirurgias Agendadas"  value={agendadasOnly} color="var(--foreground)" />
                <StatCard label="No Prazo"             value={onTime}        color="var(--status-stable)" />
                <StatCard label="Atrasadas"            value={delayed}       color="var(--status-critical)" />
              </div>

              {/* Gráficos — ocupam o espaço restante, sem altura fixa */}
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  <RankBarChart title="Cirurgias Realizadas por Procedimento" data={POR_PROCEDIMENTO_REALIZADA} color="#38bdf8" />
                  <RankBarChart title="Cirurgias Agendadas por Procedimento"  data={POR_PROCEDIMENTO_AGENDADA}  color="#8b5cf6" />
                </div>
                <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  <RankBarChart title="Médicos que Mais Realizaram Cirurgias" data={POR_MEDICO}       color="#22c55e" />
                  <RankBarChart title="Etapas que Mais Atrasam"               data={POR_ETAPA_ATRASO} color="#ef4444" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Tabela — Tempo Real ou Histórico completo */}
              <div style={{ flex: 1, minHeight: 0, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                <div style={{ height: "100%", overflowX: "auto", overflowY: "auto" }}>
                  <SurgicalTable rows={displayRows} mode={mode} />
                </div>
              </div>
              <Legend />
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
