"use client";

import { useEffect, useState } from "react";

// Continuidad visual entre pantallas: fade + leve subida al montar cada ruta.
// Solo transform/opacity, respeta prefers-reduced-motion (ver globals.css).
//
// La clase de animación se saca ~400ms después del mount (animación dura
// 350ms): mientras está "held" por fill-mode both, el navegador computa un
// transform (matrix identidad) aunque el keyframe final diga "none", y
// cualquier transform activo crea un containing block que rompe los
// descendientes `position: fixed` (ej. BottomNav). Se usa un timer en vez
// de onAnimationEnd porque en dev mode la hidratación puede tardar más que
// la animación en SSR: el evento ya disparó antes de que React adjunte el
// listener, y el `setAnimating(false)` nunca llega a ejecutarse.
export default function PageTransition({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setAnimating(false), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${animating ? "animate-fade-in-up" : ""} ${className}`}>
      {children}
    </div>
  );
}
