import type { ReactNode } from "react";
import { requireSesionPagina } from "@/lib/auth";
import { Rol } from "@/generated/prisma/client";
import AdminSidebar from "@/components/AdminSidebar";
import AdminDesktopTopbar from "@/components/AdminDesktopTopbar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const usuario = await requireSesionPagina(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

  const sesionUsuario = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <AdminSidebar usuario={sesionUsuario} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminDesktopTopbar usuario={sesionUsuario} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
