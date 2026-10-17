"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Square, Target, TrendingUp, Rocket, ChevronRight, Printer, FileText } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { obtenerEstado, alternarTarea as alternarTareaApi, type EstadoCliente, type EstadoTarea } from "@/lib/cliente-api";
import { successToast, errorToast } from "@/lib/alerts";

export default function ProcesoPage() {
  const [estado, setEstado] = useState<EstadoCliente | null>(null);
  const [tareas, setTareas] = useState<EstadoTarea[]>([]);

  useEffect(() => {
    obtenerEstado().then((e) => {
      setEstado(e);
      setTareas(e.tareas);
    });
  }, []);

  const completadas = tareas.filter((t) => t.completada).length;
  const progresoTareas = tareas.length > 0 ? Math.round((completadas / tareas.length) * 100) : 0;

  async function toggleTarea(id: string) {
    const anterior = tareas;
    const next = tareas.map((t) => (t.id === id ? { ...t, completada: !t.completada } : t));
    setTareas(next);
    if (next.every((t) => t.completada) && !anterior.every((t) => t.completada)) {
      successToast("¡Completaste todas tus tareas!");
    }

    try {
      await alternarTareaApi(id);
    } catch {
      setTareas(anterior);
      errorToast("No se pudo actualizar la tarea");
    }
  }

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader title="Mi proceso" subtitle="Sigue tu avance y tareas asignadas" />

        {estado?.puedeAgendar && (
          <Link
            href="/plan-grow"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 hover:border-avanza-green/40 active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-avanza-orange-light">
              <Rocket className="h-5 w-5 text-avanza-orange" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Mi plan de desarrollo</p>
              <p className="text-xs text-gray-500">Sesiones GROW y compromisos</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" aria-hidden="true" />
          </Link>
        )}

        <section
          aria-label="Objetivo principal"
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Target className="h-4 w-4 text-avanza-green" aria-hidden="true" />
            Objetivo principal
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {estado?.evaluacion?.objetivoPrincipal ?? "Todavía no completaste tu evaluación inicial"}
          </p>
        </section>

        <section
          aria-label="Progreso general"
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <TrendingUp className="h-4 w-4 text-avanza-green" aria-hidden="true" />
              Progreso general
            </p>
            <span className="text-sm font-bold tabular-nums text-avanza-green">{progresoTareas}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso general del proceso"
            aria-valuenow={progresoTareas}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full bg-avanza-green transition-[width] duration-500 ease-out"
              style={{ width: `${progresoTareas}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 active:scale-[0.99] transition-all"
          >
            <Printer className="h-4 w-4 text-gray-500" />
            Imprimir / Guardar Informe de Avance (PDF)
          </button>
        </section>

        <section aria-label="Tareas asignadas">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Tareas asignadas</h2>
            {tareas.length > 0 && (
              <span className="text-xs font-medium tabular-nums text-gray-500">
                {completadas}/{tareas.length} · {progresoTareas}%
              </span>
            )}
          </div>
          {tareas.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
              Todavía no tenés tareas asignadas. Se asignan cuando tu coach aprueba tu evaluación.
            </div>
          ) : (
            <ul className="space-y-2">
              {tareas.map((tarea) => (
                <li key={tarea.id}>
                  <button
                    type="button"
                    onClick={() => toggleTarea(tarea.id)}
                    aria-pressed={tarea.completada}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 active:scale-[0.98] ${
                      tarea.completada
                        ? "border-avanza-green-light bg-avanza-green-light"
                        : "border-gray-200 bg-white hover:border-avanza-green/40"
                    }`}
                  >
                    {tarea.completada ? (
                      <CheckSquare className="h-5 w-5 shrink-0 text-avanza-green" aria-hidden="true" />
                    ) : (
                      <Square className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                    )}
                    <span
                      className={`text-sm ${
                        tarea.completada
                          ? "text-avanza-green-dark line-through decoration-avanza-green/50"
                          : "text-gray-700"
                      }`}
                    >
                      {tarea.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
