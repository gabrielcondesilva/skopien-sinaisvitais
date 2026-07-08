"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";
import { Icon } from "@/components/ui/Icon";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── static demo data ─────────────────────────────────────────────────────────

const FILTERS = [
  { key: "data",        label: "Data:",              icon: "calendar",         opts: ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias"] },
  { key: "hospital",     label: "Hospital:",          icon: "building-hospital", opts: ["Todos", "Hospital Demo Skopien"] },
  { key: "unidade",      label: "Unidade:",           icon: "building",         opts: ["Todos", "Clínica Médica", "UTI Adulto", "Oncologia", "UTI Cardiológica", "Pediatria", "Unidade Cirúrgica"] },
  { key: "classe",       label: "Classe Terapêutica:", icon: "category",        opts: ["Todos", "Antibióticos", "Anticoagulantes", "Quimioterapia", "Insulinas", "Imunoterapia", "Outros"] },
  { key: "criticidade",  label: "Criticidade:",       icon: "alert-triangle",  opts: ["Todos", "Crítico", "Alto", "Moderado", "Baixo"] },
  { key: "farmacia",     label: "Farmácia:",          icon: "flask",           opts: ["Todas", "Central", "Satélite Enfermaria", "Satélite UTI"] },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

const KPIS = [
  { label: "Total Atrasados",         value: 50, sub: "medicamentos",  icon: "pill",             iconColor: "#C0BBC4", valueColor: "var(--foreground)" },
  { label: "Antibióticos em Atraso",  value: 19, sub: "38% do total",  icon: "vaccine",          iconColor: "#F59F00", valueColor: "#F59F00" },
  { label: "Quimioterapia em Atraso", value: 8,  sub: "16% do total",  icon: "ribbon-health",    iconColor: "#ec4899", valueColor: "#F76707" },
  { label: "Imunoterapia em Atraso",  value: 4,  sub: "8% do total",   icon: "dna-2",            iconColor: "#a855f7", valueColor: "#F76707" },
  { label: "> 6 Horas de Atraso",     value: 6,  sub: "12% do total",  icon: "clock",            iconColor: "#F03E3E", valueColor: "#F03E3E" },
  { label: "> 12 Horas de Atraso",    value: 2,  sub: "4% do total",   icon: "clock",            iconColor: "#F03E3E", valueColor: "#F03E3E" },
  { label: "Críticos (Alto Risco)",   value: 12, sub: "24% do total",  icon: "alert-triangle",   iconColor: "#F03E3E", valueColor: "#F03E3E" },
] as const;

const HEAT_SCALE = ["#F59F00", "#F76707", "#ef4444", "#dc2626", "#b91c1c", "#7f1d1d"];

const CLASSE_TERAPEUTICA = [
  { label: "Antibióticos",    pct: 38, icon: "virus",         iconColor: "#4ade80" },
  { label: "Anticoagulantes", pct: 22, icon: "droplet",       iconColor: "#ef4444" },
  { label: "Quimioterapia",   pct: 16, icon: "ribbon-health", iconColor: "#ec4899" },
  { label: "Insulinas",       pct: 12, icon: "vaccine",       iconColor: "#4DABF7" },
  { label: "Imunoterapia",    pct: 8,  icon: "dna-2",         iconColor: "#a855f7" },
  { label: "Outros",         pct: 4,  icon: "pill",          iconColor: "#C0BBC4" },
].map((d, i) => ({ ...d, barColor: HEAT_SCALE[i] }));

const UNIDADES = [
  { label: "Clínica Médica",     value: 18, icon: "bed",      iconColor: "#F59F00" },
  { label: "UTI Adulto",         value: 11, icon: "activity", iconColor: "#4DABF7" },
  { label: "Oncologia",          value: 8,  icon: "ribbon-health", iconColor: "#a855f7" },
  { label: "UTI Cardiológica",   value: 6,  icon: "heart",    iconColor: "#F03E3E" },
  { label: "Pediatria",          value: 4,  icon: "user",     iconColor: "#4DABF7" },
  { label: "Unidade Cirúrgica",  value: 3,  icon: "scissors", iconColor: "#4ade80" },
].map((d, i) => ({ ...d, barColor: HEAT_SCALE[i] }));

const RISCO_PACIENTES = [
  { title: "Antibiótico > 4h",         sub: "Primeira dose não administrada", value: 8, color: "#F03E3E" },
  { title: "Quimioterapia > 6h",       sub: "Fora da janela terapêutica",     value: 3, color: "#F03E3E" },
  { title: "Imunoterapia > 6h",        sub: "Fora da janela terapêutica",     value: 1, color: "#F03E3E" },
  { title: "Anticoagulantes em atraso", sub: "Risco de evento trombótico",    value: 5, color: "#F59F00" },
  { title: "Insulinas em atraso",      sub: "Risco de descompensação",       value: 4, color: "#F59F00" },
] as const;

const INDICADORES_EXECUTIVOS = [
  { icon: "circle-check",  color: "#2F9E44", value: "91,8%", label: "Administração no Horário" },
  { icon: "clock",         color: "#F59F00", value: "3h12",  label: "Tempo Médio de Atraso" },
  { icon: "users",         color: "#4DABF7", value: "42",    label: "Pacientes Impactados" },
  { icon: "alert-triangle", color: "#F03E3E", value: "12",   label: "Alertas Críticos Ativos" },
  { icon: "shield-check",  color: "#2F9E44", value: "96,2%", label: "Conformidade Institucional" },
] as const;

const ALERTAS_COMMAND_CENTER = [
  { text: "Primeira dose de antibiótico não administrada", color: "#F03E3E" },
  { text: "Quimioterapia fora da janela terapêutica",       color: "#F03E3E" },
  { text: "Imunoterapia pendente",                          color: "#F03E3E" },
  { text: "Anticoagulante em atraso",                       color: "#F59F00" },
  { text: "Medicação dispensada e não administrada",        color: "#F59F00" },
  { text: "Prescrição aguardando validação farmacêutica",   color: "#eab308" },
] as const;

const FAIXA_TEMPO = [
  { label: "Até 2h",    value: 19, color: "#F59F00" },
  { label: "2h – 6h",   value: 11, color: "#F76707" },
  { label: "6h – 12h",  value: 8,  color: "#ef4444" },
  { label: "> 12h",     value: 12, color: "#7f1d1d" },
] as const;

const FAIXA_TOTAL = FAIXA_TEMPO.reduce((s, f) => s + f.value, 0);

// ─── subcomponents ────────────────────────────────────────────────────────────

function KpiIconCard({ icon, iconColor, label, value, valueColor, sub }: {
  icon: string; iconColor: string; label: string; value: number; valueColor: string; sub: string;
}) {
  return (
    <div
      className="rounded-lg flex items-center gap-3 px-3 py-2.5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          background: `${iconColor}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon name={icon} size={18} color={iconColor} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)", lineHeight: 1.25 }}>
          {label}
        </span>
        <span style={{ fontSize: 20, fontWeight: 800, color: valueColor, lineHeight: 1.1 }}>{value}</span>
        <span style={{ fontSize: 9.5, color: "var(--muted)" }}>{sub}</span>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", minHeight: 0 }}
    >
      <p
        className="mb-2"
        style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--foreground)" }}
      >
        {title}
      </p>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function BarListItem({ icon, iconColor, label, value, suffix, pct, barColor }: {
  icon: string; iconColor: string; label: string; value: number; suffix?: string; pct: number; barColor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: 128, flexShrink: 0, overflow: "hidden" }}>
        <Icon name={icon} size={14} color={iconColor} />
        <span style={{ fontSize: 11, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </span>
      </div>
      <div style={{ flex: 1, height: 13, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", width: 30, textAlign: "right", flexShrink: 0 }}>
        {value}{suffix ?? ""}
      </span>
    </div>
  );
}

function RiskItem({ title, sub, value, color }: { title: string; sub: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.3 }}>{title}</p>
        <p style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.3 }}>{sub}</p>
      </div>
      <span style={{ fontSize: 15, fontWeight: 800, color, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function ExecStat({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1, minWidth: 0 }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", border: `1.5px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={16} color={color} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 9.5, color: "var(--muted)", textAlign: "center", lineHeight: 1.25 }}>{label}</span>
    </div>
  );
}

function AlertRow({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 11, color: "var(--foreground)" }}>{text}</span>
      <Icon name="bell" size={13} color="var(--muted)" />
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function MedicamentosPage() {
  const [filters, setFilters] = useState<Record<FilterKey, string>>(() =>
    Object.fromEntries(FILTERS.map((f) => [f.key, f.opts[0]])) as Record<FilterKey, string>
  );
  const [lastUpdate, setLastUpdate] = useState(getLastUpdateLabel);

  useEffect(() => {
    const id = setInterval(() => setLastUpdate(getLastUpdateLabel()), 30_000);
    return () => clearInterval(id);
  }, []);

  function resetFilters() {
    setFilters(Object.fromEntries(FILTERS.map((f) => [f.key, f.opts[0]])) as Record<FilterKey, string>);
  }

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
            flexShrink: 0, padding: "10px 24px",
            display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
            background: "var(--surface)", borderBottom: "1px solid var(--border)",
          }}
        >
          <Link href="/command" className="text-xs transition-colors" style={{ color: "#F7F7F7" }}>← Voltar</Link>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>COMMAND CENTER – MEDICAMENTOS</p>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: "#F59F00", marginTop: 2 }}>
              Gestão de Atrasos e Administração em Tempo Real
            </p>
          </div>
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
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          padding: "8px 20px",
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
        }}>
          {FILTERS.map(({ key, label, icon, opts }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{label}</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 8, display: "flex", pointerEvents: "none" }}>
                  <Icon name={icon} size={12} color="var(--muted)" />
                </span>
                <select
                  value={filters[key]}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={{
                    fontSize: 11, padding: "3px 10px 3px 26px", borderRadius: 6,
                    border: "1px solid var(--border)", background: "var(--background)",
                    color: "var(--foreground)", cursor: "pointer", outline: "none",
                  }}
                >
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors hover:bg-white/5 ml-auto"
            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <Icon name="filter-off" size={12} />
            Limpar filtros
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, flexShrink: 0 }}>
            {KPIS.map((k) => <KpiIconCard key={k.label} {...k} />)}
          </div>

          {/* Row 2 */}
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Panel title="Distribuição dos Atrasos por Classe Terapêutica (%)">
              {CLASSE_TERAPEUTICA.map((c) => (
                <BarListItem key={c.label} icon={c.icon} iconColor={c.iconColor} label={c.label}
                  value={c.pct} suffix="%" pct={(c.pct / CLASSE_TERAPEUTICA[0].pct) * 100} barColor={c.barColor} />
              ))}
            </Panel>

            <Panel title="Atrasos por Unidade de Internação">
              {UNIDADES.map((u) => (
                <BarListItem key={u.label} icon={u.icon} iconColor={u.iconColor} label={u.label}
                  value={u.value} pct={(u.value / UNIDADES[0].value) * 100} barColor={u.barColor} />
              ))}
            </Panel>

            <Panel title="Pacientes com Maior Risco Assistencial">
              {RISCO_PACIENTES.map((r) => <RiskItem key={r.title} {...r} />)}
            </Panel>
          </div>

          {/* Row 3 */}
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Panel title="Indicadores Executivos">
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                {INDICADORES_EXECUTIVOS.map((e) => <ExecStat key={e.label} {...e} />)}
              </div>
            </Panel>

            <Panel title="Alertas Priorizados pelo Command Center">
              {ALERTAS_COMMAND_CENTER.map((a) => <AlertRow key={a.text} {...a} />)}
            </Panel>

            <Panel title="Atrasos por Faixa de Tempo">
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[...FAIXA_TEMPO]}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={34}
                        outerRadius={52}
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {FAIXA_TEMPO.map((f) => <Cell key={f.label} fill={f.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{FAIXA_TOTAL}</span>
                    <span style={{ fontSize: 8.5, color: "var(--muted)", letterSpacing: "0.05em" }}>TOTAL</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 }}>
                  {FAIXA_TEMPO.map((f) => (
                    <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                      <span style={{ color: "var(--foreground)", flex: 1, whiteSpace: "nowrap" }}>{f.label}</span>
                      <span style={{ color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {f.value} ({Math.round((f.value / FAIXA_TOTAL) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          {/* Footer note */}
          <div
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 8,
              background: "rgba(245,159,10,0.08)", border: "1px solid rgba(245,159,10,0.25)",
            }}
          >
            <Icon name="info-circle" size={14} color="#F59F00" />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              Medicamentos críticos: antibióticos, quimioterapia, imunoterapia, anticoagulantes, insulinas e medicamentos de alto risco.
            </span>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
