"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/auth";
import { PROFILE_HOME } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();

  useEffect(() => {
    if (profile) router.replace(PROFILE_HOME[profile]);
  }, [profile, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const ok = login(email.trim(), password);

    if (!ok) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
    }
  }

  const DEMO_CREDENTIALS = [
    { email: "assistencial@hospital.com", label: "Equipe Assistencial", desc: "Leitos, sinais vitais, alertas" },
    { email: "gestor@hospital.com",       label: "Gestor Hospitalar",   desc: "Gestão + visão assistencial" },
    { email: "executivo@hospital.com",    label: "Executivo",           desc: "Painel estratégico / admin" },
    { email: "dashboards@hospital.com",   label: "Painéis",             desc: "Command center & dashboards" },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--background)" }}>
      {/* Demo credentials hint */}
      <div className="fixed bottom-4 right-4 z-50 group">
        <div
          className="absolute bottom-full right-0 pb-3 w-80 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200"
        >
        <div
          className="rounded-xl p-4 shadow-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>
            ACESSOS DE DEMONSTRAÇÃO
          </p>
          <div className="flex flex-col gap-2.5">
            {DEMO_CREDENTIALS.map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => { setEmail(c.email); setPassword("skopien123"); }}
                className="flex flex-col gap-0.5 text-left rounded-lg px-3 py-2 transition-colors hover:opacity-80"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              >
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{c.label}</span>
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>{c.email}</span>
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>{c.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-3 pt-3" style={{ color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
            Senha para todos: <span className="font-mono font-semibold" style={{ color: "var(--foreground)" }}>skopien123</span>
          </p>
          <p className="text-[10px] mt-1.5" style={{ color: "var(--border)" }}>
            Clique em um perfil para preencher automaticamente.
          </p>
        </div>
        </div>

        <div
          className="flex items-center gap-2 rounded-full px-3 py-2 text-xs cursor-default select-none transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <span className="text-base leading-none">🔑</span>
          Acessos demo
        </div>
      </div>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-4">
          <Image
            src="/logo_branca.png"
            alt="SKOPIEN"
            width={160}
            height={48}
            priority
          />
          <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
            Monitoramento inteligente de pacientes em tempo real.
          </p>
        </div>

        <div
          className="rounded-xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium"
                style={{ color: "var(--muted)" }}
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@hospital.com"
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-1"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium"
                style={{ color: "var(--muted)" }}
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:ring-1"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: "var(--status-critical)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 mt-2"
              style={{
                background: "var(--foreground)",
                color: "var(--background)",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--border)" }}>
          SKOPIEN © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
