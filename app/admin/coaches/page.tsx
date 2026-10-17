"use client";

import { useEffect, useState, useTransition } from "react";
import {
  UserCheck,
  UserX,
  Users,
  CalendarCheck,
  CalendarClock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Briefcase,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { erpToast, errorToast } from "@/lib/alerts";
import { pedirJson, ErrorApi } from "@/lib/api-navegador";
import { LINEA_BADGE, LINEA_LABEL, iniciales } from "@/lib/admin-formato";
import type { LineaAsesoria } from "@/generated/prisma/client";

interface CoacheeItem {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  linea: LineaAsesoria;
}

interface CoachData {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  coacheesActivos: number;
  citasCompletadas: number;
  citasPendientes: number;
  clientes: CoacheeItem[];
}

export default function CoachesAdminPage() {
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [sinAsignar, setSinAsignar] = useState<CoacheeItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);

  // Modal de reasignación
  const [modalReasignar, setModalReasignar] = useState<{
    cliente: CoacheeItem;
    coachActualId: string | null;
  } | null>(null);
  const [coachSeleccionadoId, setCoachSeleccionadoId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  async function cargarDatos() {
    try {
      const data = await pedirJson<{ coaches: CoachData[]; sinAsignar: CoacheeItem[] }>(
        "/api/admin/coaches",
      );
      setCoaches(data.coaches || []);
      setSinAsignar(data.sinAsignar || []);
    } catch (err: unknown) {
      const mensaje = err instanceof ErrorApi ? err.message : "No se pudo cargar la información de coaches";
      errorToast(mensaje);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function handleAbrirReasignar(cliente: CoacheeItem, coachActualId: string | null) {
    setModalReasignar({ cliente, coachActualId });
    setCoachSeleccionadoId(coachActualId || "");
  }

  async function handleConfirmarReasignacion() {
    if (!modalReasignar) return;

    startTransition(async () => {
      try {
        await pedirJson("/api/admin/coaches", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clienteId: modalReasignar.cliente.id,
            coachId: coachSeleccionadoId || null,
          }),
        });

        erpToast.fire({
          icon: "success",
          title: "Asignación actualizada correctamente",
        });

        setModalReasignar(null);
        await cargarDatos();
      } catch (err: unknown) {
        const mensaje = err instanceof ErrorApi ? err.message : "Error al reasignar el coachee";
        errorToast(mensaje);
      }
    });
  }

  const totalCoacheesAsignados = coaches.reduce((acc, c) => acc + c.coacheesActivos, 0);

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Gestión de Coaches" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        {/* Encabezado */}
        <section className="mb-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-avanza-green-light text-avanza-green">
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Directorio y Asignaciones
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Balance de carga y carteras de coachees activos
              </p>
            </div>
          </div>
        </section>

        {/* Métricas rápidas */}
        <section className="mb-6 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{coaches.length}</p>
            <p className="text-[11px] font-medium text-gray-500">Coaches</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-avanza-green">{totalCoacheesAsignados}</p>
            <p className="text-[11px] font-medium text-gray-500">Asignados</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p
              className={`text-2xl font-bold ${
                sinAsignar.length > 0 ? "text-amber-500" : "text-gray-400"
              }`}
            >
              {sinAsignar.length}
            </p>
            <p className="text-[11px] font-medium text-gray-500">Sin coach</p>
          </div>
        </section>

        {cargando ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-avanza-green" />
            <p className="mt-2 text-xs">Cargando coaches...</p>
          </div>
        ) : (
          <>
            {/* Clientes sin coach */}
            {sinAsignar.length > 0 && (
              <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Coachees esperando asignación ({sinAsignar.length})
                    </h3>
                  </div>
                </div>

                <div className="space-y-2">
                  {sinAsignar.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm border border-amber-100 dark:bg-gray-900 dark:border-gray-800"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                          {cliente.nombre}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {LINEA_LABEL[cliente.linea]} · {cliente.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAbrirReasignar(cliente, null)}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-avanza-green px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-avanza-green/90 active:scale-95"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Asignar
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Listado de Coaches */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Equipo de Coaches
              </h3>

              {coaches.map((coach) => {
                const isExpanded = expandedCoachId === coach.id;
                // Workload indicator: 0-3 (ligera), 4-8 (equilibrada), 9+ (alta)
                const cargaColor =
                  coach.coacheesActivos > 8
                    ? "bg-red-500 text-red-500"
                    : coach.coacheesActivos > 4
                    ? "bg-emerald-500 text-emerald-500"
                    : "bg-blue-500 text-blue-500";

                return (
                  <div
                    key={coach.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-avanza-green dark:bg-emerald-950/40">
                            {iniciales(coach.nombre)}
                          </span>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                              {coach.nombre}
                            </h4>
                            <p className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{coach.email}</span>
                            </p>
                          </div>
                        </div>

                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <span className={`h-2 w-2 rounded-full ${cargaColor.split(" ")[0]}`} />
                          {coach.coacheesActivos} Coachees
                        </span>
                      </div>

                      {/* Resumen de actividad */}
                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs dark:border-gray-800/80">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <CalendarCheck className="h-3.5 w-3.5 text-avanza-green" />
                          <span>{coach.citasCompletadas} sesiones hechas</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <CalendarClock className="h-3.5 w-3.5 text-blue-500" />
                          <span>{coach.citasPendientes} próximas</span>
                        </div>
                      </div>

                      {/* Botón ver coachees */}
                      <button
                        type="button"
                        onClick={() => setExpandedCoachId(isExpanded ? null : coach.id)}
                        className="mt-3 flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors dark:bg-gray-800/60 dark:text-gray-300"
                      >
                        <span>
                          {isExpanded
                            ? "Ocultar cartera de coachees"
                            : `Ver cartera (${coach.clientes.length})`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Despliegue de coachees */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-3 space-y-2 dark:border-gray-800 dark:bg-gray-950/30">
                        {coach.clientes.length === 0 ? (
                          <p className="py-2 text-center text-xs text-gray-400">
                            Sin coachees asignados actualmente
                          </p>
                        ) : (
                          coach.clientes.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-white p-2.5 shadow-xs dark:border-gray-800 dark:bg-gray-900"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                                  {c.nombre}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                  <span
                                    className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${LINEA_BADGE[c.linea]}`}
                                  >
                                    {LINEA_LABEL[c.linea]}
                                  </span>
                                  {c.telefono && (
                                    <span className="flex items-center gap-0.5">
                                      <Phone className="h-2.5 w-2.5" />
                                      {c.telefono}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAbrirReasignar(c, coach.id)}
                                title="Reasignar a otro coach"
                                className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                <ArrowRightLeft className="h-3 w-3 text-avanza-green" />
                                Reasignar
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          </>
        )}
      </main>

      {/* Modal Reasignar Coach */}
      {modalReasignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl animate-fade-in dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-avanza-green">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Asignación de Coach
              </h3>
            </div>

            <p className="text-xs text-gray-500 mb-4 dark:text-gray-400">
              Coachee:{" "}
              <strong className="text-gray-800 dark:text-gray-200">
                {modalReasignar.cliente.nombre}
              </strong>
            </p>

            <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">
              Seleccionar nuevo Coach:
            </label>
            <select
              value={coachSeleccionadoId}
              onChange={(e) => setCoachSeleccionadoId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">-- Sin Coach Asignado --</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.coacheesActivos} coachees actuales)
                </option>
              ))}
            </select>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModalReasignar(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 active:scale-98 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarReasignacion}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-avanza-green py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-avanza-green/90 active:scale-98 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
