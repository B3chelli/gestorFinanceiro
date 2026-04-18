import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Financeiro Bechelli",
  description: "Gestão financeira pessoal",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#a855f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};