import type { UserProfile } from "@/store/auth";

export const PROFILE_HOME: Record<UserProfile, string> = {
  assistencial: "/units/pronto-socorro",
  gestor: "/units/pronto-socorro",
  executivo: "/admin",
  paineis: "/command",
};

const ALLOWED_PREFIXES: Record<UserProfile, string[]> = {
  assistencial: ["/units", "/patients"],
  gestor: ["/units", "/patients", "/admin"],
  executivo: ["/admin"],
  paineis: ["/command", "/dashboards"],
};

// Antonio (teste) é uma cópia do perfil assistencial que também enxerga o
// Painel Executivo no sidebar, só para fins de demonstração comercial.
const ANTONIO_EMAIL = "antonio@hospital.com";

export function canAccess(profile: UserProfile, pathname: string, email?: string | null): boolean {
  const prefixes = email === ANTONIO_EMAIL
    ? [...ALLOWED_PREFIXES[profile], "/admin"]
    : ALLOWED_PREFIXES[profile];
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}
