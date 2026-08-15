"use client";

import { useMemo, useState } from "react";
import { Clock, Video, MapPin } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { TODAS_CITAS_MOCK, type EstadoCita } from "@/lib/admin-mock-data";

const FILTROS: { id: EstadoCita | "todas"; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "confirmada", label: "Confirmadas" },
  { id: "pendiente", label: "Pendientes" },
];

export default function AdminCitasPage() {
  const [filtro, setFiltro] = useState<EstadoCita | "todas">("todas");

  const citasFiltradas = useMemo(() => {
    if (filtro === "todas") return TODAS_CITAS_MOCK;
    return TODAS_CITAS_MOCK.filter((c) => c.estado === filtro);
  }, [filtro]);

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Citas" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        <div
          role="tablist"
          aria-label="Filtrar citas por estado"
          className="mb-5 flex gap-2"
        >
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                filtro === f.id
                  ? "bg-avanza-green text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {citasFiltradas.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            No hay citas en este filtro.
          </p>
        ) : (
          <ul className="space-y-3">
            {citasFiltradas.map((cita) => (
              <li
                key={cita.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-blue-light text-sm font-semibold text-avanza-blue"
                  aria-hidden="true"
                >
                  {cita.clienteIniciales}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {cita.clienteNombre}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {cita.hora}
                    </span>
                    <span className="flex items-center gap-1">
                      {cita.modalidad === "Virtual" ? (
                        <Video className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {cita.modalidad}
                    </span>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    cita.estado === "confirmada"
                      ? "bg-avanza-green-light text-avanza-green-dark"
                      : "bg-avanza-orange-light text-avanza-orange"
                  }`}
                >
                  {cita.estado === "confirmada" ? "Confirmada" : "Pendiente"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </PageTransition>
  );
}
