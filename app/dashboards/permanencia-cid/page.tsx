"use client";

import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── data ─────────────────────────────────────────────────────────────────────

const CID_LOS = [
  { cid: "J18.9 Pneumonia",         los: 7.2 },
  { cid: "I21.9 IAM",               los: 5.8 },
  { cid: "J44.1 DPOC agudizado",    los: 6.4 },
  { cid: "N17.9 IRA",               los: 8.1 },
  { cid: "A41.9 Sepse",             los: 11.3 },
  { cid: "I64 AVC",                 los: 9.7 },
  { cid: "K35.8 Apendicite",        los: 3.2 },
  { cid: "S72.0 Fratura fêmur",     los: 12.4 },
  { cid: "E11.9 DM2 descomp.",      los: 4.6 },
  { cid: "C34.9 Ca pulmão",         los: 6.9 },
];

const DEPT_DIST = [
  { dept: "Clín. Médica",   n: 142 },
  { dept: "Cirurgia",       n: 98  },
  { dept: "Cardiologia",    n: 76  },
  { dept: "Neurologia",     n: 54  },
  { dept: "UTI",            n: 48  },
  { dept: "Ortopedia",      n: 61  },
];

// Age pyramid: negative = male (shown left), positive = female (shown right)
const AGE_PYRAMID = [
  { faixa: "0–14",   M: -8,  F: 6  },
  { faixa: "15–29",  M: -14, F: 12 },
  { faixa: "30–44",  M: -22, F: 19 },
  { faixa: "45–59",  M: -38, F: 31 },
  { faixa: "60–74",  M: -52, F: 47 },
  { faixa: "75+",    M: -34, F: 41 },
];

const CONVENIO = [
  { nome: "Bradesco",   los: 5.8 },
  { nome: "Unimed",     los: 6.2 },
  { nome: "Sul América",los: 5.5 },
  { nome: "Amil",       los: 6.7 },
  { nome: "One Health", los: 5.1 },
  { nome: "Particular", los: 4.8 },
  { nome: "SUS",        los: 8.4 },
];

const STATS = { media: 6.8, mediana: 6.2, desvio: 3.1 };

const TS = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, fontSize:12, color:"var(--foreground)" };

function KpiCard({ label, value, sub }: { label:string; value:string; sub?:string }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
      <span className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs" style={{ color:"var(--muted)" }}>{sub}</span>}
    </div>
  );
}

export default function PermanenciaCIDPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background:"var(--background)" }}>
        <div className="sticky top-0 z-10 px-6"
          style={{ height: 52, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", background:"var(--surface)", borderBottom:"1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color:"var(--muted)" }}>← Comando</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Tempo de Permanência CID</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><RealtimeClock /></div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Permanência Média Geral"    value="6,8 dias" sub="todos os CIDs" />
            <KpiCard label="Total Internações"  value="479"      sub="últimos 30 dias" />
            <KpiCard label="Permanência Mediana"        value="6,2 dias" />
            <KpiCard label="Desvio Padrão"      value="3,1 dias" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CID × LOS */}
            <div className="rounded-lg p-4"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"#f7f7f7" }}>LOS Médio por CID (dias)</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={CID_LOS} layout="vertical" margin={{ top:4, right:16, bottom:0, left:8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill:"#f7f7f7", fontSize:10 }} domain={[0,14]} />
                  <YAxis type="category" dataKey="cid" tick={{ fill:"#f7f7f7", fontSize:9 }} width={130} />
                  <Tooltip contentStyle={TS} formatter={(v) => [`${v} dias`, "Permanência"]} />
                  <Bar dataKey="los" radius={[0,3,3,0]} isAnimationActive={false} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Age pyramid */}
            <div className="rounded-lg p-4"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color:"#f7f7f7" }}>Pirâmide Etária por Sexo</p>
              <div className="flex justify-center gap-4 mb-2 text-xs" style={{ color:"var(--muted)" }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background:"#3b82f6" }} />Masculino</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background:"#ec4899" }} />Feminino</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={AGE_PYRAMID} layout="vertical" stackOffset="sign"
                  margin={{ top:4, right:8, bottom:0, left:32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill:"#f7f7f7", fontSize:9 }}
                    tickFormatter={(v) => String(Math.abs(v))} domain={[-60, 55]} />
                  <YAxis type="category" dataKey="faixa" tick={{ fill:"#f7f7f7", fontSize:10 }} width={38} />
                  <Tooltip contentStyle={TS}
                    formatter={(v, name) => [`${Math.abs(Number(v))}`, name === "M" ? "Masculino" : "Feminino"]} />
                  <Bar dataKey="M" name="M" stackId="a" fill="#3b82f6" isAnimationActive={false} radius={[3,0,0,3]} />
                  <Bar dataKey="F" name="F" stackId="b" fill="#ec4899" isAnimationActive={false} radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Dept distribution */}
            <div className="rounded-lg p-4"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"#f7f7f7" }}>Distribuição por Departamento</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={DEPT_DIST} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dept" tick={{ fill:"#f7f7f7", fontSize:9 }} />
                  <YAxis tick={{ fill:"#f7f7f7", fontSize:9 }} />
                  <Tooltip contentStyle={TS} formatter={(v) => [`${v}`, "Internações"]} />
                  <Bar dataKey="n" fill="#8b5cf6" radius={[3,3,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Convênio */}
            <div className="rounded-lg p-4"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"#f7f7f7" }}>LOS por Convênio (dias)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={CONVENIO} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="nome" tick={{ fill:"#f7f7f7", fontSize:9 }} />
                  <YAxis tick={{ fill:"#f7f7f7", fontSize:9 }} domain={[0,10]} />
                  <Tooltip contentStyle={TS} formatter={(v) => [`${v} dias`, "Permanência"]} />
                  <Bar dataKey="los" isAnimationActive={false} radius={[3,3,0,0]}>
                    {CONVENIO.map((e) => (
                      <Cell key={e.nome} fill={e.nome === "SUS" ? "#ef4444" : "#06b6d4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stats summary */}
            <div className="rounded-lg p-4 flex flex-col gap-3"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium" style={{ color:"var(--muted)" }}>Sumário Estatístico — LOS (dias)</p>
              {[
                { label:"Média",   value:STATS.media   },
                { label:"Mediana", value:STATS.mediana },
                { label:"Desvio",  value:STATS.desvio  },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color:"var(--muted)" }}>{s.label}</span>
                  <span className="text-xl font-bold tabular-nums">{s.value.toFixed(1)}</span>
                </div>
              ))}
              <div className="mt-auto pt-3" style={{ borderTop:"1px solid var(--border)" }}>
                <p className="text-xs" style={{ color:"var(--muted)" }}>Período: últimos 30 dias · 479 pacientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
