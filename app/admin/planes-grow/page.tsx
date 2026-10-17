"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { ErrorApi, pedirJson } from "@/lib/api-navegador";
import { erpAlert, successToast } from "@/lib/alerts";
import { ETAPA_LABEL, type EtapaGrowValor } from "@/lib/grow-constants";

type PlanLista = {
  id: string;
  tipo: string;
  semanaActual: number;
  totalSemanas: number;
  estado: "ACTIVO" | "EN_SEGUIMIENTO" | "PAUSADO" | "CERRADO";
  updatedAt: string;
  cliente: { id: string; usuario: { nombre: string; email: string } };
};

type SesionDetalle = {
  id: string;
  semana: number;
  etapa: EtapaGrowValor;
  respuestas:
    | { pregunta: string; respuesta: string }[]
    | { items: { pregunta: string; respuesta: string }[]; feedbackIa?: { reflexion: string; fortalezas?: string[]; desafiosDetectados?: string[] } }
    | null;
  notaCoach: string | null;
  completadaAt: string | null;
  compromisos: { id: string; accion: string; fechaPrevista: string; estado: string; resultado: string | null }[];
};

type PlanDetalle = PlanLista & { sesiones: SesionDetalle[] };

const ESTADO_BADGE: Record<PlanLista["estado"], string> = {
  ACTIVO: "bg-avanza-blue-light text-avanza-blue",
  EN_SEGUIMIENTO: "bg-avanza-orange-light text-avanza-orange",
  PAUSADO: "bg-gray-200 text-gray-600",
  CERRADO: "bg-avanza-green-light text-avanza-green-dark",
};

export default function AdminPlanesGrowPage() {
  const router = useRouter();
  const [planes, setPlanes] = useState<PlanLista[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<PlanDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const manejarError = useCallback(
    (err: unknown, porDefecto: string) => {
      if (err instanceof ErrorApi) {
        if (err.esNoAutenticado) {
          router.replace("/login?next=/admin/planes-grow");
          return "Tu sesión expiró. Redirigiendo…";
        }
        return err.message;
      }
      return porDefecto;
    },
    [router],
  );

  async function cargarLista() {
    setError(null);
    try {
      const { planes } = await pedirJson<{ planes: PlanLista[] }>("/api/admin/planes-grow");
      setPlanes(planes);
    } catch (err) {
      setError(manejarError(err, "No se pudo cargar la lista de planes."));
    }
  }

  useEffect(() => {
    cargarLista();
  }, []);

  async function abrirDetalle(clienteId: string) {
    setCargandoDetalle(true);
    setError(null);
    try {
      const { plan } = await pedirJson<{ plan: PlanDetalle }>(`/api/admin/planes-grow/${clienteId}`);
      setDetalle(plan);
    } catch (err) {
      setError(manejarError(err, "No se pudo cargar el detalle del plan."));
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function cambiarEstado(nuevo: "ACTIVO" | "PAUSADO" | "CERRADO") {
    if (!detalle) return;
    try {
      await pedirJson(`/api/admin/planes-grow/${detalle.cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevo }),
      });
      successToast("Estado actualizado");
      await abrirDetalle(detalle.cliente.id);
      await cargarLista();
    } catch (err) {
      await erpAlert.fire({
        icon: "error",
        title: "No se pudo actualizar el estado",
        text: err instanceof ErrorApi ? err.message : undefined,
      });
    }
  }

  async function agregarNota(sesionId: string) {
    const result = await erpAlert.fire({
      icon: "question",
      title: "Nota para esta sesión",
      input: "textarea",
      inputPlaceholder: "Observación del coach...",
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed || !result.value?.trim() || !detalle) return;

    try {
      await pedirJson(`/api/admin/planes-grow/${detalle.cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesionId, nota: result.value.trim() }),
      });
      successToast("Nota guardada");
      await abrirDetalle(detalle.cliente.id);
    } catch (err) {
      await erpAlert.fire({
        icon: "error",
        title: "No se pudo guardar la nota",
        text: err instanceof ErrorApi ? err.message : undefined,
      });
    }
  }

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Planes GROW" />
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        {detalle || cargandoDetalle ? (
          <>
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="mb-4 flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-avanza-green hover:bg-avanza-green-light active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Volver a planes
            </button>

            {cargandoDetalle || !detalle ? (
              <p className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando…
              </p>
            ) : (
              <>
                <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{detalle.cliente.usuario.nombre}</p>
                      <p className="text-xs text-gray-500">{detalle.cliente.usuario.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_BADGE[detalle.estado]}`}>
                      {detalle.estado}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Semana {detalle.semanaActual} de {detalle.totalSemanas}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {detalle.estado !== "PAUSADO" && (
                      <button
                        type="button"
                        onClick={() => cambiarEstado("PAUSADO")}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
                      >
                        Pausar
                      </button>
                    )}
                    {detalle.estado === "PAUSADO" && (
                      <button
                        type="button"
                        onClick={() => cambiarEstado("ACTIVO")}
                        className="flex-1 rounded-lg bg-avanza-green px-3 py-2 text-xs font-semibold text-white"
                      >
                        Reactivar
                      </button>
                    )}
                    {detalle.estado !== "CERRADO" && (
                      <button
                        type="button"
                        onClick={() => cambiarEstado("CERRADO")}
                        className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>
                </section>

                <section aria-label="Sesiones">
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">Sesiones</h2>
                  <ul className="space-y-3">
                    {detalle.sesiones.map((s) => (
                      <li key={s.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            Semana {s.semana} · {ETAPA_LABEL[s.etapa]}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              s.completadaAt ? "bg-avanza-green-light text-avanza-green-dark" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {s.completadaAt ? "Completada" : "Pendiente"}
                          </span>
                        </div>
                        {(() => {
                          if (!s.respuestas) return null;
                          const items = Array.isArray(s.respuestas) ? s.respuestas : s.respuestas.items || [];
                          const feedback = !Array.isArray(s.respuestas) ? s.respuestas.feedbackIa : null;
                          return (
                            <>
                              <ul className="mt-2 space-y-1">
                                {items.map((r, i) => (
                                  <li key={i} className="text-xs text-gray-600">
                                    <span className="font-medium text-gray-800">{r.pregunta}</span> {r.respuesta}
                                  </li>
                                ))}
                              </ul>
                              {feedback && (
                                <div className="mt-2 rounded-xl bg-emerald-50/70 p-2.5 text-xs text-emerald-950 border border-emerald-100">
                                  <span className="font-semibold text-avanza-green-dark">💡 Análisis IA: </span>
                                  <span>{feedback.reflexion}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        {s.compromisos.length > 0 && (
                          <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                            {s.compromisos.map((c) => (
                              <li key={c.id} className="text-xs text-gray-600">
                                {c.accion} — <span className="font-medium">{c.estado}</span>
                                {c.resultado ? ` (${c.resultado})` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                        {s.notaCoach && (
                          <p className="mt-2 rounded-lg bg-avanza-blue-light p-2 text-xs text-avanza-blue">
                            Nota: {s.notaCoach}
                          </p>
                        )}
                        {s.completadaAt && (
                          <button
                            type="button"
                            onClick={() => agregarNota(s.id)}
                            className="mt-2 text-xs font-medium text-avanza-green hover:underline"
                          >
                            {s.notaCoach ? "Editar nota" : "Agregar nota"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
              {planes?.length ?? 0} plan{planes?.length === 1 ? "" : "es"}
            </p>
            {error ? (
              <div role="alert" className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            ) : planes === null ? (
              <p className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando…
              </p>
            ) : planes.length === 0 ? (
              <p className="mt-10 text-center text-sm text-gray-500">Todavía no hay planes de desarrollo iniciados.</p>
            ) : (
              <ul className="space-y-3">
                {planes.map((plan) => (
                  <li key={plan.id}>
                    <button
                      type="button"
                      onClick={() => abrirDetalle(plan.cliente.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 active:scale-[0.99]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-orange-light">
                        <Rocket className="h-5 w-5 text-avanza-orange" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{plan.cliente.usuario.nombre}</p>
                        <p className="text-xs text-gray-500">
                          Semana {plan.semanaActual}/{plan.totalSemanas} ·{" "}
                          <span className={`rounded-full px-1.5 py-0.5 ${ESTADO_BADGE[plan.estado]}`}>{plan.estado}</span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </PageTransition>
  );
}
