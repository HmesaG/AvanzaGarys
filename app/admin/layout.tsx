// Frontera de seguridad real del panel administrativo.
//
// El middleware solo verifica que exista la cookie de sesión (corre en Edge y
// no puede consultar Redis — ver la nota de runtime en `middleware.ts`). Acá,
// en runtime Node.js, se valida la sesión contra Redis y se exige un rol
// interno antes de renderizar cualquier página de `/admin`.

import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { Rol } from "../../generated/enums";

// La sesión vive en Redis: nunca se puede prerenderizar de forma estática.
export const dynamic = "force-dynamic";

const ROLES_ADMIN: Rol[] = [Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect("/login?redirect=/admin");
  if (!ROLES_ADMIN.includes(session.rol)) redirect("/login?redirect=/admin");

  return <>{children}</>;
}
