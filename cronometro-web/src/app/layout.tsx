import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cronómetro Stream",
  description: "Cronómetro overlay para OBS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@400;500;600;700&family=Press+Start+2P&family=Bebas+Neue&family=Digital+7&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
