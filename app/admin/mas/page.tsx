// Nombre y rol salen de la sesión de servidor, igual que en el dashboard: es el
// mismo mecanismo que ya usa `app/admin/layout.tsx` y evita un `/api/auth/me`
// en el cliente sólo para pintar dos líneas de texto.
import { requireSesionPagina } from "@/lib/auth";
import { Rol } from "@/generated/prisma/client";
import AjustesAdmin from "./AjustesAdmin";

export default async function AdminMasPage() {
  const usuario = await requireSesionPagina(
    Rol.ADMINISTRADOR,
    Rol.COACH,
    Rol.SECRETARIA,
  );

  return <AjustesAdmin nombre={usuario.nombre} rol={usuario.rol} />;
}
