import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overlay - Puntos WEB",
  description: "Overlay de puntaje para OBS",
};

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

