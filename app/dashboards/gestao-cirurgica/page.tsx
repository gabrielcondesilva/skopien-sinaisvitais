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

type Delay = 0 | 1 | 2; // 0=ok, 1=atenção, 2=atrasado

interface TimestampCell {
  value: string;
  delay: Delay;
}

interface SurgicalRow {
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

const ROWS: SurgicalRow[] = [
  // ── Concluídas mais cedo hoje ─────────────────────────────────────────────
  {
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
  // ── Em andamento agora (espelha o simulador) ──────────────────────────────
  {
    paciente:    "Maurício Pinto Azevedo",   // CCCG — step 1 Procedimento (50%)
    procedimento:"Colecistectomia Laparoscópica",
    sala:        "CCCG",
    progInicio:  "09:00",
    entradaCC:   ts("09:03",  0),
    inicioAnest: ts("09:18",  0),
    inicioCirug: ts("09:42",  0),
    fimCirug:    ts("Pendente", 0),
    entradaRA:   ts("–",  0),
    altaRA:      ts("–",  0),
    destino:     ts("Pendente", 0),
    duracao:     ts("Em andamento", 1),
    status:      1,
  },
  {
    paciente:    "Juliana Mendes Freitas",   // CCOB — step 1 Procedimento (50%)
    procedimento:"Cesariana Eletiva",
    sala:        "CCOB",
    progInicio:  "08:30",
    entradaCC:   ts("08:34",  0),
    inicioAnest: ts("08:48",  0),
    inicioCirug: ts("09:10",  0),
    fimCirug:    ts("Pendente", 0),
    entradaRA:   ts("–",  0),
    altaRA:      ts("–",  0),
    destino:     ts("Pendente", 0),
    duracao:     ts("Em andamento", 0),
    status:      0,
  },
  {
    paciente:    "Gustavo Henrique Leal",    // CCAmb — step 2 RA (75%)
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
    paciente:    "Neide Aparecida Cunha",    // CCEsp — step 0 Admissão (25%)
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

function Cell({ cell }: { cell: TimestampCell }) {
  return (
    <td
      className="px-4 py-3 tabular-nums text-sm whitespace-nowrap"
      style={{ background: DELAY_BG[cell.delay], color: DELAY_COLOR[cell.delay] }}
    >
      {cell.value}
    </td>
  );
}

export default function GestaoCirurgicaPage() {
  const [lastUpdate, setLastUpdate] = useState(getLastUpdateLabel);

  useEffect(() => {
    const id = setInterval(() => setLastUpdate(getLastUpdateLabel()), 30_000);
    return () => clearInterval(id);
  }, []);

  const onTime    = ROWS.filter((r) => r.status === 0).length;
  const atencao   = ROWS.filter((r) => r.status === 1).length;
  const delayed   = ROWS.filter((r) => r.status === 2).length;
  const agendadas = ROWS.length;
  const realizadas = ROWS.filter((r) => r.destino.value !== "Pendente").length;

  return (
    <AuthGuard>
      <div
        style={{
          height: "100vh", overflow: "hidden",
          display: "flex", flexDirection: "column",
          background: "var(--background)",
        }}
      >
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

        {/* Content — fills remaining height */}
        <div
          style={{
            flex: 1, minHeight: 0,
            padding: 16,
            display: "flex", flexDirection: "column", gap: 12,
          }}
        >
          {/* Summary chips */}
          <div className="flex gap-3 flex-wrap shrink-0 items-center">
            <span className="text-sm font-semibold px-4 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)" }}>
              {agendadas} Agendadas
            </span>
            <span className="text-sm font-semibold px-4 py-1.5 rounded-full"
              style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
              {realizadas} Realizadas
            </span>
            <span style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
            {([
              { label: "No prazo", count: onTime,  delay: 0 },
              { label: "Atenção",  count: atencao, delay: 1 },
              { label: "Atrasado", count: delayed, delay: 2 },
            ] as { label: string; count: number; delay: Delay }[]).map((s) => (
              <span
                key={s.label}
                className="text-sm font-semibold px-4 py-1.5 rounded-full"
                style={{ background: DELAY_BG[s.delay], color: DELAY_COLOR[s.delay] }}
              >
                {s.count} {s.label}
              </span>
            ))}
          </div>

          {/* Table — grows to fill space */}
          <div
            style={{
              flex: 1, minHeight: 0,
              borderRadius: 10, overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ height: "100%", overflowX: "auto", overflowY: "auto" }}>
              <table className="w-full border-collapse" style={{ fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.30)" }}>
                    {COL_HEADERS.map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                        style={{
                          color: "var(--foreground)",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 13,
                          letterSpacing: "0.01em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr
                      key={row.paciente}
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                    >
                      {/* Paciente */}
                      <td
                        className="px-4 py-3 font-semibold whitespace-nowrap"
                        style={{ background: "var(--surface)", fontSize: 14 }}
                      >
                        {row.paciente}
                      </td>
                      {/* Procedimento */}
                      <td
                        className="px-4 py-3 whitespace-nowrap"
                        style={{ background: "var(--surface)", fontSize: 14, color: "var(--foreground)" }}
                      >
                        {row.procedimento}
                      </td>
                      {/* Sala */}
                      <td
                        className="px-4 py-3 font-mono"
                        style={{ background: "var(--surface)", fontSize: 14 }}
                      >
                        {row.sala}
                      </td>
                      {/* Prog. Início */}
                      <td
                        className="px-4 py-3 tabular-nums font-medium"
                        style={{ background: "var(--surface)", fontSize: 14, color: "var(--foreground)" }}
                      >
                        {row.progInicio}
                      </td>
                      <Cell cell={row.entradaCC} />
                      <Cell cell={row.inicioAnest} />
                      <Cell cell={row.inicioCirug} />
                      <Cell cell={row.fimCirug} />
                      <Cell cell={row.entradaRA} />
                      <Cell cell={row.altaRA} />
                      <Cell cell={row.destino} />
                      <Cell cell={row.duracao} />
                      <td
                        className="px-4 py-3 font-semibold whitespace-nowrap"
                        style={{
                          background: DELAY_BG[row.status],
                          color: DELAY_COLOR[row.status],
                          fontSize: 14,
                        }}
                      >
                        {DELAY_LABEL[row.status]}
                      </td>
                    </tr>
                  ))}
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
