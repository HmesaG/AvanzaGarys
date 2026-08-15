"use client";

import { useEffect, useState } from "react";
import { Users, Calendar, Clock, DollarSign, ClipboardCheck, Check, X } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import SelectField from "@/components/SelectField";
import {
  ADMIN_MOCK,
  DASHBOARD_STATS_MOCK,
  PROXIMAS_CITAS_MOCK,
  formatIngresos,
} from "@/lib/admin-mock-data";
import {
  getClienteState,
  aprobarEvaluacion,
  rechazarEvaluacion,
  tipoAsesoriaLabel,
  type ClienteState,
} from "@/lib/client-state";
import { OPCIONES_TIEMPO, PROGRAMAS_MOCK } from "@/lib/mock-data";
import { erpAlert, successToast } from "@/lib/alerts";

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

// Sección "Evaluación pendiente" — lee el client-state real (localStorage,
// mismo dispositivo) porque Fase 1 no tiene backend multi-cliente: aquí el
// coach revisa la evaluación enviada, elige un programa del catálogo mock
// según la línea de asesoría, y aprueba o rechaza (pasos 5-6 del flujo real).
function EvaluacionPendiente() {
  const [state, setState] = useState<ClienteState | null>(null);
  const [programaId, setProgramaId] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    setState(getClienteState());
  }, []);

  if (!state?.evaluacion || state.estadoEvaluacion !== "pendiente") return null;

  const tipo = state.registro?.tipoAsesoria || "personal";
  const programas = PROGRAMAS_MOCK[tipo];

  async function handleAprobar() {
    const programa = programas.find((p) => p.id === programaId);
    if (!programa) return;
    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Aprobar evaluación?",
      text: `Se asignará el programa "${programa.nombre}" al cliente.`,
      showCancelButton: true,
      confirmButtonText: "Sí, aprobar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    setProcesando(true);
    window.setTimeout(() => {
      aprobarEvaluacion(programa);
      setState(getClienteState());
      setProcesando(false);
      successToast("Evaluación aprobada");
    }, 350);
  }

  async function handleRechazar() {
    const result = await erpAlert.fire({
      icon: "warning",
      title: "¿Rechazar evaluación?",
      text: "El cliente deberá completarla de nuevo.",
      showCancelButton: true,
      confirmButtonText: "Sí, rechazar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    setProcesando(true);
    window.setTimeout(() => {
      rechazarEvaluacion();
      setState(getClienteState());
      setProcesando(false);
      successToast("Evaluación rechazada");
    }, 350);
  }

  return (
    <section
      aria-label="Evaluación pendiente"
      className="mb-6 rounded-2xl border border-avanza-orange-light bg-white p-4"
    >
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <ClipboardCheck className="h-4 w-4 text-avanza-orange" aria-hidden="true" />
        Evaluación pendiente de revisión
      </p>

      <div className="mb-4 space-y-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
        <p>
          <span className="font-medium text-gray-900">Cliente:</span>{" "}
          {state.registro?.nombreCompleto || "Sin registrar"} ·{" "}
          {tipoAsesoriaLabel(tipo)}
        </p>
        <p>
          <span className="font-medium text-gray-900">Objetivo:</span>{" "}
          {state.evaluacion.objetivoPrincipal}
        </p>
        <p>
          <span className="font-medium text-gray-900">Dificultad:</span>{" "}
          {state.evaluacion.principalDificultad}
        </p>
        <p>
          <span className="font-medium text-gray-900">Tiempo deseado:</span>{" "}
          {OPCIONES_TIEMPO.find((o) => o.value === state.evaluacion?.tiempoDeseado)
            ?.label ?? state.evaluacion.tiempoDeseado}
        </p>
      </div>

      <div className="mb-4">
        <SelectField
          id="programaAsignar"
          label="Programa a asignar"
          placeholder="Selecciona un programa"
          options={programas.map((p) => ({ value: p.id, label: p.nombre }))}
          value={programaId}
          onChange={setProgramaId}
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAprobar}
          disabled={!programaId || procesando}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-avanza-green px-4 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Aprobar
        </button>
        <button
          type="button"
          onClick={handleRechazar}
          disabled={procesando}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 font-semibold text-red-600 transition-all duration-150 hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Rechazar
        </button>
      </div>
    </section>
  );
}

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

        <EvaluacionPendiente />

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
