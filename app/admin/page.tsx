// Dashboard del panel administrativo. Es un componente de servidor: no tiene
// interacción propia y necesita la sesión, así que lee las queries directamente
// (`lib/admin-queries.ts` se escribió para esto) en vez de pegarle a
// `/api/admin/*` — un fetch a la propia API desde el servidor exigiría URL
// absoluta y reenviar la cookie a mano para llegar a los mismos datos.
import { Users, Calendar, Clock, DollarSign, CalendarX, AlertTriangle, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import EvaluacionesPendientes from "./EvaluacionesPendientes";
import AdminAnalyticsChart from "@/components/AdminAnalyticsChart";
import { requireSesionPagina } from "@/lib/auth";
import { listarCitas, statsDashboard, obtenerMetricasGraficos } from "@/lib/admin-queries";
import { obtenerAlertasSistema } from "@/lib/admin-alertas";
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

  const [stats, citasDelRango, alertas, metricasGraficos] = await Promise.all([
    statsDashboard(),
    listarCitas({ desde, hasta }),
    obtenerAlertasSistema(usuario.rol === Rol.COACH ? usuario.id : undefined),
    obtenerMetricasGraficos(),
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

        <AdminAnalyticsChart data={metricasGraficos} />

        {alertas.total > 0 && (
          <section aria-label="Alertas del sistema" className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                Alertas prioritarias
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {alertas.total} caso{alertas.total === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-2.5">
              {alertas.items.slice(0, 4).map((alerta) => (
                <Link
                  key={alerta.id}
                  href={alerta.enlace}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-avanza-green/50 active:scale-[0.99]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          alerta.severidad === "urgente"
                            ? "bg-red-500"
                            : alerta.severidad === "atencion"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <p className="text-xs font-semibold text-gray-900">{alerta.titulo}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 leading-relaxed">{alerta.descripcion}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Acciones Rápidas de Reportes */}
        <div className="mb-6 flex gap-2.5">
          <a
            href="/api/admin/citas/exportar"
            download
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white py-2.5 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-750"
          >
            <Download className="h-3.5 w-3.5 text-avanza-green dark:text-emerald-400" />
            <span>Coaching Log ICF</span>
          </a>
          <a
            href="/api/admin/pagos/exportar"
            download
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white py-2.5 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-750"
          >
            <Download className="h-3.5 w-3.5 text-avanza-orange" />
            <span>Reporte Pagos (CSV)</span>
          </a>
        </div>

        <EvaluacionesPendientes />

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
