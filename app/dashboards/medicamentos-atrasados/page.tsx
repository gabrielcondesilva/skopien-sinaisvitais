"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── static data ──────────────────────────────────────────────────────────────

const DATAS   = ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias"];
const SETORES = ["Todos", "UTI", "Enfermaria", "Pronto Socorro", "Centro Cirúrgico"];

interface FaixaItem {
  faixa: string;
  label: string;
  count: number;
  pct: number;
  color: string;
}

const FAIXAS: FaixaItem[] = [
  { faixa: "Atrasados há 2h",       label: "Atrasados há 2h",       count: 19, pct: 38, color: "#f59e0b" },
  { faixa: "Atrasados há 3h",       label: "Atrasados há 3h",       count: 11, pct: 22, color: "#f97316" },
  { faixa: "Atrasados há 4h",       label: "Atrasados há 4h",       count:  8, pct: 16, color: "#ef4444" },
  { faixa: "Atrasados entre 5-6h",  label: "Atrasados entre 5-6h",  count:  6, pct: 12, color: "#dc2626" },
  { faixa: "Atrasados entre 9-12h", label: "Atrasados entre 9-12h", count:  4, pct:  8, color: "#b91c1c" },
  { faixa: "Mais de 12h",           label: "Mais de 12h",           count:  2, pct:  4, color: "#7f1d1d" },
];

const TOTAL = FAIXAS.reduce((s, f) => s + f.count, 0);

const TS = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, fontSize: 12, color: "var(--foreground)",
};

// ─── subcomponents ────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, sub }: { label: string; value: number | string; color?: string; sub?: string }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums" style={{ color: color ?? "var(--foreground)" }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function MedicamentosAtrasadosPage() {
  const [data,       setData]       = useState("Hoje");
  const [setor,      setSetor]      = useState("Todos");
  const [lastUpdate, setLastUpdate] = useState(getLastUpdateLabel);

  useEffect(() => {
    const id = setInterval(() => setLastUpdate(getLastUpdateLabel()), 30_000);
    return () => clearInterval(id);
  }, []);

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
          className="px-6"
          style={{
            height: 52, flexShrink: 0,
            display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
            background: "var(--surface)", borderBottom: "1px solid var(--border)",
          }}
        >
          <Link href="/command" className="text-xs transition-colors" style={{ color: "#F7F7F7" }}>← Voltar</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Medicamentos Atrasados</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>
              Atualizado às: <span style={{ color: "var(--foreground)" }}>{lastUpdate}</span>
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
            <RealtimeClock />
          </div>
        </div>

        {/* Filter bar */}
        <div style={{
          height: 44, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 16,
          padding: "0 20px",
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
        }}>
          {([
            { label: "Data:", value: data, set: setData, opts: DATAS },
            { label: "Setor:", value: setor, set: setSetor, opts: SETORES },
          ] as const).map(({ label, value, set, opts }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{label}</span>
              <select
                value={value}
                onChange={(e) => set(e.target.value as never)}
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 6,
                  border: "1px solid var(--border)", background: "var(--background)",
                  color: "var(--foreground)", cursor: "pointer", outline: "none",
                }}
              >
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1, minHeight: 0,
            padding: 14,
            display: "flex", flexDirection: "column", gap: 12,
          }}
        >
          {/* KPI cards — total + 6 faixas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, flexShrink: 0 }}>
            <KpiCard label="Total Atrasados" value={TOTAL} sub="medicamentos" />
            {FAIXAS.map((f) => (
              <KpiCard key={f.faixa} label={f.label} value={f.count} color={f.color} sub={`${f.pct}% do total`} />
            ))}
          </div>

          {/* Gráfico de colunas por faixa */}
          <div
            className="rounded-lg p-4 flex flex-col"
            style={{ flex: 1, minHeight: 0, background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              Distribuição por Faixa de Atraso (%)
            </p>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={FAIXAS}
                  layout="vertical"
                  margin={{ top: 4, right: 60, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" domain={[0, 50]} hide />
                  <YAxis type="category" dataKey="faixa" width={170} tick={{ fill: "#f7f7f7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={TS}
                    cursor={false}
                    labelStyle={{ color: "#f7f7f7" }}
                    itemStyle={{ color: "#f7f7f7" }}
                    formatter={(v) => [`${v}%`, "% do total"]}
                  />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {FAIXAS.map((f) => (
                      <Cell key={f.faixa} fill={f.color} />
                    ))}
                    <LabelList
                      dataKey="pct"
                      position="right"
                      formatter={(v: number) => `${v}%`}
                      style={{ fill: "#f7f7f7", fontSize: 11, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
