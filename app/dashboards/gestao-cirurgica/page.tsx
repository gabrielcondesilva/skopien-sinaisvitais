"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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

type Delay    = 0 | 1 | 2;            // 0=ok, 1=atenção, 2=atrasado
type ViewMode = "realtime" | "historico";
type RowType  = "realizada" | "andamento" | "agendada";

interface TimestampCell {
  value: string;
  delay: Delay;
}

interface SurgicalRow {
  type: RowType;
  paciente: string;
  procedimento: string;
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
}

function ts(value: string, delay: Delay): TimestampCell {
  return { value, delay };
}

const DASH = ts("–", 0);

const ROWS: SurgicalRow[] = [
  // ── Realizadas ────────────────────────────────────────────────────────────
  {
    type: "realizada",
    paciente:    "Roberto Fagundes Lima",
    procedimento:"Prostatectomia Radical",
    sala:        "CCCG",
    progInicio:  "07:00",
    entradaCC:   ts("07:05",  0),
    inicioAnest: ts("07:22",  0),
    inicioCirug: ts("07:48",  0),
    fimCirug:    ts("09:30",  0),
    entradaRA:   ts("09:36",  0),
    altaRA:      ts("10:50",  0),
    destino:     ts("11:15",  0),
    duracao:     ts("4h 15min", 0),
    status:      0,
  },
  {
    type: "realizada",
    paciente:    "Ana Cláudia Barbosa",
    procedimento:"Artroscopia de Joelho",
    sala:        "CCAmb",
    progInicio:  "07:00",
    entradaCC:   ts("07:08",  0),
    inicioAnest: ts("07:20",  0),
    inicioCirug: ts("07:40",  0),
    fimCirug:    ts("09:10",  0),
    entradaRA:   ts("09:15",  0),
    altaRA:      ts("10:20",  0),
    destino:     ts("10:45",  0),
    duracao:     ts("3h 45min", 0),
    status:      0,
  },
  {
    type: "realizada",
    paciente:    "Fátima Regina Sousa",
    procedimento:"Histerectomia Total",
    sala:        "CCOB",
    progInicio:  "07:00",
    entradaCC:   ts("07:10",  1),
    inicioAnest: ts("07:28",  1),
    inicioCirug: ts("07:52",  1),
    fimCirug:    ts("09:45",  0),
    entradaRA:   ts("09:50",  0),
    altaRA:      ts("10:55",  0),
    destino:     ts("11:20",  2),
    duracao:     ts("4h 20min", 1),
    status:      1,
  },
  {
    type: "realizada",
    paciente:    "Carlos Eduardo Mota",
    procedimento:"Bypass Coronariano",
    sala:        "CCEsp",
    progInicio:  "07:00",
    entradaCC:   ts("07:15",  1),
    inicioAnest: ts("07:38",  1),
    inicioCirug: ts("08:10",  1),
    fimCirug:    ts("12:30",  0),
    entradaRA:   ts("12:40",  0),
    altaRA:      ts("14:20",  0),
    destino:     ts("15:00",  2),
    duracao:     ts("8h 00min", 2),
    status:      2,
  },
  // ── Em andamento (aparecem no Tempo Real) ─────────────────────────────────
  {
    type: "andamento",
    paciente:    "Maurício Pinto Azevedo",
    procedimento:"Colecistectomia Laparoscópica",
    sala:        "CCCG",
    progInicio:  "09:00",
    entradaCC:   ts("09:03",  0),
    inicioAnest: ts("09:18",  0),
    inicioCirug: ts("09:42",  0),
    fimCirug:    ts("Pendente", 0),
    entradaRA:   DASH,
    altaRA:      DASH,
    destino:     ts("Pendente", 0),
    duracao:     ts("Em andamento", 1),
    status:      1,
  },
  {
    type: "andamento",
    paciente:    "Juliana Mendes Freitas",
    procedimento:"Cesariana Eletiva",
    sala:        "CCOB",
    progInicio:  "08:30",
    entradaCC:   ts("08:34",  0),
    inicioAnest: ts("08:48",  0),
    inicioCirug: ts("09:10",  0),
    fimCirug:    ts("Pendente", 0),
    entradaRA:   DASH,
    altaRA:      DASH,
    destino:     ts("Pendente", 0),
    duracao:     ts("Em andamento", 0),
    status:      0,
  },
  {
    type: "andamento",
    paciente:    "Gustavo Henrique Leal",
    procedimento:"Herniorrafia Inguinal",
    sala:        "CCAmb",
    progInicio:  "07:30",
    entradaCC:   ts("07:52",  1),
    inicioAnest: ts("08:15",  1),
    inicioCirug: ts("08:35",  1),
    fimCirug:    ts("09:50",  0),
    entradaRA:   ts("09:55",  0),
    altaRA:      ts("Pendente", 0),
    destino:     ts("Pendente", 0),
    duracao:     ts("Em andamento", 1),
    status:      1,
  },
  {
    type: "andamento",
    paciente:    "Neide Aparecida Cunha",
    procedimento:"Tireoidectomia Total",
    sala:        "CCEsp",
    progInicio:  "10:30",
    entradaCC:   ts("10:33",  0),
    inicioAnest: ts("Pendente", 0),
    inicioCirug: ts("Pendente", 0),
    fimCirug:    ts("Pendente", 0),
    entradaRA:   ts("Pendente", 0),
    altaRA:      ts("Pendente", 0),
    destino:     ts("Pendente", 0),
    duracao:     ts("Em andamento", 0),
    status:      0,
  },
  // ── Agendadas (ainda não iniciadas) ───────────────────────────────────────
  {
    type: "agendada",
    paciente:    "Beatriz Santos Oliveira",
    procedimento:"Colectomia Parcial",
    sala:        "CCCG",
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
    sala:        "CCAmb",
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
    sala:        "CCOB",
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
    sala:        "CCEsp",
    progInicio:  "14:30",
    entradaCC:   DASH, inicioAnest: DASH, inicioCirug: DASH,
    fimCirug:    DASH, entradaRA:   DASH, altaRA:      DASH,
    destino:     DASH, duracao:     DASH,
    status:      0,
  },
];

const DELAY_BG: Record<Delay, string> = {
  0: "rgba(34,197,94,0.08)",
  1: "rgba(234,179,8,0.12)",
  2: "rgba(239,68,68,0.14)",
};

const DELAY_COLOR: Record<Delay, string> = {
  0: "var(--status-stable)",
  1: "var(--status-attention)",
  2: "var(--status-critical)",
};

const DELAY_LABEL: Record<Delay, string> = {
  0: "No prazo",
  1: "Atenção",
  2: "Atrasado",
};

const COL_HEADERS = [
  "Paciente",
  "Procedimento",
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

const STEP_KEYS: Array<keyof Pick<SurgicalRow, "entradaCC"|"inicioAnest"|"inicioCirug"|"fimCirug"|"entradaRA"|"altaRA"|"destino">> = [
  "entradaCC", "inicioAnest", "inicioCirug", "fimCirug", "entradaRA", "altaRA", "destino",
];

function getCurrentStepIndex(row: SurgicalRow): number {
  for (let i = 0; i < STEP_KEYS.length; i++) {
    const cell = row[STEP_KEYS[i]] as TimestampCell;
    if (cell.value === "Pendente" || cell.value === "–") return i;
  }
  return -1;
}

function Cell({
  cell,
  isCurrent = false,
  isFuture = false,
}: {
  cell: TimestampCell;
  isCurrent?: boolean;
  isFuture?: boolean;
}) {
  if (isFuture) {
    return <td className="px-4 py-3" style={{ background: "var(--surface)" }} />;
  }
  if (isCurrent) {
    return (
      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ background: "var(--surface)" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          border: "1px solid #3b82f6", borderRadius: 6,
          padding: "2px 10px", color: "#3b82f6",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block", flexShrink: 0 }} />
          Em andamento
        </span>
      </td>
    );
  }
  return (
    <td className="px-4 py-3 tabular-nums text-sm whitespace-nowrap"
      style={{ background: DELAY_BG[cell.delay], color: DELAY_COLOR[cell.delay] }}>
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

  const displayRows = mode === "realtime"
    ? ROWS.filter((r) => r.type === "andamento")
    : ROWS;

  const statusSource = mode === "realtime" ? displayRows : realizadasRows;
  const onTime  = statusSource.filter((r) => r.status === 0).length;
  const atencao = statusSource.filter((r) => r.status === 1).length;
  const delayed = statusSource.filter((r) => r.status === 2).length;

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
        <div style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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
            {([
              { label: "No prazo", count: onTime,  delay: 0 },
              { label: "Atenção",  count: atencao, delay: 1 },
              { label: "Atrasado", count: delayed, delay: 2 },
            ] as { label: string; count: number; delay: Delay }[]).map((s) => (
              <span key={s.label} className="text-sm font-semibold px-4 py-1.5 rounded-full"
                style={{ background: DELAY_BG[s.delay], color: DELAY_COLOR[s.delay] }}>
                {s.count} {s.label}
              </span>
            ))}

            {/* View mode toggle */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 2, border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
              {(["realtime", "historico"] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 6,
                  border: "none", cursor: "pointer",
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "#fff" : "var(--muted)",
                  transition: "all 0.15s",
                }}>
                  {m === "realtime" ? "Tempo Real" : "Histórico"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, minHeight: 0, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
            <div style={{ height: "100%", overflowX: "auto", overflowY: "auto" }}>
              <table className="w-full border-collapse" style={{ fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.30)" }}>
                    {COL_HEADERS.map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                        style={{ color: "var(--foreground)", borderBottom: "1px solid var(--border)", fontSize: 13, letterSpacing: "0.01em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => {
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
                              isCurrent={mode === "realtime" && si === currentIdx}
                              isFuture={mode === "realtime" && currentIdx >= 0 && si > currentIdx}
                            />
                          )
                        )}

                        {/* Duração */}
                        {showDash ? <DashCell /> : <Cell cell={row.duracao} />}

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
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-5 shrink-0" style={{ color: "var(--muted)", fontSize: 13 }}>
            {([0, 1, 2] as Delay[]).map((d) => (
              <span key={d} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: DELAY_BG[d] }} />
                <span style={{ color: DELAY_COLOR[d] }}>{DELAY_LABEL[d]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
