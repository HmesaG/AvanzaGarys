"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  Rocket,
  UserCheck,
  PhoneCall,
  Download,
  LogOut,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { iniciales, ROL_LABEL } from "@/lib/admin-formato";
import { Rol } from "@/generated/prisma/client";
import { erpAlert, errorToast } from "@/lib/alerts";
import { pedirJson } from "@/lib/api-navegador";

export type AdminUsuarioSesion = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
};

export default function AdminSidebar({ usuario }: { usuario: AdminUsuarioSesion }) {
  const pathname = usePathname();
  const router = useRouter();

  const esSecretariaOAdmin =
    usuario.rol === Rol.ADMINISTRADOR || usuario.rol === Rol.SECRETARIA;

  const enlaces = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
      visible: true,
    },
    {
      href: "/admin/secretaria",
      label: "Recepción & Secretaría",
      icon: PhoneCall,
      exact: false,
      visible: esSecretariaOAdmin,
      destacado: usuario.rol === Rol.SECRETARIA,
    },
    {
      href: "/admin/citas",
      label: "Agenda & Citas",
      icon: Calendar,
      exact: false,
      visible: true,
    },
    {
      href: "/admin/clientes",
      label: "Clientes & Coachees",
      icon: Users,
      exact: false,
      visible: true,
    },
    {
      href: "/admin/planes-grow",
      label: "Planes GROW",
      icon: Rocket,
      exact: false,
      visible: true,
    },
    {
      href: "/admin/empresas",
      label: "Empresas B2B",
      icon: Building2,
      exact: false,
      visible: esSecretariaOAdmin,
    },
    {
      href: "/admin/coaches",
      label: "Gestión de Coaches",
      icon: UserCheck,
      exact: false,
      visible: usuario.rol === Rol.ADMINISTRADOR,
    },
  ];

  async function handleCerrarSesion() {
    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Cerrar sesión?",
      text: "Vas a salir del panel administrativo en este equipo.",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      await pedirJson("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      errorToast("No se pudo cerrar la sesión.");
    }
  }

  const badgeRolColor =
    usuario.rol === Rol.SECRETARIA
      ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
      : usuario.rol === Rol.COACH
      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";

  return (
    <aside
      aria-label="Barra lateral de administración"
      className="hidden lg:flex w-64 xl:w-72 flex-col justify-between shrink-0 border-r border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 sticky top-0 h-screen select-none overflow-y-auto"
    >
      <div>
        {/* Logo y Encabezado de Marca */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-avanza-green text-white font-bold shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-gray-900 dark:text-white">
                AvanzA<span className="text-avanza-green font-normal">.do</span>
              </span>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Coaching Platform
              </p>
            </div>
          </Link>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" title="Sistema en línea" />
        </div>

        {/* Perfil del Usuario Activo */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/50">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-avanza-green-light font-bold text-avanza-green-dark dark:bg-emerald-950/60 dark:text-emerald-300 text-xs">
            {iniciales(usuario.nombre)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
              {usuario.nombre}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badgeRolColor}`}>
                {ROL_LABEL[usuario.rol]}
              </span>
            </div>
          </div>
        </div>

        {/* Navegación Principal */}
        <nav aria-label="Menú de escritorio">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3">
            Navegación
          </p>
          <ul className="space-y-1">
            {enlaces
              .filter((e) => e.visible)
              .map(({ href, label, icon: Icon, exact, destacado }) => {
                const active = exact
                  ? pathname === href
                  : pathname === href || pathname?.startsWith(href + "/");

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                        active
                          ? "bg-avanza-green text-white shadow-sm shadow-emerald-600/20"
                          : destacado
                          ? "bg-sky-50 text-sky-800 font-bold hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : destacado ? "text-sky-600 dark:text-sky-400" : "text-gray-400 dark:text-gray-500"}`} />
                      <span className="flex-1 truncate">{label}</span>
                      {destacado && !active && (
                        <Sparkles className="h-3 w-3 text-sky-500 animate-pulse" />
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>

        {/* Acceso Rápido a Reportes */}
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3">
            Descargas Oficiales
          </p>
          <div className="space-y-1.5">
            <a
              href="/api/admin/citas/exportar"
              download
              className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-avanza-green dark:text-emerald-400 shrink-0" />
              <span className="truncate">Coaching Log (ICF CSV)</span>
            </a>
            {esSecretariaOAdmin && (
              <a
                href="/api/admin/pagos/exportar"
                download
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-avanza-orange shrink-0" />
                <span className="truncate">Reporte Pagos (Excel)</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Pie de Barra Lateral */}
      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Modo de pantalla</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={handleCerrarSesion}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200/80 bg-red-50/50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100/70 transition-colors active:scale-95 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/40"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
