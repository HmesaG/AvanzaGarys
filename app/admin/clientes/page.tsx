"use client";

import { Users } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";

export default function AdminClientesPage() {
  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Clientes" />

      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 pb-28 pt-6 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-avanza-green-light"
          aria-hidden="true"
        >
          <Users className="h-7 w-7 text-avanza-green" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-gray-900">Próximamente</h2>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          La gestión de clientes estará disponible en una fase futura.
        </p>
      </main>

    </PageTransition>
  );
}
