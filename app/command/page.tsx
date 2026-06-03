"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuthStore } from "@/store/auth";

const DASHBOARDS = [
  {
    id: "cuidados-com-a-pele",
    label: "Cuidados com a Pele",
    desc: "LPP, Braden, mudança de decúbito e curativos em tempo real",
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
] as const;

export default function CommandPage() {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

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
            <span className="text-xs font-medium px-2 py-0.5 rounded-full animate-pulse"
              style={{ background: "rgba(34,197,94,0.15)", color: "var(--status-stable)" }}>
              Ao vivo
            </span>
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

        <div className="p-6 max-w-6xl mx-auto">
          <h1 className="text-lg font-semibold mb-1">Central de Comando</h1>
          <p className="text-xs mb-8" style={{ color: "var(--muted)" }}>
            Selecione um painel para visualização
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DASHBOARDS.map((d) => (
              <Link
                key={d.id}
                href={`/dashboards/${d.id}`}
                className="rounded-lg p-5 flex flex-col gap-3 transition-colors hover:border-blue-500/40 group"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-sm font-semibold leading-snug group-hover:text-blue-400 transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
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
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                    Abrir →
                  </span>
                  {d.id === "cuidados-com-a-pele" && (
                    <Image src="/skinone.png" alt="skinOne" width={68} height={18} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
