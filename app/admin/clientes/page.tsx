"use client";

import { useMemo, useState } from "react";
import { Search, Phone, Mail } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { CLIENTES_MOCK, type LineaAsesoriaAdmin } from "@/lib/admin-mock-data";

const LINEA_BADGE: Record<LineaAsesoriaAdmin, string> = {
  Personal: "bg-avanza-green-light text-avanza-green-dark",
  Corporativo: "bg-avanza-blue-light text-avanza-blue",
  Deportivo: "bg-avanza-orange-light text-avanza-orange",
};

export default function AdminClientesPage() {
  const [busqueda, setBusqueda] = useState("");

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return CLIENTES_MOCK;
    return CLIENTES_MOCK.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [busqueda]);

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Clientes" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        <label className="relative mb-5 block">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente por nombre"
            aria-label="Buscar cliente por nombre"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-avanza-green focus:outline-none focus:ring-2 focus:ring-avanza-green/20"
          />
        </label>

        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
          {clientesFiltrados.length} cliente{clientesFiltrados.length === 1 ? "" : "s"}
        </p>

        {clientesFiltrados.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            No se encontraron clientes con ese nombre.
          </p>
        ) : (
          <ul className="space-y-3">
            {clientesFiltrados.map((cliente) => (
              <li
                key={cliente.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-green-light text-sm font-semibold text-avanza-green-dark"
                    aria-hidden="true"
                  >
                    {cliente.iniciales}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {cliente.nombre}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${LINEA_BADGE[cliente.linea]}`}
                      >
                        {cliente.linea}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-gray-500">
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {cliente.telefono}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        {cliente.correo}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </PageTransition>
  );
}
