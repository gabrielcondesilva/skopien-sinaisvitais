"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── data ─────────────────────────────────────────────────────────────────────

type Status = "Marcado" | "Cancelado" | "Inconsistente" | "Suspenso";
type Setor  = "Imagem" | "Hemodinâmica" | "Intervenção" | "Endoscopia";

interface AgendRow {
  dataHora: string;
  procedimentoPT: string;
  procedimentoEN: string;
  setor: Setor;
  status: Status;
  tipoAtend: string;
}

const ROWS: AgendRow[] = [
  { dataHora:"08:00", procedimentoPT:"Cateterismo Cardíaco",       procedimentoEN:"Cardiac Catheterization",    setor:"Hemodinâmica",  status:"Marcado",       tipoAtend:"Eletivo"   },
  { dataHora:"08:30", procedimentoPT:"Ressonância Magnética Crânio",procedimentoEN:"Brain MRI",                 setor:"Imagem",        status:"Marcado",       tipoAtend:"Urgência"  },
  { dataHora:"09:00", procedimentoPT:"Angioplastia Coronariana",    procedimentoEN:"Coronary Angioplasty",       setor:"Hemodinâmica",  status:"Cancelado",     tipoAtend:"Eletivo"   },
  { dataHora:"09:30", procedimentoPT:"Colonoscopia Diagnóstica",    procedimentoEN:"Diagnostic Colonoscopy",     setor:"Endoscopia",    status:"Marcado",       tipoAtend:"Eletivo"   },
  { dataHora:"10:00", procedimentoPT:"TC Abdome com Contraste",     procedimentoEN:"Abdominal CT with Contrast", setor:"Imagem",        status:"Inconsistente", tipoAtend:"Urgência"  },
  { dataHora:"10:30", procedimentoPT:"Ablação por Radiofrequência", procedimentoEN:"Radiofrequency Ablation",    setor:"Hemodinâmica",  status:"Marcado",       tipoAtend:"Eletivo"   },
  { dataHora:"11:00", procedimentoPT:"CPRE Diagnóstica",            procedimentoEN:"Diagnostic ERCP",            setor:"Endoscopia",    status:"Suspenso",      tipoAtend:"Urgência"  },
  { dataHora:"11:30", procedimentoPT:"Biópsia Guiada por TC",       procedimentoEN:"CT-guided Biopsy",           setor:"Intervenção",   status:"Marcado",       tipoAtend:"Eletivo"   },
  { dataHora:"13:00", procedimentoPT:"Ressonância Coluna Lombar",   procedimentoEN:"Lumbar Spine MRI",           setor:"Imagem",        status:"Marcado",       tipoAtend:"Eletivo"   },
  { dataHora:"13:30", procedimentoPT:"Implante de Stent Coronário", procedimentoEN:"Coronary Stent Implant",     setor:"Hemodinâmica",  status:"Inconsistente", tipoAtend:"Urgência"  },
  { dataHora:"14:00", procedimentoPT:"Gastroscopia Diagnóstica",    procedimentoEN:"Diagnostic Gastroscopy",     setor:"Endoscopia",    status:"Marcado",       tipoAtend:"Eletivo"   },
  { dataHora:"14:30", procedimentoPT:"Drenagem Percutânea",         procedimentoEN:"Percutaneous Drainage",      setor:"Intervenção",   status:"Cancelado",     tipoAtend:"Urgência"  },
  { dataHora:"15:00", procedimentoPT:"Mamografia Digital",          procedimentoEN:"Digital Mammography",        setor:"Imagem",        status:"Marcado",       tipoAtend:"Eletivo"   },
  { dataHora:"15:30", procedimentoPT:"Retossigmoidoscopia",         procedimentoEN:"Rectosigmoidoscopy",         setor:"Endoscopia",    status:"Suspenso",      tipoAtend:"Eletivo"   },
  { dataHora:"16:00", procedimentoPT:"Embolização Arterial",        procedimentoEN:"Arterial Embolization",      setor:"Intervenção",   status:"Marcado",       tipoAtend:"Urgência"  },
];

const STATUS_STYLE: Record<Status, { bg: string; color: string }> = {
  Marcado:      { bg:"rgba(34,197,94,0.12)",  color:"var(--status-stable)"   },
  Cancelado:    { bg:"rgba(239,68,68,0.12)",  color:"var(--status-critical)" },
  Inconsistente:{ bg:"rgba(234,179,8,0.12)",  color:"var(--status-attention)"},
  Suspenso:     { bg:"rgba(148,163,184,0.12)",color:"var(--muted)"           },
};

const STATUSES: Status[] = ["Marcado","Cancelado","Inconsistente","Suspenso"];
const SETORES:  Setor[]  = ["Imagem","Hemodinâmica","Intervenção","Endoscopia"];

export default function AgendamentoAnestesicoPage() {
  const [activeStatus, setActiveStatus] = useState<Status | null>(null);
  const [activeSetor,  setActiveSetor]  = useState<Setor  | null>(null);

  const filtered = ROWS.filter((r) =>
    (!activeStatus || r.status === activeStatus) &&
    (!activeSetor  || r.setor  === activeSetor)
  );

  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background:"var(--background)" }}>
        <div className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
          style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color:"var(--muted)" }}>← Comando</Link>
          <span className="text-sm font-semibold">Agendamento Anestésico</span>
          <RealtimeClock className="ml-auto" />
        </div>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="rounded-lg p-4 flex items-center gap-6"
            style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>Volume Total — Hoje</p>
              <p className="text-3xl font-bold tabular-nums">{ROWS.length}</p>
              <p className="text-xs" style={{ color:"var(--muted)" }}>procedimentos agendados</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {STATUSES.map((s) => {
                const count = ROWS.filter((r) => r.status === s).length;
                const style = STATUS_STYLE[s];
                return (
                  <div key={s} className="text-center">
                    <p className="text-xl font-bold tabular-nums" style={{ color:style.color }}>{count}</p>
                    <p className="text-xs" style={{ color:"var(--muted)" }}>{s}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs self-center" style={{ color:"var(--muted)" }}>Status:</span>
            {STATUSES.map((s) => {
              const style = STATUS_STYLE[s];
              const active = activeStatus === s;
              return (
                <button key={s} onClick={() => setActiveStatus(active ? null : s)}
                  className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: active ? style.bg : "rgba(255,255,255,0.05)",
                    color: active ? style.color : "var(--muted)",
                    border: `1px solid ${active ? style.color + "44" : "var(--border)"}`,
                  }}>
                  {s}
                </button>
              );
            })}
            <span className="text-xs self-center ml-3" style={{ color:"var(--muted)" }}>Setor:</span>
            {SETORES.map((s) => {
              const active = activeSetor === s;
              return (
                <button key={s} onClick={() => setActiveSetor(active ? null : s)}
                  className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
                    color: active ? "var(--accent)" : "var(--muted)",
                    border: `1px solid ${active ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
                  }}>
                  {s}
                </button>
              );
            })}
            {(activeStatus || activeSetor) && (
              <button onClick={() => { setActiveStatus(null); setActiveSetor(null); }}
                className="text-xs px-3 py-1 rounded-full transition-all"
                style={{ color:"var(--muted)", border:"1px solid var(--border)" }}>
                Limpar
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden" style={{ border:"1px solid var(--border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                    {["Hora","Procedimento","Procedimento (Inglês)","Setor","Status","Tipo"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap"
                        style={{ color:"var(--muted)", borderBottom:"1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center" style={{ color:"var(--muted)", background:"var(--surface)" }}>
                      Nenhum procedimento encontrado para os filtros selecionados
                    </td></tr>
                  ) : filtered.map((row, i) => {
                    const ss = STATUS_STYLE[row.status];
                    return (
                      <tr key={i} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background:"var(--surface)" }}>
                        <td className="px-3 py-2.5 font-mono tabular-nums">{row.dataHora}</td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.procedimentoPT}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color:"var(--muted)" }}>{row.procedimentoEN}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{row.setor}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                            style={{ background:ss.bg, color:ss.color }}>{row.status}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color:"var(--muted)" }}>{row.tipoAtend}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
