// Continuidad visual entre pantallas: fade + leve subida al montar cada ruta.
// Solo transform/opacity, respeta prefers-reduced-motion (ver globals.css).
//
// `footer` (ej. BottomNav) se renderiza FUERA del div animado a propósito:
// cualquier transform computado en un ancestro —incluso una matriz
// identidad residual mientras la animación está "held" por fill-mode
// both— crea un containing block para descendientes `position: fixed`,
// y el nav deja de posicionarse contra el viewport. Sacarlo del árbol
// animado evita el problema de raíz, sin depender de temporizadores.
export default function PageTransition({
  children,
  footer,
  className = "",
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className={`animate-fade-in-up ${className}`}>{children}</div>
      {footer}
    </>
  );
}
