import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "35mm Festival de Cortos",
  description:
    "Muestra el festival de cortometrajes 35mm con visuales dinámicos, líneas de tiempo interactivas y contenido que inspira e informa a realizadores y audiencias.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
