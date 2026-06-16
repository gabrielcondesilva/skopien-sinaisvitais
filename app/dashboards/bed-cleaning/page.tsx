"use client";

import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── data ─────────────────────────────────────────────────────────────────────

const ESPERA_H = [
  { h:"07h",n:3 },{ h:"08h",n:5 },{ h:"09h",n:8 },{ h:"10h",n:6 },
  { h:"11h",n:4 },{ h:"12h",n:7 },{ h:"13h",n:9 },{ h:"14h",n:5 },
  { h:"15h",n:3 },{ h:"16h",n:2 },
];

const ACEITE_H = [
  { h:"07h",n:2 },{ h:"08h",n:4 },{ h:"09h",n:7 },{ h:"10h",n:5 },
  { h:"11h",n:4 },{ h:"12h",n:6 },{ h:"13h",n:8 },{ h:"14h",n:5 },
  { h:"15h",n:3 },{ h:"16h",n:2 },
];

const ETAPAS = [
  { etapa:"Retirada roupa", min:4.2 },
  { etapa:"Limpeza geral",  min:8.7 },
  { etapa:"Desinfecção",    min:6.1 },
  { etapa:"Reposição",      min:5.3 },
  { etapa:"Inspeção",       min:2.8 },
];

const STATUS_HIGIENE = [
  { status:"Concluído",  n:28 },
  { status:"Em limpeza", n:7  },
  { status:"Pendente",   n:5  },
  { status:"Bloqueado",  n:2  },
];

const STAFF = [
  { name:"Ocupado",     value:12, color:"#3b82f6" },
  { name:"Disponível",  value:5,  color:"#22c55e" },
  { name:"Em refeição", value:3,  color:"#f59e0b" },
  { name:"Ausente",     value:2,  color:"#ef4444" },
];

const STATUS_H_COLORS = ["#22c55e","#3b82f6","#f59e0b","#ef4444"];

const TS = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, fontSize:11, color:"var(--foreground)" };
const LS = { fill: "#f7f7f7", fontSize: 9, fontWeight: 600 } as React.CSSProperties;

const totalStaff  = STAFF.reduce((s,x)=>s+x.value,0);
const totalConcl  = STATUS_HIGIENE[0].n;
const totalLeitos = STATUS_HIGIENE.reduce((s,x)=>s+x.n,0);
const metaPct     = Math.round((totalConcl/totalLeitos)*100);

// ─── page ─────────────────────────────────────────────────────────────────────

export default function BedCleaningPage() {
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
          <Link href="/command" className="text-xs transition-colors" style={{ color: "#F7F7F7" }}>← Voltar</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Higienização de Leitos</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><RealtimeClock /></div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flexShrink: 0 }}>
            {[
              { label:"Meta de Higiene", value:`${metaPct}%`,  sub:`${totalConcl}/${totalLeitos} leitos` },
              { label:"Tempo Médio",     value:"27 min",        sub:"limpeza completa" },
              { label:"Funcionários",    value:`${totalStaff}`, sub:"equipe de higiene" },
              { label:"Pendentes",       value:`${STATUS_HIGIENE[2].n + STATUS_HIGIENE[3].n}`, sub:"aguardando limpeza" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg p-4 flex flex-col gap-1"
                style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
                <span className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>{k.label}</span>
                <span className="text-2xl font-bold tabular-nums">{k.value}</span>
                {k.sub && <span className="text-xs" style={{ color:"var(--muted)" }}>{k.sub}</span>}
              </div>
            ))}
          </div>

          {/* Row 1: Espera + Aceite — line charts */}
          <div style={{ flex: 2, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

            <div className="rounded-lg p-4 flex flex-col" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color:"#f7f7f7" }}>Espera por Hora (leitos)</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ESPERA_H} margin={{ top: 22, right: 16, bottom: 0, left: 4 }}>
                    <XAxis dataKey="h" tick={{ fill:"#f7f7f7", fontSize:9 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Leitos em espera"]} />
                    <Line type="monotone" dataKey="n" stroke="#f59e0b" strokeWidth={2}
                      dot={{ r: 3, fill:"#f59e0b" }} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" offset={8} style={LS} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg p-4 flex flex-col" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color:"#f7f7f7" }}>Aceite por Hora (leitos)</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ACEITE_H} margin={{ top: 22, right: 16, bottom: 0, left: 4 }}>
                    <XAxis dataKey="h" tick={{ fill:"#f7f7f7", fontSize:9 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Aceites"]} />
                    <Line type="monotone" dataKey="n" stroke="#22c55e" strokeWidth={2}
                      dot={{ r: 3, fill:"#22c55e" }} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" offset={8} style={LS} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Desempenho + Status + Funcionários */}
          <div style={{ flex: 3, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>

            {/* Desempenho por Etapa — horizontal bar */}
            <div className="rounded-lg p-4 flex flex-col" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color:"#f7f7f7" }}>Desempenho por Etapa (min)</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ETAPAS} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="etapa" tick={{ fill:"#f7f7f7", fontSize:9 }} width={92} />
                    <Tooltip contentStyle={TS} formatter={(v)=>[`${v} min`,"Tempo"]} />
                    <Bar dataKey="min" fill="#8b5cf6" radius={[0,3,3,0]} isAnimationActive={false}>
                      <LabelList dataKey="min" position="right" formatter={(v: unknown) => `${v}m`} style={LS} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status de Higiene — vertical bar */}
            <div className="rounded-lg p-4 flex flex-col" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color:"#f7f7f7" }}>Status de Higiene — Leitos</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={STATUS_HIGIENE} margin={{ top: 22, right: 12, bottom: 0, left: 12 }}>
                    <XAxis dataKey="status" tick={{ fill:"#f7f7f7", fontSize:9 }} padding={{ left: 20, right: 20 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Leitos"]} />
                    <Bar dataKey="n" radius={[3,3,0,0]} isAnimationActive={false}>
                      {STATUS_HIGIENE.map((_,i) => <Cell key={i} fill={STATUS_H_COLORS[i]} />)}
                      <LabelList dataKey="n" position="top" style={LS} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Funcionários — bar chart */}
            <div className="rounded-lg p-4 flex flex-col" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color:"#f7f7f7" }}>Funcionários — Equipe de Higiene</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={STAFF} margin={{ top: 22, right: 12, bottom: 0, left: 12 }}>
                    <XAxis dataKey="name" tick={{ fill:"#f7f7f7", fontSize:9 }} padding={{ left: 20, right: 20 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v, name) => [`${v}`, name]} />
                    <Bar dataKey="value" radius={[3,3,0,0]} isAnimationActive={false}>
                      {STAFF.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      <LabelList dataKey="value" position="top" style={LS} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
