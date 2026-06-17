"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── data ─────────────────────────────────────────────────────────────────────

interface Specialty {
  name: string;
  total: number;
  available: number;
  altasPrev: number;
  altasConf: number;
  pendentes: number;
  demandaPrev: number;
}

const SPECIALTIES: Specialty[] = [
  { name: "Maternidade",    total: 30, available: 5, altasPrev: 8,  altasConf: 3, pendentes: 5, demandaPrev: 12 },
  { name: "Oncologia",      total: 20, available: 2, altasPrev: 3,  altasConf: 1, pendentes: 2, demandaPrev: 8  },
  { name: "Pediatria",      total: 24, available: 6, altasPrev: 7,  altasConf: 4, pendentes: 3, demandaPrev: 6  },
  { name: "Cardiologia",    total: 18, available: 1, altasPrev: 4,  altasConf: 2, pendentes: 2, demandaPrev: 9  },
  { name: "Neurologia",     total: 16, available: 3, altasPrev: 5,  altasConf: 2, pendentes: 3, demandaPrev: 7  },
  { name: "Ortopedia",      total: 22, available: 4, altasPrev: 6,  altasConf: 3, pendentes: 3, demandaPrev: 5  },
  { name: "Clínica Médica", total: 40, available: 8, altasPrev: 12, altasConf: 5, pendentes: 7, demandaPrev: 14 },
  { name: "Cirurgia Geral", total: 28, available: 3, altasPrev: 7,  altasConf: 4, pendentes: 3, demandaPrev: 10 },
  { name: "Pneumologia",    total: 14, available: 2, altasPrev: 3,  altasConf: 1, pendentes: 2, demandaPrev: 6  },
  { name: "Nefrologia",     total: 12, available: 1, altasPrev: 2,  altasConf: 1, pendentes: 1, demandaPrev: 5  },
  { name: "Hematologia",    total: 10, available: 2, altasPrev: 2,  altasConf: 1, pendentes: 1, demandaPrev: 3  },
  { name: "Gastroenterologia", total: 12, available: 3, altasPrev: 3, altasConf: 2, pendentes: 1, demandaPrev: 4 },
];

const totalAvailable = SPECIALTIES.reduce((s, x) => s + x.available,   0);
const totalDemand    = SPECIALTIES.reduce((s, x) => s + x.demandaPrev, 0);
const balance        = totalAvailable - totalDemand;

const STATS: { key: keyof Specialty; label: string; legendLabel: string; color: string }[] = [
  { key: "total",       label: "Total",        legendLabel: "Total",              color: "var(--foreground)"      },
  { key: "available",   label: "Disponíveis",  legendLabel: "Disponíveis",        color: "var(--status-stable)"   },
  { key: "altasPrev",   label: "Alta Prev.",   legendLabel: "Alta Prevista",      color: "var(--accent)"          },
  { key: "altasConf",   label: "Alta Conf.",   legendLabel: "Alta Confirmada",    color: "var(--status-elevated)" },
  { key: "pendentes",   label: "Pendentes",    legendLabel: "Pendentes",          color: "var(--status-attention)"},
  { key: "demandaPrev", label: "Dem. Prev.",   legendLabel: "Demanda Prevista",   color: "var(--status-critical)" },
];

// ─── page ─────────────────────────────────────────────────────────────────────

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function CapacityDemandPage() {
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
        <div className="px-6"
          style={{ height: 52, flexShrink: 0, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <Link href="/command" className="text-xs transition-colors" style={{ color: "#F7F7F7" }}>← Voltar</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Capacidade × Demanda</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>
              Atualizado às: <span style={{ color: "var(--foreground)" }}>{lastUpdate}</span>
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
            <RealtimeClock />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 3 KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, flexShrink: 0 }}>
            <div className="rounded-lg p-4 flex flex-col gap-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Saldo Global</span>
              <span className="text-3xl font-bold tabular-nums"
                style={{ color: balance >= 0 ? "var(--status-stable)" : "var(--status-critical)" }}>
                {balance >= 0 ? `+${balance}` : balance}
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>leitos disponíveis vs demanda prevista</span>
            </div>

            <div className="rounded-lg p-4 flex flex-col gap-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Disponíveis</span>
              <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--status-stable)" }}>
                {totalAvailable}
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>leitos livres no momento</span>
            </div>

            <div className="rounded-lg p-4 flex flex-col gap-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Demanda Prevista</span>
              <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--status-critical)" }}>
                {totalDemand}
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>internações esperadas hoje</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 flex-shrink-0 px-1">
            {STATS.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5" style={{ fontSize: 12, color: s.color }}>
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                {s.legendLabel}
              </span>
            ))}
          </div>

          {/* Specialty grid */}
          <div
            style={{
              flex: 1, minHeight: 0,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gridAutoRows: "1fr",
              gap: 10,
            }}
          >
            {SPECIALTIES.map((sp) => {
              const occupancy  = Math.round(((sp.total - sp.available) / sp.total) * 100);
              const isStressed = sp.available < sp.demandaPrev;
              const barColor   = occupancy > 90 ? "var(--status-critical)" : occupancy > 80 ? "var(--status-attention)" : "var(--status-stable)";
              return (
                <div key={sp.name}
                  className="rounded-lg p-4 flex flex-col"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${isStressed ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{sp.name}</span>
                    <span className="text-xs tabular-nums" style={{ color: "var(--foreground)" }}>
                      {occupancy}% ocup.
                    </span>
                  </div>

                  {/* Occupancy bar */}
                  <div className="h-1 rounded-full mb-3" style={{ background: "var(--border)" }}>
                    <div className="h-1 rounded-full"
                      style={{ width: `${occupancy}%`, background: barColor }} />
                  </div>

                  {/* Stats: value (colored) + label (gray) */}
                  <div className="flex justify-between mt-auto">
                    {STATS.map((s) => {
                      const isDemand = s.key === "demandaPrev";
                      return (
                        <div key={s.key}
                          className="flex flex-col items-center gap-0.5"
                          style={isDemand ? {
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: 6,
                            padding: "3px 7px",
                          } : undefined}
                        >
                          <span
                            className="tabular-nums font-bold"
                            style={{ fontSize: isDemand ? 18 : 14, color: s.color, lineHeight: 1.1 }}
                          >
                            {sp[s.key] as number}
                          </span>
                          <span style={{ fontSize: 10, color: s.color }}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
