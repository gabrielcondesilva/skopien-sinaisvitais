"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuthStore } from "@/store/auth";
import { RealtimeClock } from "@/components/RealtimeClock";

const DASHBOARDS = [
  {
    id: "cuidados-com-a-pele",
    label: "Cuidados a Pele",
    desc: "LPP, Risco, mudança de decúbito e curativos em tempo real",
  },
  {
    id: "emergency-unit",
    label: "Unidade de Emergência",
    desc: "Fluxo de porta, LOS e boarding do Pronto Socorro",
  },
  {
    id: "gestao-cirurgica",
    label: "Gestão de Atraso Cirúrgico",
    desc: "Timestamps do fluxo cirúrgico com alertas de atraso",
  },
  {
    id: "operating-room",
    label: "Centro Cirúrgico",
    desc: "Utilização de salas e turnover cirúrgico",
  },
  {
    id: "capacity-demand",
    label: "Capacidade × Demanda",
    desc: "Projeção de demanda vs capacidade disponível",
  },
  {
    id: "performance-alta",
    label: "Performance de Alta até 10h",
    desc: "Adesão ao processo de alta matinal",
  },
  {
    id: "permanencia-cid",
    label: "Tempo de Permanência CID",
    desc: "LOS por diagnóstico principal (CID-10)",
  },
  {
    id: "agendamento-anestesico",
    label: "Agendamento Anestésico",
    desc: "Disponibilidade e alocação de anestesistas",
  },
  {
    id: "bed-cleaning",
    label: "Higienização de Leitos",
    desc: "Tempo de higienização e liberação de leitos",
  },
  {
    id: "patient-prediction",
    label: "Predição de Deterioração",
    desc: "Previsão de deterioração clínica por modelo preditivo",
  },
  {
    id: "admission-prediction",
    label: "Predição de Internações",
    desc: "Previsão de internações nas próximas 24 horas",
  },
  {
    id: "medicamentos-atrasados",
    label: "Medicamentos Atrasados",
    desc: "Distribuição de atrasos de medicação por faixa de tempo e setor",
  },
] as const;

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── SVG database icon ────────────────────────────────────────────────────────

function DatabaseIcon({ pctUsed }: { pctUsed: number }) {
  const free = 100 - pctUsed;
  return (
    <svg viewBox="0 0 80 90" width={80} height={90}>
      {/* cylinder body */}
      <ellipse cx={40} cy={18} rx={32} ry={10} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      <rect x={8} y={18} width={64} height={52} fill="none" />
      {/* filled portion (used) */}
      <path
        d={`M 8 ${18 + 52 * (free / 100)} Q 40 ${18 + 52 * (free / 100) + 10} 72 ${18 + 52 * (free / 100)} L 72 70 Q 40 80 8 70 Z`}
        fill="rgba(59,130,246,0.25)"
      />
      {/* cylinder outline */}
      <path d="M 8 18 L 8 70 Q 40 80 72 70 L 72 18" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      <ellipse cx={40} cy={18} rx={32} ry={10} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      {/* middle ring lines */}
      <path d="M 8 38 Q 40 48 72 38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      <path d="M 8 54 Q 40 64 72 54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
    </svg>
  );
}

// ─── Datalake panel ───────────────────────────────────────────────────────────

function DatalakePanel() {
  const usedPct = 15;
  const freePct = 85;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div>
        <p style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Dados</p>
        <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--foreground)", lineHeight: 1.1 }}>
          DATALAKE
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { label: "Início",    value: "Abril/2026" },
          { label: "Tamanho",  value: "320 Gbytes"  },
          { label: "Nº Linhas",value: "2.000.000"   },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{label}:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", textAlign: "right" }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <p style={{ fontSize: 11, color: "var(--muted)", alignSelf: "flex-start" }}>Dados do disco</p>
        <DatabaseIcon pctUsed={usedPct} />

        {/* Free / Occupied */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--muted)" }}>Livre</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--status-stable)" }}>{freePct}%</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--muted)" }}>Ocupado</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>{usedPct}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
          <div style={{ width: `${usedPct}%`, height: "100%", background: "#3b82f6", borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CommandPage() {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [lastUpdate,  setLastUpdate]  = useState(getLastUpdateLabel);
  const [openMenu,    setOpenMenu]    = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setLastUpdate(getLastUpdateLabel()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <AuthGuard>
      <div
        className="min-h-screen"
        style={{ background: "var(--background)" }}
      >
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <Image src="/logo_branca.png" alt="SKOPIEN" width={110} height={33} priority />
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>
              Atualizado às: <span style={{ color: "var(--foreground)" }}>{lastUpdate}</span>
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
            <RealtimeClock />
            <button
              onClick={() => { logout(); router.replace("/login"); }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors hover:bg-white/5"
              style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              <span>↩</span>
              Sair
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 24px" }}>
          <h1 className="text-lg font-semibold mb-1">Central de Comando</h1>
          <p className="text-xs mb-6" style={{ color: "var(--muted)" }}>
            Selecione um painel para visualização
          </p>

          {/* grid + datalake side by side, starting at the same top */}
          <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>

          {/* Left: dashboard grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {DASHBOARDS.map((d) => (
                <div
                  key={d.id}
                  onClick={() => router.push(`/dashboards/${d.id}`)}
                  className="rounded-lg p-5 flex flex-col gap-3 cursor-pointer group"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    transition: "border-color 0.15s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)")}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; setOpenMenu(null); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug" style={{ color: "var(--foreground)" }}>
                      {d.label}
                    </span>
                    <span
                      className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full animate-pulse"
                      style={{ background: "rgba(34,197,94,0.12)", color: "var(--status-stable)" }}
                    >
                      Ao vivo
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    {d.desc}
                  </p>

                  <div className="flex items-center justify-between mt-auto" style={{ position: "relative" }}>
                    {/* Abrir → com mini-menu */}
                    <div
                      style={{ position: "relative" }}
                      onMouseEnter={(e) => { e.stopPropagation(); setOpenMenu(d.id); }}
                      onMouseLeave={(e) => { e.stopPropagation(); setOpenMenu(null); }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                        Abrir →
                      </span>

                      {openMenu === d.id && (
                        <div style={{
                          position: "absolute",
                          bottom: "100%",
                          left: 0,
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          overflow: "hidden",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                          zIndex: 50,
                          minWidth: 160,
                        }}>
                          <Link
                            href={`/dashboards/${d.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                            style={{ color: "var(--foreground)", textDecoration: "none" }}
                          >
                            <span>↗</span> Abrir nesta aba
                          </Link>
                          <Link
                            href={`/dashboards/${d.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                            style={{ color: "var(--foreground)", textDecoration: "none", borderTop: "1px solid var(--border)" }}
                          >
                            <span>⧉</span> Abrir em nova aba
                          </Link>
                        </div>
                      )}
                    </div>

                    {d.id === "cuidados-com-a-pele" && (
                      <Image src="/skinone.png" alt="skinOne" width={68} height={18} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Datalake panel — full height of the grid */}
          <div style={{ width: 220, flexShrink: 0, alignSelf: "stretch" }}>
            <DatalakePanel />
          </div>

          </div>{/* end flex row */}
        </div>{/* end body */}
      </div>
    </AuthGuard>
  );
}
