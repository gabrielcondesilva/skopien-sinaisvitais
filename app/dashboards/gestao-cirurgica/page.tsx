"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

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
  {
    paciente:    "Maurício Pinto Azevedo",
    procedimento:"Colecistectomia Laparoscópica",
    sala:        "CCCG",
    progInicio:  "07:00",
    entradaCC:   ts("07:08",  0),
    inicioAnest: ts("07:22",  0),
    inicioCirug: ts("07:45",  0),
    fimCirug:    ts("09:15",  0),
    entradaRA:   ts("09:20",  0),
    altaRA:      ts("10:50",  1),
    destino:     ts("11:35",  2),
    duracao:     ts("4h 35min", 2),
    status:      2,
  },
  {
    paciente:    "Juliana Mendes Freitas",
    procedimento:"Cesariana Eletiva",
    sala:        "CCOB",
    progInicio:  "08:00",
    entradaCC:   ts("08:05",  0),
    inicioAnest: ts("08:18",  0),
    inicioCirug: ts("08:40",  0),
    fimCirug:    ts("09:30",  0),
    entradaRA:   ts("09:35",  0),
    altaRA:      ts("10:45",  0),
    destino:     ts("11:00",  0),
    duracao:     ts("3h 00min", 0),
    status:      0,
  },
  {
    paciente:    "Gustavo Henrique Leal",
    procedimento:"Herniorrafia Inguinal",
    sala:        "CCAmb",
    progInicio:  "07:30",
    entradaCC:   ts("07:52",  1),
    inicioAnest: ts("08:15",  1),
    inicioCirug: ts("08:35",  1),
    fimCirug:    ts("09:50",  1),
    entradaRA:   ts("09:55",  0),
    altaRA:      ts("11:00",  0),
    destino:     ts("11:20",  0),
    duracao:     ts("3h 50min", 1),
    status:      1,
  },
  {
    paciente:    "Neide Aparecida Cunha",
    procedimento:"Tireoidectomia Total",
    sala:        "CCEsp",
    progInicio:  "09:00",
    entradaCC:   ts("09:02",  0),
    inicioAnest: ts("09:20",  0),
    inicioCirug: ts("09:45",  0),
    fimCirug:    ts("11:30",  0),
    entradaRA:   ts("11:35",  0),
    altaRA:      ts("13:00",  0),
    destino:     ts("13:30",  0),
    duracao:     ts("4h 30min", 0),
    status:      0,
  },
  {
    paciente:    "Roberto Fagundes Lima",
    procedimento:"Prostatectomia Radical",
    sala:        "CCCG",
    progInicio:  "10:00",
    entradaCC:   ts("10:45",  2),
    inicioAnest: ts("11:10",  2),
    inicioCirug: ts("11:40",  2),
    fimCirug:    ts("14:20",  2),
    entradaRA:   ts("14:25",  1),
    altaRA:      ts("16:30",  1),
    destino:     ts("Pendente", 2),
    duracao:     ts("6h 30min+", 2),
    status:      2,
  },
  {
    paciente:    "Ana Cláudia Barbosa",
    procedimento:"Artroscopia de Joelho",
    sala:        "CCAmb",
    progInicio:  "11:00",
    entradaCC:   ts("11:05",  0),
    inicioAnest: ts("11:22",  0),
    inicioCirug: ts("11:40",  0),
    fimCirug:    ts("13:10",  0),
    entradaRA:   ts("13:15",  0),
    altaRA:      ts("14:20",  0),
    destino:     ts("14:45",  0),
    duracao:     ts("3h 45min", 0),
    status:      0,
  },
  {
    paciente:    "Carlos Eduardo Mota",
    procedimento:"Bypass Coronariano",
    sala:        "CCEsp",
    progInicio:  "07:00",
    entradaCC:   ts("07:20",  1),
    inicioAnest: ts("07:50",  1),
    inicioCirug: ts("08:30",  1),
    fimCirug:    ts("13:00",  0),
    entradaRA:   ts("13:10",  0),
    altaRA:      ts("Em RA",  1),
    destino:     ts("Pendente", 1),
    duracao:     ts("6h 00min+", 1),
    status:      1,
  },
  {
    paciente:    "Fátima Regina Sousa",
    procedimento:"Histerectomia Total",
    sala:        "CCOB",
    progInicio:  "13:00",
    entradaCC:   ts("13:02",  0),
    inicioAnest: ts("13:18",  0),
    inicioCirug: ts("13:40",  0),
    fimCirug:    ts("15:20",  0),
    entradaRA:   ts("15:25",  0),
    altaRA:      ts("16:30",  0),
    destino:     ts("17:00",  0),
    duracao:     ts("4h 00min", 0),
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
      className="px-3 py-2.5 tabular-nums text-xs whitespace-nowrap"
      style={{ background: DELAY_BG[cell.delay], color: DELAY_COLOR[cell.delay] }}
    >
      {cell.value}
    </td>
  );
}

export default function GestaoCirurgicaPage() {
  const onTime  = ROWS.filter((r) => r.status === 0).length;
  const atencao = ROWS.filter((r) => r.status === 1).length;
  const delayed = ROWS.filter((r) => r.status === 2).length;

  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/command" className="text-xs transition-colors hover:text-white" style={{ color: "var(--muted)" }}>
            ← Comando
          </Link>
          <span className="text-sm font-semibold">Gestão de Atraso Cirúrgico</span>
          <RealtimeClock className="ml-auto" />
        </div>

        <div className="p-6 space-y-5">
          {/* Summary chips */}
          <div className="flex gap-3 flex-wrap">
            {([
              { label: "No prazo", count: onTime,  delay: 0 },
              { label: "Atenção",  count: atencao, delay: 1 },
              { label: "Atrasado", count: delayed, delay: 2 },
            ] as { label: string; count: number; delay: Delay }[]).map((s) => (
              <span
                key={s.label}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: DELAY_BG[s.delay], color: DELAY_COLOR[s.delay] }}
              >
                {s.count} {s.label}
              </span>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    {COL_HEADERS.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left font-medium whitespace-nowrap"
                        style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}
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
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap text-xs" style={{ background: "var(--surface)" }}>
                        {row.paciente}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: "var(--muted)", background: "var(--surface)" }}>
                        {row.procedimento}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs" style={{ background: "var(--surface)" }}>
                        {row.sala}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-xs" style={{ color: "var(--muted)", background: "var(--surface)" }}>
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
                        className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap"
                        style={{ background: DELAY_BG[row.status], color: DELAY_COLOR[row.status] }}
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
          <div className="flex gap-4 text-xs" style={{ color: "var(--muted)" }}>
            {([0, 1, 2] as Delay[]).map((d) => (
              <span key={d} className="flex items-center gap-1.5">
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
