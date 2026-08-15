"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Square, Target, TrendingUp } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { getClienteState } from "@/lib/client-state";
import {
  OBJETIVO_PRINCIPAL_MOCK,
  PROGRESO_MOCK,
  TAREAS_INICIALES,
  type Tarea,
} from "@/lib/mock-data";
import { successToast } from "@/lib/alerts";

export default function ProcesoPage() {
  const [tareas, setTareas] = useState<Tarea[]>(TAREAS_INICIALES);
  const [objetivo, setObjetivo] = useState(OBJETIVO_PRINCIPAL_MOCK);

  useEffect(() => {
    const evaluacion = getClienteState().evaluacion;
    if (evaluacion?.objetivoPrincipal) setObjetivo(evaluacion.objetivoPrincipal);
  }, []);

  const completadas = tareas.filter((t) => t.completada).length;
  const progresoTareas = Math.round((completadas / tareas.length) * 100);

  function toggleTarea(id: string) {
    setTareas((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, completada: !t.completada } : t
      );
      if (next.every((t) => t.completada) && !prev.every((t) => t.completada)) {
        successToast("¡Completaste todas tus tareas!");
      }
      return next;
    });
  }

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader title="Mi proceso" subtitle="Sigue tu avance y tareas asignadas" />

        <section
          aria-label="Objetivo principal"
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Target className="h-4 w-4 text-avanza-green" aria-hidden="true" />
            Objetivo principal
          </p>
          <p className="mt-2 text-sm text-gray-600">{objetivo}</p>
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
            <span className="text-sm font-bold tabular-nums text-avanza-green">
              {PROGRESO_MOCK}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso general del proceso"
            aria-valuenow={PROGRESO_MOCK}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full bg-avanza-green transition-[width] duration-500 ease-out"
              style={{ width: `${PROGRESO_MOCK}%` }}
            />
          </div>
        </section>

        <section aria-label="Tareas asignadas">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Tareas asignadas</h2>
            <span className="text-xs font-medium tabular-nums text-gray-500">
              {completadas}/{tareas.length} · {progresoTareas}%
            </span>
          </div>
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
                    <CheckSquare
                      className="h-5 w-5 shrink-0 text-avanza-green"
                      aria-hidden="true"
                    />
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
        </section>
      </main>
    </PageTransition>
  );
}
