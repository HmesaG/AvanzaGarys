"use client";

// Parte interactiva de /admin/mas. La página es un componente de servidor
// (necesita la sesión para el nombre y el rol) y delega acá lo que requiere
// eventos: los toasts de las opciones futuras y el cierre de sesión real.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Bell, HelpCircle, LogOut, ChevronRight, Building2, Rocket, UserCheck, PhoneCall } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { erpAlert, erpToast, errorToast } from "@/lib/alerts";
import { pedirJson } from "@/lib/api-navegador";
import { ROL_LABEL, iniciales } from "@/lib/admin-formato";
import { Rol } from "@/generated/prisma/client";

const OPCIONES = [
  { icon: Settings, label: "Configuración" },
  { icon: Bell, label: "Notificaciones" },
  { icon: HelpCircle, label: "Ayuda y soporte" },
] as const;

export default function AjustesAdmin({ nombre, rol }: { nombre: string; rol: Rol }) {
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);
  
  const esSecretariaOAdmin = rol === Rol.ADMINISTRADOR || rol === Rol.SECRETARIA;
  const esAdmin = rol === Rol.ADMINISTRADOR;

  async function handleCerrarSesion() {
    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Cerrar sesión?",
      text: "Vas a salir del panel administrativo en este dispositivo.",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    setCerrando(true);
    try {
      await pedirJson("/api/auth/logout", { method: "POST" });
    } catch {
      setCerrando(false);
      errorToast("No se pudo cerrar la sesión. Intentá de nuevo.");
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Más" />

      <main className="mx-auto min-h-dvh max-w-md lg:max-w-6xl px-5 pb-28 pt-6">
        <section className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-850">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-green-light text-sm font-semibold text-avanza-green-dark dark:bg-emerald-950/60 dark:text-emerald-300"
            aria-hidden="true"
          >
            {iniciales(nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{nombre}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{ROL_LABEL[rol]}</p>
          </div>
        </section>

        <ul className="mb-6 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-850">
          {esSecretariaOAdmin && (
            <li>
              <button
                type="button"
                onClick={() => router.push("/admin/secretaria")}
                className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.99]"
              >
                <PhoneCall className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Recepción & Secretaría
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              onClick={() => router.push("/admin/planes-grow")}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.99]"
            >
              <Rocket className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Planes GROW</span>
              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            </button>
          </li>
          {esSecretariaOAdmin && (
            <li>
              <button
                type="button"
                onClick={() => router.push("/admin/empresas")}
                className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.99]"
              >
                <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Empresas</span>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              </button>
            </li>
          )}
          {esAdmin && (
            <li>
              <button
                type="button"
                onClick={() => router.push("/admin/coaches")}
                className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.99]"
              >
                <UserCheck className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Gestión de Coaches</span>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              </button>
            </li>
          )}
          {OPCIONES.map(({ icon: Icon, label }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() =>
                  erpToast.fire({ icon: "info", title: `${label} disponible próximamente` })
                }
                className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.99]"
              >
                <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleCerrarSesion}
          disabled={cerrando}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-5 font-semibold text-red-600 transition-all duration-150 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {cerrando ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </main>
    </PageTransition>
  );
}

