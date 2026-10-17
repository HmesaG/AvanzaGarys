"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { erpAlert, erpToast } from "@/lib/alerts";

type AlertaItem = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  severidad: string;
  enlace: string;
};

export default function AdminHeader({ title }: { title: string }) {
  const router = useRouter();
  const [totalAlertas, setTotalAlertas] = useState(0);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/alertas")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alertas) {
          setTotalAlertas(data.alertas.total);
          setAlertas(data.alertas.items);
        }
      })
      .catch(() => {
        // Silencioso
      });
  }, []);

  async function handleVerNotificaciones() {
    if (totalAlertas === 0) {
      erpToast.fire({ icon: "info", title: "No tienes notificaciones pendientes" });
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
      title: `Notificaciones (${totalAlertas})`,
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
    <header className="bg-avanza-green px-5 pb-6 pt-8 safe-top">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/admin/mas")}
          aria-label="Abrir menú"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/10 active:scale-95"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <h1 className="text-lg font-bold text-white">{title}</h1>

        <button
          type="button"
          onClick={handleVerNotificaciones}
          aria-label="Ver notificaciones"
          className="relative flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/10 active:scale-95"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {totalAlertas > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-avanza-green">
              {totalAlertas > 9 ? "9+" : totalAlertas}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
