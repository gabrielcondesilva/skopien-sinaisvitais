"use client";

import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";

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
  { status:"Concluído", n:28 },
  { status:"Em limpeza",n:7  },
  { status:"Pendente",  n:5  },
  { status:"Bloqueado", n:2  },
];

const STAFF = [
  { name:"Ocupado",      value:12, color:"#3b82f6" },
  { name:"Disponível",   value:5,  color:"#22c55e" },
  { name:"Em refeição",  value:3,  color:"#f59e0b" },
  { name:"Ausente",      value:2,  color:"#ef4444" },
];

const STATUS_H_COLORS = ["#22c55e","#3b82f6","#f59e0b","#ef4444"];

const TS = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, fontSize:11, color:"var(--foreground)" };

const totalStaff   = STAFF.reduce((s,x)=>s+x.value,0);
const totalConcl   = STATUS_HIGIENE[0].n;
const totalLeitos  = STATUS_HIGIENE.reduce((s,x)=>s+x.n,0);
const metaPct      = Math.round((totalConcl/totalLeitos)*100);

export default function BedCleaningPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background:"var(--background)" }}>
        <div className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
          style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color:"var(--muted)" }}>← Comando</Link>
          <span className="text-sm font-semibold">Bed Cleaning</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full animate-pulse ml-auto"
            style={{ background:"rgba(34,197,94,0.12)", color:"var(--status-stable)" }}>Ao vivo</span>
        </div>

        <div className="p-6 space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:"Meta de Higiene",   value:`${metaPct}%`,   sub:`${totalConcl}/${totalLeitos} leitos` },
              { label:"Tempo Médio",       value:"27 min",         sub:"limpeza completa" },
              { label:"Funcionários",      value:`${totalStaff}`,  sub:"equipe de higiene" },
              { label:"Pendentes",         value:`${STATUS_HIGIENE[2].n + STATUS_HIGIENE[3].n}`, sub:"aguardando limpeza" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg p-4 flex flex-col gap-1"
                style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
                <span className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>{k.label}</span>
                <span className="text-2xl font-bold tabular-nums">{k.value}</span>
                {k.sub && <span className="text-xs" style={{ color:"var(--muted)" }}>{k.sub}</span>}
              </div>
            ))}
          </div>

          {/* 2×2 grid of charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Espera por hora */}
            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"var(--muted)" }}>Espera por Hora (leitos)</p>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={ESPERA_H} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="h" tick={{ fill:"var(--muted)", fontSize:9 }} />
                  <YAxis tick={{ fill:"var(--muted)", fontSize:9 }} allowDecimals={false} />
                  <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Leitos em espera"]} />
                  <Line type="monotone" dataKey="n" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Aceite por hora */}
            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"var(--muted)" }}>Aceite por Hora (leitos)</p>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={ACEITE_H} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="h" tick={{ fill:"var(--muted)", fontSize:9 }} />
                  <YAxis tick={{ fill:"var(--muted)", fontSize:9 }} allowDecimals={false} />
                  <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Aceites"]} />
                  <Line type="monotone" dataKey="n" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Desempenho por etapa */}
            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"var(--muted)" }}>Desempenho por Etapa (min)</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={ETAPAS} layout="vertical" margin={{ top:4, right:16, bottom:0, left:8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill:"var(--muted)", fontSize:9 }} />
                  <YAxis type="category" dataKey="etapa" tick={{ fill:"var(--muted)", fontSize:9 }} width={80} />
                  <Tooltip contentStyle={TS} formatter={(v)=>[`${v} min`,"Tempo"]} />
                  <Bar dataKey="min" fill="#8b5cf6" radius={[0,3,3,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status higiene */}
            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"var(--muted)" }}>Status de Higiene — Leitos</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={STATUS_HIGIENE} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="status" tick={{ fill:"var(--muted)", fontSize:9 }} />
                  <YAxis tick={{ fill:"var(--muted)", fontSize:9 }} allowDecimals={false} />
                  <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Leitos"]} />
                  <Bar dataKey="n" radius={[3,3,0,0]} isAnimationActive={false}>
                    {STATUS_HIGIENE.map((_,i) => <Cell key={i} fill={STATUS_H_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut */}
          <div className="rounded-lg p-4 flex flex-col items-center"
            style={{ background:"var(--surface)", border:"1px solid var(--border)", maxWidth:380 }}>
            <p className="text-xs font-medium mb-2 self-start" style={{ color:"var(--muted)" }}>
              Status dos Funcionários — Equipe de Higiene
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={STAFF} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="value" nameKey="name"
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {STAFF.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TS} formatter={(v, name) => [`${v}`, name]} />
                <Legend wrapperStyle={{ fontSize:11, color:"var(--muted)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
