// Capa 2 de la protección de rutas (ADR 007, decisión 3): el middleware Edge
// sólo verificó que existiera la cookie; acá se valida la sesión contra Redis.
// Sin restricción de rol: el staff también puede abrir las vistas de cliente.
import type { ReactNode } from "react";
import { requireSesionPagina } from "@/lib/auth";

export default async function EvaluacionLayout({ children }: { children: ReactNode }) {
  await requireSesionPagina();
  return <>{children}</>;
}
