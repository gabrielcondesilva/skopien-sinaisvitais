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

export function canAccess(profile: UserProfile, pathname: string): boolean {
  return ALLOWED_PREFIXES[profile].some((prefix) =>
    pathname.startsWith(prefix)
  );
}
