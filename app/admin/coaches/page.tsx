"use client";

import { useEffect, useState, useTransition } from "react";
import {
  UserCheck,
  UserPlus,
  CalendarCheck,
  CalendarClock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  Check,
  DollarSign,
  Percent,
  Sliders,
  X,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { erpToast, errorToast } from "@/lib/alerts";
import { pedirJson, ErrorApi } from "@/lib/api-navegador";
import { LINEA_BADGE, LINEA_LABEL, formatMonto, iniciales } from "@/lib/admin-formato";
import type { EsquemaHonorario, LineaAsesoria, Rol } from "@/generated/prisma/client";

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
  esquemaHonorario: EsquemaHonorario;
  valorHonorario: number | null;
  disponibilidad: {
    dias?: string[];
    horaInicio?: string;
    horaFin?: string;
    modalidadPreferida?: string;
  } | null;
  coacheesActivos: number;
  citasCompletadas: number;
  citasCompletadasMes: number;
  citasPendientes: number;
  recaudadoMes: number;
  liquidacionEstimadaMes: number | null;
  clientes: CoacheeItem[];
}

const OPCIONES_ESQUEMA: { value: EsquemaHonorario; label: string }[] = [
  { value: "SIN_DEFINIR", label: "Por definir (aún sin monto ni %)" },
  { value: "PORCENTAJE", label: "Porcentaje de comisión (%)" },
  { value: "FIJO_POR_SESION", label: "Monto fijo por sesión ($)" },
  { value: "FIJO_MENSUAL", label: "Monto fijo mensual ($)" },
];

function badgeHonorario(esquema: EsquemaHonorario, valor: number | null): string {
  if (esquema === "PORCENTAJE") return `Comisión: ${valor ?? 0}%`;
  if (esquema === "FIJO_POR_SESION") return `Pago: ${formatMonto(valor ?? 0)} / sesión`;
  if (esquema === "FIJO_MENSUAL") return `Pago: ${formatMonto(valor ?? 0)} / mes`;
  return "Honorarios: Por definir";
}

export default function CoachesAdminPage() {
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [sinAsignar, setSinAsignar] = useState<CoacheeItem[]>([]);
  const [rolActual, setRolActual] = useState<Rol>("ADMINISTRADOR");
  const [cargando, setCargando] = useState(true);
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);

  // Modal de reasignación de paciente
  const [modalReasignar, setModalReasignar] = useState<{
    cliente: CoacheeItem;
    coachActualId: string | null;
  } | null>(null);
  const [coachSeleccionadoId, setCoachSeleccionadoId] = useState<string>("");

  // Modal de Alta de Nuevo Miembro Externo
  const [modalNuevoCoach, setModalNuevoCoach] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("Avanza2026!");
  const [nuevoEsquema, setNuevoEsquema] = useState<EsquemaHonorario>("SIN_DEFINIR");
  const [nuevoValor, setNuevoValor] = useState("");

  // Modal de Acuerdo de Pago / Comisión
  const [modalAcuerdoCoach, setModalAcuerdoCoach] = useState<CoachData | null>(null);
  const [acuerdoEsquema, setAcuerdoEsquema] = useState<EsquemaHonorario>("SIN_DEFINIR");
  const [acuerdoValor, setAcuerdoValor] = useState("");

  const [isPending, startTransition] = useTransition();

  async function cargarDatos() {
    try {
      const data = await pedirJson<{
        coaches: CoachData[];
        sinAsignar: CoacheeItem[];
        rolActual?: Rol;
      }>("/api/admin/coaches");
      setCoaches(data.coaches || []);
      setSinAsignar(data.sinAsignar || []);
      if (data.rolActual) setRolActual(data.rolActual);
    } catch (err: unknown) {
      const mensaje =
        err instanceof ErrorApi ? err.message : "No se pudo cargar la información de coaches";
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

  async function handleCrearMiembroExterno() {
    startTransition(async () => {
      try {
        await pedirJson("/api/admin/coaches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nuevoNombre,
            email: nuevoEmail,
            password: nuevoPassword,
            esquemaHonorario: nuevoEsquema,
            valorHonorario: nuevoEsquema === "SIN_DEFINIR" ? null : Number(nuevoValor || 0),
          }),
        });

        erpToast.fire({
          icon: "success",
          title: "Miembro externo registrado con éxito",
        });

        setModalNuevoCoach(false);
        setNuevoNombre("");
        setNuevoEmail("");
        setNuevoPassword("Avanza2026!");
        setNuevoEsquema("SIN_DEFINIR");
        setNuevoValor("");
        await cargarDatos();
      } catch (err: unknown) {
        const mensaje =
          err instanceof ErrorApi ? err.message : "No se pudo crear el miembro externo";
        errorToast(mensaje);
      }
    });
  }

  function handleAbrirAcuerdo(coach: CoachData) {
    setModalAcuerdoCoach(coach);
    setAcuerdoEsquema(coach.esquemaHonorario);
    setAcuerdoValor(coach.valorHonorario !== null ? String(coach.valorHonorario) : "");
  }

  async function handleGuardarAcuerdo() {
    if (!modalAcuerdoCoach) return;

    startTransition(async () => {
      try {
        await pedirJson("/api/admin/coaches", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coachId: modalAcuerdoCoach.id,
            esquemaHonorario: acuerdoEsquema,
            valorHonorario: acuerdoEsquema === "SIN_DEFINIR" ? null : Number(acuerdoValor || 0),
          }),
        });

        erpToast.fire({
          icon: "success",
          title: "Acuerdo de pago actualizado",
        });

        setModalAcuerdoCoach(null);
        await cargarDatos();
      } catch (err: unknown) {
        const mensaje =
          err instanceof ErrorApi ? err.message : "No se pudo actualizar el acuerdo de pago";
        errorToast(mensaje);
      }
    });
  }

  const totalCoacheesAsignados = coaches.reduce((acc, c) => acc + c.coacheesActivos, 0);
  const esAdmin = rolActual === "ADMINISTRADOR";

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Miembros Externos y Coaches" />

      <main className="mx-auto min-h-dvh max-w-md lg:max-w-5xl px-5 pb-28 pt-6">
        {/* Encabezado y Alta de Miembro Externo */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-avanza-green-light text-avanza-green">
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Miembros Externos y Comisiones
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Especialistas asociados, carteras de pacientes y acuerdos de honorarios
              </p>
            </div>
          </div>

          {esAdmin && (
            <button
              type="button"
              onClick={() => setModalNuevoCoach(true)}
              className="flex items-center gap-1.5 rounded-xl bg-avanza-green px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-avanza-green/90 active:scale-95 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Nuevo Miembro Externo</span>
            </button>
          )}
        </section>

        {/* Métricas rápidas */}
        <section className="mb-6 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{coaches.length}</p>
            <p className="text-[11px] font-medium text-gray-500">Miembros</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-avanza-green">{totalCoacheesAsignados}</p>
            <p className="text-[11px] font-medium text-gray-500">Pacientes asignados</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p
              className={`text-2xl font-bold ${
                sinAsignar.length > 0 ? "text-amber-500" : "text-gray-400"
              }`}
            >
              {sinAsignar.length}
            </p>
            <p className="text-[11px] font-medium text-gray-500">Sin asignar</p>
          </div>
        </section>

        {cargando ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-avanza-green" />
            <p className="mt-2 text-xs">Cargando miembros externos...</p>
          </div>
        ) : (
          <>
            {/* Clientes sin coach */}
            {rolActual !== "COACH" && sinAsignar.length > 0 && (
              <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Pacientes esperando asignación ({sinAsignar.length})
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
                Equipo de Especialistas Asociados
              </h3>

              {coaches.map((coach) => {
                const isExpanded = expandedCoachId === coach.id;
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
                        <div className="flex items-center gap-3 min-w-0">
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
                            {coach.disponibilidad?.dias && coach.disponibilidad.dias.length > 0 && (
                              <p className="mt-1 text-[11px] text-avanza-blue font-medium">
                                Horario: {coach.disponibilidad.dias.join(", ")} ({coach.disponibilidad.horaInicio} - {coach.disponibilidad.horaFin})
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <span className={`h-2 w-2 rounded-full ${cargaColor.split(" ")[0]}`} />
                          {coach.coacheesActivos} Pacientes
                        </span>
                      </div>

                      {/* Acuerdo de Honorarios y Liquidación del Mes (para Administración) */}
                      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              coach.esquemaHonorario === "SIN_DEFINIR"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }`}
                          >
                            {coach.esquemaHonorario === "PORCENTAJE" ? (
                              <Percent className="h-3.5 w-3.5" />
                            ) : (
                              <DollarSign className="h-3.5 w-3.5" />
                            )}
                            {badgeHonorario(coach.esquemaHonorario, coach.valorHonorario)}
                          </span>

                          {esAdmin && (
                            <button
                              type="button"
                              onClick={() => handleAbrirAcuerdo(coach)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 active:scale-95 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                              <Sliders className="h-3 w-3 text-avanza-green" />
                              Acuerdo de Pago
                            </button>
                          )}
                        </div>

                        {esAdmin && (
                          <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-gray-200/70 pt-2 text-[11px] text-gray-600 dark:border-gray-700 dark:text-gray-400">
                            <div>
                              <span className="block text-gray-400">Recaudado por el centro (mes)</span>
                              <strong className="text-xs text-gray-900 dark:text-white">
                                {formatMonto(coach.recaudadoMes)}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-gray-400">Liquidación a pagar al miembro</span>
                              <strong className="text-xs text-avanza-green">
                                {coach.liquidacionEstimadaMes !== null
                                  ? formatMonto(coach.liquidacionEstimadaMes)
                                  : "Por definir"}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resumen de actividad */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <CalendarCheck className="h-3.5 w-3.5 text-avanza-green" />
                          <span>
                            {coach.citasCompletadas} sesiones ({coach.citasCompletadasMes} este mes)
                          </span>
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
                            ? "Ocultar cartera de pacientes"
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
                            Sin pacientes asignados actualmente
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

                              {rolActual !== "COACH" && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirReasignar(c, coach.id)}
                                  title="Reasignar a otro especialista"
                                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                  <ArrowRightLeft className="h-3 w-3 text-avanza-green" />
                                  Reasignar
                                </button>
                              )}
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

      {/* Modal Nuevo Miembro Externo */}
      {modalNuevoCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl animate-fade-in dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-avanza-green">
                  <UserPlus className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Nuevo Miembro Externo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoCoach(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Nombre completo del especialista
                </label>
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej. Dra. Laura Méndez"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Correo electrónico de acceso
                </label>
                <input
                  type="email"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  placeholder="especialista@avanza.do"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Contraseña inicial
                </label>
                <input
                  type="text"
                  value={nuevoPassword}
                  onChange={(e) => setNuevoPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Esquema de honorarios / comisión (puedes definirlo después)
                </label>
                <select
                  value={nuevoEsquema}
                  onChange={(e) => setNuevoEsquema(e.target.value as EsquemaHonorario)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {OPCIONES_ESQUEMA.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {nuevoEsquema !== "SIN_DEFINIR" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                    {nuevoEsquema === "PORCENTAJE"
                      ? "Porcentaje de comisión (%)"
                      : "Monto acordado ($)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={nuevoEsquema === "PORCENTAJE" ? "100" : undefined}
                    step="0.01"
                    value={nuevoValor}
                    onChange={(e) => setNuevoValor(e.target.value)}
                    placeholder={nuevoEsquema === "PORCENTAJE" ? "Ej. 30" : "Ej. 1500"}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModalNuevoCoach(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearMiembroExterno}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-avanza-green py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-avanza-green/90 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Miembro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurar Acuerdo de Pago / Comisión */}
      {modalAcuerdoCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl animate-fade-in dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-avanza-green">
                  <Sliders className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Acuerdo de Honorarios
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAcuerdoCoach(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 dark:text-gray-400">
              Especialista:{" "}
              <strong className="text-gray-800 dark:text-gray-200">
                {modalAcuerdoCoach.nombre}
              </strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                  Modalidad de pago al miembro externo
                </label>
                <select
                  value={acuerdoEsquema}
                  onChange={(e) => setAcuerdoEsquema(e.target.value as EsquemaHonorario)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {OPCIONES_ESQUEMA.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {acuerdoEsquema !== "SIN_DEFINIR" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                    {acuerdoEsquema === "PORCENTAJE"
                      ? "Porcentaje sobre lo cobrado a sus pacientes (%)"
                      : acuerdoEsquema === "FIJO_POR_SESION"
                        ? "Monto fijo por cada sesión completada ($)"
                        : "Honorario fijo mensual ($)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={acuerdoEsquema === "PORCENTAJE" ? "100" : undefined}
                    step="0.01"
                    value={acuerdoValor}
                    onChange={(e) => setAcuerdoValor(e.target.value)}
                    placeholder={acuerdoEsquema === "PORCENTAJE" ? "Ej. 35" : "Ej. 1500"}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModalAcuerdoCoach(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarAcuerdo}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-avanza-green py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-avanza-green/90 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Guardar Acuerdo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reasignar Coach */}
      {modalReasignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl animate-fade-in dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-avanza-green">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Asignación de Especialista
              </h3>
            </div>

            <p className="text-xs text-gray-500 mb-4 dark:text-gray-400">
              Paciente:{" "}
              <strong className="text-gray-800 dark:text-gray-200">
                {modalReasignar.cliente.nombre}
              </strong>
            </p>

            <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">
              Seleccionar especialista asignado:
            </label>
            <select
              value={coachSeleccionadoId}
              onChange={(e) => setCoachSeleccionadoId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">-- Sin Especialista Asignado --</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.coacheesActivos} pacientes actuales)
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
