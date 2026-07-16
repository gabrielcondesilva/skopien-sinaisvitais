import { create } from "zustand";

export type UserProfile = "assistencial" | "gestor" | "executivo" | "paineis";

interface AuthState {
  profile: UserProfile | null;
  email: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const PROFILE_MAP: Record<string, UserProfile> = {
  "assistencial@hospital.com": "assistencial",
  "antonio@hospital.com": "assistencial",
  "gestor@hospital.com": "gestor",
  "executivo@hospital.com": "executivo",
  "dashboards@hospital.com": "paineis",
};

const PASSWORD = "skopien123";

// Sem persist propositalmente: a sessão vive só em memória, então recarregar
// a página ou abrir o link de novo sempre volta para o login — nada de sessão
// "fantasma" de uma demonstração anterior.
export const useAuthStore = create<AuthState>()((set) => ({
  profile: null,
  email: null,
  login: (email, password) => {
    const normalizedEmail = email.toLowerCase();
    const profile = PROFILE_MAP[normalizedEmail];
    if (!profile || password !== PASSWORD) return false;
    set({ profile, email: normalizedEmail });
    return true;
  },
  logout: () => set({ profile: null, email: null }),
}));
