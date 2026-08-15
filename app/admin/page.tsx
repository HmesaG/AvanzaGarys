"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Calendar, Clock, DollarSign, ClipboardCheck, Check, X } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import SelectField from "@/components/SelectField";
import { formatIngresos, type CitaAdmin, type DashboardStats } from "@/lib/admin-mock-data";
import { OPCIONES_TIEMPO } from "@/lib/mock-data";
import { erpAlert, successToast } from "@/lib/alerts";

type EvaluacionPendiente = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  linea: string;
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoDeseado: string;
  programasDisponibles: { id: string; nombre: string }[];
};

type DashboardData = {
  stats: DashboardStats;
  evaluacionesPendientes: EvaluacionPendiente[];
  proximasCitas: CitaAdmin[];
};

function tarjetasStats(stats: DashboardStats) {
  return [
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
      value: stats.pendientes.toString(),
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
}

// Revisión de una evaluación real (tabla `evaluaciones`, estado PENDIENTE).
// Reemplaza el acoplamiento anterior, donde el admin leía el localStorage del
// cliente: ahora aprobar/rechazar escribe en la base vía la API.
function EvaluacionPendienteCard({
  evaluacion,
  onResuelta,
}: {
  evaluacion: EvaluacionPendiente;
  onResuelta: () => void;
}) {
  const [programaId, setProgramaId] = useState("");
  const [procesando, setProcesando] = useState(false);

  async function handleAprobar() {
    const programa = evaluacion.programasDisponibles.find((p) => p.id === programaId);
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
    try {
      const res = await fetch(`/api/admin/evaluaciones/${evaluacion.id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programaId }),
      });
      if (!res.ok) throw new Error("No se pudo aprobar la evaluación");
      successToast("Evaluación aprobada");
      onResuelta();
    } catch {
      erpAlert.fire({ icon: "error", title: "No se pudo aprobar la evaluación" });
    } finally {
      setProcesando(false);
    }
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
    try {
      const res = await fetch(`/api/admin/evaluaciones/${evaluacion.id}/rechazar`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("No se pudo rechazar la evaluación");
      successToast("Evaluación rechazada");
      onResuelta();
    } catch {
      erpAlert.fire({ icon: "error", title: "No se pudo rechazar la evaluación" });
    } finally {
      setProcesando(false);
    }
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
          <span className="font-medium text-gray-900">Cliente:</span> {evaluacion.clienteNombre} ·{" "}
          {evaluacion.linea}
        </p>
        <p>
          <span className="font-medium text-gray-900">Objetivo:</span>{" "}
          {evaluacion.objetivoPrincipal}
        </p>
        <p>
          <span className="font-medium text-gray-900">Dificultad:</span>{" "}
          {evaluacion.principalDificultad}
        </p>
        <p>
          <span className="font-medium text-gray-900">Tiempo deseado:</span>{" "}
          {OPCIONES_TIEMPO.find((o) => o.value === evaluacion.tiempoDeseado)?.label ??
            evaluacion.tiempoDeseado}
        </p>
      </div>

      <div className="mb-4">
        <SelectField
          id={`programaAsignar-${evaluacion.id}`}
          label="Programa a asignar"
          placeholder="Selecciona un programa"
          options={evaluacion.programasDisponibles.map((p) => ({ value: p.id, label: p.nombre }))}
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Error al cargar el dashboard");
      setData((await res.json()) as DashboardData);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDashboard();
  }, [cargarDashboard]);

  useEffect(() => {
    async function cargarUsuario() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const { usuario } = (await res.json()) as { usuario: { nombre: string } };
        setNombreUsuario(usuario.nombre.split(" ")[0]);
      } catch {
        // El saludo es cosmético: si falla, la página igual sirve.
      }
    }
    void cargarUsuario();
  }, []);

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Panel administrativo" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Hola{nombreUsuario ? `, ${nombreUsuario}` : ""}
          </h2>
          <p className="mt-1 text-sm text-gray-500">Aquí tienes un resumen general</p>
        </section>

        {cargando ? (
          <p className="mt-10 text-center text-sm text-gray-500">Cargando resumen...</p>
        ) : error || !data ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            No se pudo cargar el resumen. Intenta de nuevo más tarde.
          </p>
        ) : (
          <>
            {data.evaluacionesPendientes.map((evaluacion) => (
              <EvaluacionPendienteCard
                key={evaluacion.id}
                evaluacion={evaluacion}
                onResuelta={cargarDashboard}
              />
            ))}

            <section aria-label="Resumen general" className="mb-6 grid grid-cols-2 gap-3">
              {tarjetasStats(data.stats).map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${bg}`}
                  >
                    <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </section>

            <section aria-label="Próximas citas">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Próximas citas</h2>
              {data.proximasCitas.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                  No hay citas próximas agendadas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.proximasCitas.map((cita) => (
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
              )}
            </section>
          </>
        )}
      </main>
    </PageTransition>
  );
}
