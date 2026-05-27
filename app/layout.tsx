import type { Metadata } from "next";
import "./globals.css";
import { SimulationProvider } from "@/components/SimulationProvider";

export const metadata: Metadata = {
  title: "SKOPIEN — Monitoramento de Pacientes",
  description: "Monitoramento inteligente de pacientes em tempo real.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <SimulationProvider>{children}</SimulationProvider>
      </body>
    </html>
  );
}
