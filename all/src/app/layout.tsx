import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stream Tools - Timer & Scoreboard",
  description: "Cronómetro y marcador de puntos combinados para streaming",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
