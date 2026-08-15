"use client";

import { Users, Calendar, Clock, DollarSign } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import {
  ADMIN_MOCK,
  DASHBOARD_STATS_MOCK,
  PROXIMAS_CITAS_MOCK,
  formatIngresos,
} from "@/lib/admin-mock-data";

const STATS = [
  {
    label: "Clientes activos",
    value: DASHBOARD_STATS_MOCK.clientesActivos.toString(),
    icon: Users,
    color: "text-avanza-green",
    bg: "bg-avanza-green-light",
  },
  {
    label: "Citas hoy",
    value: DASHBOARD_STATS_MOCK.citasHoy.toString(),
    icon: Calendar,
    color: "text-avanza-blue",
    bg: "bg-avanza-blue-light",
  },
  {
    label: "Pendientes",
    value: DASHBOARD_STATS_MOCK.pendientes.toString(),
    icon: Clock,
    color: "text-avanza-orange",
    bg: "bg-avanza-orange-light",
  },
  {
    label: "Ingresos (mes)",
    value: formatIngresos(DASHBOARD_STATS_MOCK.ingresosMes),
    icon: DollarSign,
    color: "text-avanza-green",
    bg: "bg-avanza-green-light",
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Panel administrativo" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Hola, {ADMIN_MOCK.nombre}
          </h2>
          <p className="mt-1 text-sm text-gray-500">Aquí tienes un resumen general</p>
        </section>

        <section aria-label="Resumen general" className="mb-6 grid grid-cols-2 gap-3">
          {STATS.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${bg}`}
              >
                <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
              </span>
              <p className="mt-3 text-2xl font-bold tabular-nums text-gray-900">
                {value}
              </p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </section>

        <section aria-label="Próximas citas">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Próximas citas
          </h2>
          <ul className="space-y-2">
            {PROXIMAS_CITAS_MOCK.map((cita) => (
              <li
                key={cita.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-avanza-green-light text-sm font-semibold text-avanza-green-dark"
                  aria-hidden="true"
                >
                  {cita.clienteIniciales}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {cita.clienteNombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    {cita.hora} · {cita.modalidad}
                  </p>
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
        </section>
      </main>

    </PageTransition>
  );
}
