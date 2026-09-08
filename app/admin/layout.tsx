// Capa 2 de la protección de rutas (ADR 007, decisión 3).
//
// El middleware Edge ya descartó a quien no trae cookie, pero desde Edge no se
// puede hablar con Redis: una cookie vencida, invalidada en el logout o
// manipulada a mano pasa ese filtro. Acá se valida la sesión de verdad y el rol.
import type { ReactNode } from "react";
import { requireSesionPagina } from "@/lib/auth";
import { Rol } from "@/generated/prisma/client";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSesionPagina(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
  return <>{children}</>;
}
