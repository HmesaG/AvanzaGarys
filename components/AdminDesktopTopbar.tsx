"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, ShieldCheck } from "lucide-react";
import { erpAlert, erpToast } from "@/lib/alerts";
import { ROL_LABEL } from "@/lib/admin-formato";
import type { AdminUsuarioSesion } from "./AdminSidebar";

export default function AdminDesktopTopbar({ usuario }: { usuario: AdminUsuarioSesion }) {
  const router = useRouter();
  const [totalAlertas, setTotalAlertas] = useState(0);
  const [alertas, setAlertas] = useState<{ id: string; titulo: string; descripcion: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/alertas")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alertas) {
          setTotalAlertas(data.alertas.total);
          setAlertas(data.alertas.items || []);
        }
      })
      .catch(() => {});
  }, []);

  async function handleVerNotificaciones() {
    if (totalAlertas === 0) {
      erpToast.fire({ icon: "info", title: "No hay alertas pendientes" });
      return;
    }

    const htmlContent = `
      <div style="text-align: left; max-height: 280px; overflow-y: auto; padding: 4px;">
        ${alertas
          .slice(0, 5)
          .map(
            (a) => `
          <div style="margin-bottom: 10px; padding: 10px; border-radius: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <p style="font-weight: 600; font-size: 13px; color: #0f172a; margin: 0;">${a.titulo}</p>
            <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">${a.descripcion}</p>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    const result = await erpAlert.fire({
      title: `Centro de Alertas (${totalAlertas})`,
      html: htmlContent,
      showCancelButton: true,
      confirmButtonText: "Ir al Dashboard",
      cancelButtonText: "Cerrar",
    });

    if (result.isConfirmed) {
      router.push("/admin");
    }
  }

  return (
    <header className="hidden lg:flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-md sticky top-0 z-30 dark:border-gray-800 dark:bg-gray-900/80">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-avanza-green dark:bg-emerald-950/40 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Panel de Gestión Web</span>
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Acceso como {ROL_LABEL[usuario.rol]}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Notificaciones */}
        <button
          type="button"
          onClick={handleVerNotificaciones}
          title="Ver alertas del sistema"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Bell className="h-4 w-4" />
          {totalAlertas > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
              {totalAlertas > 9 ? "9+" : totalAlertas}
            </span>
          )}
        </button>

        {/* Info usuario */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-gray-800">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
              {usuario.nombre}
            </p>
            <p className="text-[10px] text-gray-400 leading-tight">
              {usuario.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
