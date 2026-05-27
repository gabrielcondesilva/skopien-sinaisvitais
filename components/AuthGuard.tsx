"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { PROFILE_HOME, canAccess } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (!canAccess(profile, pathname)) {
      router.replace(PROFILE_HOME[profile]);
    }
  }, [profile, pathname, router]);

  if (!profile) return null;
  if (!canAccess(profile, pathname)) return null;

  return <>{children}</>;
}
