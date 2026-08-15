"use client";

// Continuidad visual entre pantallas: fade + leve subida al montar cada ruta.
// Solo transform/opacity, respeta prefers-reduced-motion (ver globals.css).
export default function PageTransition({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`animate-fade-in-up ${className}`}>{children}</div>;
}
