"use client";

import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── data ─────────────────────────────────────────────────────────────────────

const CID_LOS = [
  { cid: "J18.9 Pneumonia",      los: 7.2  },
  { cid: "I21.9 IAM",            los: 5.8  },
  { cid: "J44.1 DPOC agudizado", los: 6.4  },
  { cid: "N17.9 IRA",            los: 8.1  },
  { cid: "A41.9 Sepse",          los: 11.3 },
  { cid: "I64 AVC",              los: 9.7  },
  { cid: "K35.8 Apendicite",     los: 3.2  },
  { cid: "S72.0 Fratura fêmur",  los: 12.4 },
  { cid: "E11.9 DM2 descomp.",   los: 4.6  },
  { cid: "C34.9 Ca pulmão",      los: 6.9  },
];

const AGE_BARS = [
  { faixa: "0–14",  M: 8,  F: 6  },
  { faixa: "15–29", M: 14, F: 12 },
  { faixa: "30–44", M: 22, F: 19 },
  { faixa: "45–59", M: 38, F: 31 },
  { faixa: "60–74", M: 52, F: 47 },
  { faixa: "75+",   M: 34, F: 41 },
];

const DEPT_DIST = [
  { dept: "Clín. Médica", n: 142 },
  { dept: "Cirurgia",     n: 98  },
  { dept: "Cardiologia",  n: 76  },
  { dept: "Neurologia",   n: 54  },
  { dept: "UTI",          n: 48  },
  { dept: "Ortopedia",    n: 61  },
];

const CONVENIO = [
  { nome: "Bradesco",    los: 5.8 },
  { nome: "Unimed",      los: 6.2 },
  { nome: "Sul América", los: 5.5 },
  { nome: "Amil",        los: 6.7 },
  { nome: "One Health",  los: 5.1 },
  { nome: "Particular",  los: 4.8 },
  { nome: "SUS",         los: 8.4 },
];

const STATS = { media: 6.8, mediana: 6.2, desvio: 3.1 };

const TS = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--foreground)" };
const LSM = { fill: "#f7f7f7", fontSize: 9,  fontWeight: 600 } as React.CSSProperties;
const LSS = { fill: "#f7f7f7", fontSize: 8,  fontWeight: 600 } as React.CSSProperties;

// ─── components ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PermanenciaCIDPage() {
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
        <div className="px-6"
          style={{ height: 52, flexShrink: 0, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color: "var(--muted)" }}>← Comando</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Tempo de Permanência CID</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><RealtimeClock /></div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flexShrink: 0 }}>
            <KpiCard label="Permanência Média" value="6,8 dias" sub="todos os CIDs" />
            <KpiCard label="Total Internações"  value="479"      sub="últimos 30 dias" />
            <KpiCard label="Mediana"            value="6,2 dias" />
            <KpiCard label="Desvio Padrão"      value="3,1 dias" />
          </div>

          {/* Linha 1: LOS por CID + Distribuição Etária */}
          <div style={{ flex: 3, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

            {/* LOS por CID — horizontal */}
            <div className="rounded-lg p-4 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>LOS Médio por CID (dias)</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CID_LOS} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 8 }}>
                    <XAxis type="number" domain={[0, 14]} hide />
                    <YAxis type="category" dataKey="cid" tick={{ fill: "#f7f7f7", fontSize: 9 }} width={135} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v} dias`, "Permanência"]} />
                    <Bar dataKey="los" radius={[0, 3, 3, 0]} isAnimationActive={false} fill="#3b82f6">
                      <LabelList dataKey="los" position="right" formatter={(v: unknown) => `${v}d`} style={LSM} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribuição Etária por Sexo — grouped bar */}
            <div className="rounded-lg p-4 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "#f7f7f7" }}>Distribuição Etária por Sexo</p>
              <div className="flex gap-4 mb-2">
                {[{ label: "Masculino", color: "#3b82f6" }, { label: "Feminino", color: "#ec4899" }].map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5" style={{ fontSize: 11, color: "var(--muted)" }}>
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={AGE_BARS} margin={{ top: 20, right: 12, bottom: 0, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="faixa" tick={{ fill: "#f7f7f7", fontSize: 10 }} padding={{ left: 20, right: 20 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v, name) => [`${v}`, name === "M" ? "Masculino" : "Feminino"]} />
                    <Bar dataKey="M" name="M" fill="#3b82f6" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="M" position="top" style={LSS} />
                    </Bar>
                    <Bar dataKey="F" name="F" fill="#ec4899" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="F" position="top" style={LSS} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Linha 2: Departamento + Convênio + Sumário */}
          <div style={{ flex: 2, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>

            {/* Distribuição por Departamento */}
            <div className="rounded-lg p-4 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>Distribuição por Departamento</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEPT_DIST} margin={{ top: 20, right: 12, bottom: 0, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="dept" tick={{ fill: "#f7f7f7", fontSize: 9 }} padding={{ left: 20, right: 20 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v}`, "Internações"]} />
                    <Bar dataKey="n" fill="#8b5cf6" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" style={LSM} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LOS por Convênio */}
            <div className="rounded-lg p-4 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>LOS por Convênio (dias)</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CONVENIO} margin={{ top: 20, right: 12, bottom: 0, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="nome" tick={{ fill: "#f7f7f7", fontSize: 9 }} padding={{ left: 20, right: 20 }} />
                    <YAxis hide width={0} domain={[0, 10]} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v} dias`, "Permanência"]} />
                    <Bar dataKey="los" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                      {CONVENIO.map((e) => (
                        <Cell key={e.nome} fill={e.nome === "SUS" ? "#ef4444" : "#06b6d4"} />
                      ))}
                      <LabelList dataKey="los" position="top" formatter={(v: unknown) => `${v}d`} style={LSM} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sumário estatístico */}
            <div className="rounded-lg p-4 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium" style={{ color: "#f7f7f7" }}>Sumário Estatístico — LOS (dias)</p>
              <div className="flex flex-col gap-3 flex-1 justify-center">
                {[
                  { label: "Média",   value: STATS.media   },
                  { label: "Mediana", value: STATS.mediana },
                  { label: "Desvio",  value: STATS.desvio  },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--muted)" }}>{s.label}</span>
                    <span className="text-2xl font-bold tabular-nums">{s.value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Período: últimos 30 dias · 479 pacientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
