"use client";

// Header verde del panel administrativo. Distinto de BackHeader (cliente):
// los admins no navegan "hacia atrás" entre tabs, viven en un dashboard con
// menú y notificaciones. Menú/campana son placeholders de fase futura, pero
// dan feedback real vía SweetAlert2 (toast) en vez de quedar inertes.
import { Menu, Bell } from "lucide-react";
import { erpToast } from "@/lib/alerts";

export default function AdminHeader({ title }: { title: string }) {
  return (
    <header className="bg-avanza-green px-5 pb-6 pt-8 safe-top">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <button
          type="button"
          onClick={() =>
            erpToast.fire({ icon: "info", title: "Menú disponible próximamente" })
          }
          aria-label="Abrir menú"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/10 active:scale-95"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-lg font-bold text-white">{title}</h1>
        <button
          type="button"
          onClick={() =>
            erpToast.fire({ icon: "info", title: "No tienes notificaciones nuevas" })
          }
          aria-label="Ver notificaciones"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/10 active:scale-95"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
