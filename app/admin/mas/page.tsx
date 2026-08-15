"use client";

import { MoreHorizontal } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";

export default function AdminMasPage() {
  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Más" />

      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 pb-28 pt-6 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-avanza-orange-light"
          aria-hidden="true"
        >
          <MoreHorizontal className="h-7 w-7 text-avanza-orange" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-gray-900">Próximamente</h2>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          Configuración y opciones adicionales llegarán en una fase futura.
        </p>
      </main>

    </PageTransition>
  );
}
