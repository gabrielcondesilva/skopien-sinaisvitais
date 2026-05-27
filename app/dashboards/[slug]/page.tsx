"use client";

import { use } from "react";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <AuthGuard>
      <div className="p-8">
        <h1 className="text-lg font-semibold capitalize">
          {slug.replace(/-/g, " ")}
        </h1>
        <p style={{ color: "var(--muted)" }} className="text-sm mt-1">
          Em construção — issues #17, #18, #19
        </p>
      </div>
    </AuthGuard>
  );
}
