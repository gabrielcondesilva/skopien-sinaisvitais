import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SimulationProvider } from "@/components/SimulationProvider";

const segoeUI = localFont({
  src: [
    { path: "../public/fonts/segoeuil.ttf",  weight: "300", style: "normal" },
    { path: "../public/fonts/seguili.ttf",   weight: "300", style: "italic" },
    { path: "../public/fonts/segoeuisl.ttf", weight: "350", style: "normal" },
    { path: "../public/fonts/seguisli.ttf",  weight: "350", style: "italic" },
    { path: "../public/fonts/segoeui.ttf",   weight: "400", style: "normal" },
    { path: "../public/fonts/segoeuii.ttf",  weight: "400", style: "italic" },
    { path: "../public/fonts/seguisb.ttf",   weight: "600", style: "normal" },
    { path: "../public/fonts/seguisbi.ttf",  weight: "600", style: "italic" },
    { path: "../public/fonts/segoeuib.ttf",  weight: "700", style: "normal" },
    { path: "../public/fonts/segoeuiz.ttf",  weight: "700", style: "italic" },
    { path: "../public/fonts/seguibl.ttf",   weight: "900", style: "normal" },
    { path: "../public/fonts/seguibli.ttf",  weight: "900", style: "italic" },
  ],
  variable: "--font-segoe",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

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
    <html lang="pt-BR" className={`dark ${segoeUI.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body>
        <SimulationProvider>{children}</SimulationProvider>
      </body>
    </html>
  );
}
