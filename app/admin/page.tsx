// Dashboard del panel administrativo. Es un componente de servidor: no tiene
// interacción propia y necesita la sesión, así que lee las queries directamente
// (`lib/admin-queries.ts` se escribió para esto) en vez de pegarle a
// `/api/admin/*` — un fetch a la propia API desde el servidor exigiría URL
// absoluta y reenviar la cookie a mano para llegar a los mismos datos.
import { Users, Calendar, Clock, DollarSign, CalendarX } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { requireSesionPagina } from "@/lib/auth";
import { listarCitas, statsDashboard } from "@/lib/admin-queries";
import {
  ESTADO_CITA_BADGE,
  ESTADO_CITA_LABEL,
  ROL_LABEL,
  formatFechaCorta,
  formatHora,
  formatIngresos,
  iniciales,
  primerNombre,
} from "@/lib/admin-formato";
import { EstadoCita, Rol } from "@/generated/prisma/client";

/**
 * "Próximas citas" = desde el arranque de hoy y una semana hacia adelante.
 * Arranca a las 00:00 y no en "ahora" a propósito: un coach que abre el panel a
 * media tarde sigue queriendo ver la agenda completa del día, y así la lista es
 * coherente con la tarjeta "Citas hoy" de arriba.
 */
const DIAS_PROXIMAS_CITAS = 7;
const MAX_PROXIMAS_CITAS = 5;

export default async function AdminDashboardPage() {
  const usuario = await requireSesionPagina(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);

  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const hasta = new Date(desde);
  hasta.setDate(hasta.getDate() + DIAS_PROXIMAS_CITAS);

  const [stats, citasDelRango] = await Promise.all([
    statsDashboard(),
    listarCitas({ desde, hasta }),
  ]);

  // Una cita cancelada no es una "próxima cita"; el resto sí se muestra.
  const proximasCitas = citasDelRango
    .filter((cita) => cita.estado !== EstadoCita.CANCELADA)
    .slice(0, MAX_PROXIMAS_CITAS);

  const tarjetas = [
    {
      label: "Clientes activos",
      value: stats.clientesActivos.toString(),
      icon: Users,
      color: "text-avanza-green",
      bg: "bg-avanza-green-light",
    },
    {
      label: "Citas hoy",
      value: stats.citasHoy.toString(),
      icon: Calendar,
      color: "text-avanza-blue",
      bg: "bg-avanza-blue-light",
    },
    {
      label: "Pendientes",
      value: stats.evaluacionesPendientes.toString(),
      icon: Clock,
      color: "text-avanza-orange",
      bg: "bg-avanza-orange-light",
    },
    {
      label: "Ingresos (mes)",
      value: formatIngresos(stats.ingresosMes),
      icon: DollarSign,
      color: "text-avanza-green",
      bg: "bg-avanza-green-light",
    },
  ];

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Panel administrativo" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Hola, {primerNombre(usuario.nombre)}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {ROL_LABEL[usuario.rol]} · Aquí tienes un resumen general
          </p>
        </section>

        <section aria-label="Resumen general" className="mb-6 grid grid-cols-2 gap-3">
          {tarjetas.map(({ label, value, icon: Icon, color, bg }) => (
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
          {proximasCitas.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
              <CalendarX className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              No hay citas agendadas para los próximos {DIAS_PROXIMAS_CITAS} días.
            </div>
          ) : (
            <ul className="space-y-2">
              {proximasCitas.map((cita) => (
                <li
                  key={cita.id}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-avanza-green-light text-sm font-semibold text-avanza-green-dark"
                    aria-hidden="true"
                  >
                    {iniciales(cita.cliente.usuario.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {cita.cliente.usuario.nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFechaCorta(cita.fecha)} · {formatHora(cita.fecha)} ·{" "}
                      {cita.modalidad}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_CITA_BADGE[cita.estado]}`}
                  >
                    {ESTADO_CITA_LABEL[cita.estado]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
