"use client";

// Tarjeta de "evaluaciones pendientes de revisión" en el dashboard admin.
// Bandeja GLOBAL (ver ADR 007) — cualquier Administrador/Coach/Secretaria
// puede aprobar cualquiera, no sólo "las suyas".
import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { ErrorApi, pedirJson } from "@/lib/api-navegador";
import { LINEA_LABEL } from "@/lib/admin-formato";
import { erpAlert, successToast, errorToast } from "@/lib/alerts";
import { OPCIONES_TIEMPO } from "@/lib/mock-data";
import type { LineaAsesoria } from "@/generated/prisma/client";

type EvaluacionPendiente = {
  id: string;
  objetivoPrincipal: string;
  tiempoObjetivo: string | null;
  createdAt: string;
  cliente: {
    id: string;
    linea: LineaAsesoria;
    usuario: { nombre: string; email: string };
  };
};

function tiempoLabel(valor: string | null): string {
  if (!valor) return "Sin especificar";
  return OPCIONES_TIEMPO.find((o) => o.value === valor)?.label ?? valor;
}

export default function EvaluacionesPendientes() {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionPendiente[] | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  async function cargar() {
    try {
      const { evaluaciones } = await pedirJson<{ evaluaciones: EvaluacionPendiente[] }>(
        "/api/admin/evaluaciones/pendientes",
      );
      setEvaluaciones(evaluaciones);
    } catch {
      setEvaluaciones([]);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function aprobar(evaluacion: EvaluacionPendiente) {
    const result = await erpAlert.fire({
      icon: "question",
      title: `¿Aprobar evaluación de ${evaluacion.cliente.usuario.nombre}?`,
      text: "Se le va a crear un programa y un pago pendiente.",
      showCancelButton: true,
      confirmButtonText: "Aprobar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    setProcesandoId(evaluacion.id);
    try {
      await pedirJson(`/api/admin/evaluaciones/${evaluacion.id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      successToast("Evaluación aprobada");
      setEvaluaciones((prev) => prev?.filter((e) => e.id !== evaluacion.id) ?? null);
    } catch (error) {
      errorToast(error instanceof ErrorApi ? error.message : "No se pudo aprobar la evaluación");
    } finally {
      setProcesandoId(null);
    }
  }

  if (evaluaciones === null) {
    return (
      <section className="mb-6 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando evaluaciones pendientes…
      </section>
    );
  }

  if (evaluaciones.length === 0) return null;

  return (
    <section aria-label="Evaluaciones pendientes" className="mb-6">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <ClipboardCheck className="h-4 w-4 text-avanza-orange" aria-hidden="true" />
        Evaluaciones pendientes ({evaluaciones.length})
      </h2>
      <ul className="space-y-3">
        {evaluaciones.map((evaluacion) => (
          <li key={evaluacion.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {evaluacion.cliente.usuario.nombre}
                </p>
                <p className="truncate text-xs text-gray-500">{evaluacion.cliente.usuario.email}</p>
              </div>
              <span className="shrink-0 rounded-full bg-avanza-blue-light px-2.5 py-1 text-xs font-medium text-avanza-blue">
                {LINEA_LABEL[evaluacion.cliente.linea]}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-700">{evaluacion.objetivoPrincipal}</p>
            <p className="mt-1 text-xs text-gray-500">
              Tiempo deseado: {tiempoLabel(evaluacion.tiempoObjetivo)}
            </p>
            <button
              type="button"
              disabled={procesandoId === evaluacion.id}
              onClick={() => aprobar(evaluacion)}
              className="mt-3 flex min-h-[40px] w-full items-center justify-center rounded-xl bg-avanza-green px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {procesandoId === evaluacion.id ? "Aprobando…" : "Aprobar"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
