"use client";

import { useRouter } from "next/navigation";
import { Settings, Bell, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { erpAlert, erpToast } from "@/lib/alerts";
import { ADMIN_MOCK } from "@/lib/admin-mock-data";

const OPCIONES = [
  { icon: Settings, label: "Configuración" },
  { icon: Bell, label: "Notificaciones" },
  { icon: HelpCircle, label: "Ayuda y soporte" },
] as const;

export default function AdminMasPage() {
  const router = useRouter();

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

    router.push("/login");
  }

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Más" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        <section className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-green-light text-sm font-semibold text-avanza-green-dark"
            aria-hidden="true"
          >
            {ADMIN_MOCK.nombre.slice(0, 1)}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{ADMIN_MOCK.nombre}</p>
            <p className="text-xs text-gray-500">{ADMIN_MOCK.rol}</p>
          </div>
        </section>

        <ul className="mb-6 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {OPCIONES.map(({ icon: Icon, label }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() =>
                  erpToast.fire({ icon: "info", title: `${label} disponible próximamente` })
                }
                className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-gray-50 active:scale-[0.99]"
              >
                <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
                <ChevronRight className="h-4 w-4 text-gray-300" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleCerrarSesion}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-5 font-semibold text-red-600 transition-all duration-150 hover:bg-red-50 active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </main>
    </PageTransition>
  );
}
