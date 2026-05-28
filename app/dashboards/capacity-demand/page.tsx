"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";

// ─── data ─────────────────────────────────────────────────────────────────────

interface Specialty {
  id: string;
  name: string;
  total: number;
  available: number;
  altasPrev: number;
  altasConf: number;
  pendentes: number;
  demandaPrev: number;
}

const SPECIALTIES: Specialty[] = [
  { id: "MAT", name: "Maternidade",    total: 30, available: 5, altasPrev: 8, altasConf: 3, pendentes: 5,  demandaPrev: 12 },
  { id: "ONC", name: "Oncologia",      total: 20, available: 2, altasPrev: 3, altasConf: 1, pendentes: 2,  demandaPrev: 8  },
  { id: "PED", name: "Pediatria",      total: 24, available: 6, altasPrev: 7, altasConf: 4, pendentes: 3,  demandaPrev: 6  },
  { id: "CAR", name: "Cardiologia",    total: 18, available: 1, altasPrev: 4, altasConf: 2, pendentes: 2,  demandaPrev: 9  },
  { id: "NEU", name: "Neurologia",     total: 16, available: 3, altasPrev: 5, altasConf: 2, pendentes: 3,  demandaPrev: 7  },
  { id: "ORT", name: "Ortopedia",      total: 22, available: 4, altasPrev: 6, altasConf: 3, pendentes: 3,  demandaPrev: 5  },
  { id: "CLI", name: "Clínica Médica", total: 40, available: 8, altasPrev:12, altasConf: 5, pendentes: 7,  demandaPrev:14  },
  { id: "CIR", name: "Cirurgia Geral", total: 28, available: 3, altasPrev: 7, altasConf: 4, pendentes: 3,  demandaPrev:10  },
  { id: "PNE", name: "Pneumologia",    total: 14, available: 2, altasPrev: 3, altasConf: 1, pendentes: 2,  demandaPrev: 6  },
  { id: "NEF", name: "Nefrologia",     total: 12, available: 1, altasPrev: 2, altasConf: 1, pendentes: 1,  demandaPrev: 5  },
  { id: "HEM", name: "Hematologia",    total: 10, available: 2, altasPrev: 2, altasConf: 1, pendentes: 1,  demandaPrev: 3  },
  { id: "GAS", name: "Gastroent.",     total: 12, available: 3, altasPrev: 3, altasConf: 2, pendentes: 1,  demandaPrev: 4  },
];

const totalAvailable  = SPECIALTIES.reduce((s, x) => s + x.available,   0);
const totalDemand     = SPECIALTIES.reduce((s, x) => s + x.demandaPrev, 0);
const balance         = totalAvailable - totalDemand;

const BADGE: {
  key: keyof Specialty; label: string; bg: string; color: string;
}[] = [
  { key: "total",       label: "Total",        bg: "rgba(255,255,255,0.06)", color: "var(--foreground)"     },
  { key: "available",   label: "Disponíveis",  bg: "rgba(34,197,94,0.10)",   color: "var(--status-stable)"  },
  { key: "altasPrev",   label: "Alta Prev.",   bg: "rgba(59,130,246,0.10)",  color: "var(--accent)"         },
  { key: "altasConf",   label: "Alta Conf.",   bg: "rgba(249,115,22,0.14)",  color: "var(--status-elevated)" },
  { key: "pendentes",   label: "Pendentes",    bg: "rgba(234,179,8,0.12)",   color: "var(--status-attention)"},
  { key: "demandaPrev", label: "Dem. Prev.",   bg: "rgba(239,68,68,0.12)",   color: "var(--status-critical)" },
];

export default function CapacityDemandPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color: "var(--muted)" }}>
            ← Comando
          </Link>
          <span className="text-sm font-semibold">Capacidade × Demanda</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full animate-pulse ml-auto"
            style={{ background: "rgba(34,197,94,0.12)", color: "var(--status-stable)" }}>
            Ao vivo
          </span>
        </div>

        <div className="p-6 space-y-5">
          {/* Balance header */}
          <div className="rounded-lg p-5 flex flex-wrap gap-6 items-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Saldo Global
              </span>
              <span className="text-3xl font-bold tabular-nums"
                style={{ color: balance >= 0 ? "var(--status-stable)" : "var(--status-critical)" }}>
                {balance >= 0 ? `+${balance}` : balance}
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>leitos disponíveis vs demanda prevista</span>
            </div>
            <div className="flex gap-6 flex-wrap">
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Disponíveis agora</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "var(--status-stable)" }}>{totalAvailable}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Demanda prevista</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "var(--status-critical)" }}>{totalDemand}</p>
              </div>
            </div>
            {/* Badge legend */}
            <div className="ml-auto flex flex-wrap gap-2">
              {BADGE.map((b) => (
                <span key={b.key} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: b.bg, color: b.color }}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Specialty grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {SPECIALTIES.map((sp) => {
              const occupancy = Math.round(((sp.total - sp.available) / sp.total) * 100);
              const isStressed = sp.available < sp.demandaPrev;
              return (
                <div key={sp.id}
                  className="rounded-lg p-4"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${isStressed ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                  }}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-mono font-bold" style={{ color: "var(--accent)" }}>{sp.id}</span>
                      <p className="text-sm font-semibold">{sp.name}</p>
                    </div>
                    <span className="text-xs font-bold"
                      style={{ color: occupancy > 90 ? "var(--status-critical)" : occupancy > 80 ? "var(--status-attention)" : "var(--status-stable)" }}>
                      {occupancy}% ocup.
                    </span>
                  </div>

                  {/* Occupancy bar */}
                  <div className="h-1 rounded-full mb-3" style={{ background: "var(--border)" }}>
                    <div className="h-1 rounded-full transition-all"
                      style={{
                        width: `${occupancy}%`,
                        background: occupancy > 90 ? "var(--status-critical)" : occupancy > 80 ? "var(--status-attention)" : "var(--status-stable)",
                      }} />
                  </div>

                  {/* 6 badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {BADGE.map((b) => (
                      <span key={b.key}
                        className="text-xs px-2 py-0.5 rounded-full font-medium tabular-nums"
                        style={{ background: b.bg, color: b.color }}>
                        {b.label}: {sp[b.key]}
                      </span>
                    ))}
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
