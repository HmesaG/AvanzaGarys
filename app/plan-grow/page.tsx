"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import {
  Compass,
  Flag,
  Lightbulb,
  Rocket,
  CheckCircle2,
  Lock,
  Trophy,
  Sparkles,
  Brain,
  ShieldCheck,
  ChevronRight,
  Target,
  Zap,
  HeartHandshake,
  MessageSquare,
} from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import TextAreaField from "@/components/TextAreaField";
import {
  obtenerPlanGrow,
  iniciarPlanGrow,
  responderSesionGrow,
  crearCompromisosGrow,
  reportarCompromisoGrow,
  obtenerSugerenciasIaCompromisos,
  type PlanGrow,
  type EtapaGrowValor,
  type FeedbackIaGrow,
} from "@/lib/grow-api";
import { obtenerEstado } from "@/lib/cliente-api";
import {
  ETAPA_LABEL,
  COMPROMISOS_REQUERIDOS,
  CATALOGO_PLANES_GROW,
  obtenerPreguntasPlan,
  type TipoPlanGrow,
} from "@/lib/grow-constants";
import { erpAlert, successToast } from "@/lib/alerts";

const ICONO_ETAPA: Record<EtapaGrowValor, typeof Flag> = {
  GOAL: Flag,
  REALITY: Compass,
  OPTIONS: Lightbulb,
  WILL: Rocket,
};

const ICONO_CATALOGO: Record<TipoPlanGrow, typeof Target> = {
  LIDERAZGO: Target,
  PRODUCTIVIDAD: Zap,
  INTELIGENCIA_EMOCIONAL: Brain,
  COMUNICACION: HeartHandshake,
};

export default function PlanGrowPage() {
  const [plan, setPlan] = useState<PlanGrow | null>(null);
  const [puedeEmpezar, setPuedeEmpezar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [iniciandoTipo, setIniciandoTipo] = useState<string | null>(null);
  const [planSeleccionado, setPlanSeleccionado] = useState<TipoPlanGrow>("LIDERAZGO");
  const [respuestas, setRespuestas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [cargandoIa, setCargandoIa] = useState(false);
  const [compromisos, setCompromisos] = useState(
    Array.from({ length: COMPROMISOS_REQUERIDOS }, () => ({ accion: "", fechaPrevista: "" })),
  );

  async function cargar() {
    try {
      const [p, estado] = await Promise.all([obtenerPlanGrow(), obtenerEstado()]);
      setPlan(p);
      setPuedeEmpezar(estado.puedeAgendar);
    } catch {
      // Fallback
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const sesionActual = plan?.sesiones.find((s) => !s.completadaAt) ?? null;

  useEffect(() => {
    if (sesionActual && plan) {
      const preguntas = obtenerPreguntasPlan(plan.tipo, sesionActual.etapa);
      setRespuestas(preguntas.map(() => ""));
    }
  }, [sesionActual?.id, plan?.tipo]);

  async function handleIniciar(tipo: TipoPlanGrow) {
    setIniciandoTipo(tipo);
    try {
      const nuevoPlan = await iniciarPlanGrow(tipo);
      setPlan(nuevoPlan);
      successToast(`Plan "${CATALOGO_PLANES_GROW[tipo].titulo}" iniciado`);
    } catch {
      await erpAlert.fire({ icon: "error", title: "No se pudo iniciar el plan" });
    } finally {
      setIniciandoTipo(null);
    }
  }

  async function handleEnviarSesion(e: FormEvent) {
    e.preventDefault();
    if (!sesionActual || !plan) return;

    const preguntas = obtenerPreguntasPlan(plan.tipo, sesionActual.etapa);
    const payload = preguntas.map((pregunta, i) => ({ pregunta, respuesta: respuestas[i] ?? "" }));
    if (payload.some((r) => r.respuesta.trim().length < 3)) {
      await erpAlert.fire({ icon: "warning", title: "Completá todas las respuestas para continuar" });
      return;
    }

    setEnviando(true);
    try {
      const planActualizado = await responderSesionGrow(sesionActual.id, payload);
      setPlan(planActualizado);
      successToast("¡Respuestas y análisis de IA guardados!");
    } catch {
      await erpAlert.fire({ icon: "error", title: "No se pudo guardar la sesión" });
    } finally {
      setEnviando(false);
    }
  }

  async function handleSugerirCompromisosIa() {
    setCargandoIa(true);
    try {
      const sugerencias = await obtenerSugerenciasIaCompromisos();
      if (sugerencias && sugerencias.length >= 2) {
        const hoy = new Date();
        setCompromisos([
          {
            accion: sugerencias[0].accion,
            fechaPrevista: new Date(hoy.getTime() + (sugerencias[0].diasSugeridos || 7) * 86400000)
              .toISOString()
              .split("T")[0],
          },
          {
            accion: sugerencias[1].accion,
            fechaPrevista: new Date(hoy.getTime() + (sugerencias[1].diasSugeridos || 14) * 86400000)
              .toISOString()
              .split("T")[0],
          },
        ]);
        successToast("Sugerencias de IA incorporadas");
      }
    } catch {
      await erpAlert.fire({ icon: "info", title: "Sugerencias listas en el formulario" });
    } finally {
      setCargandoIa(false);
    }
  }

  async function handleEnviarCompromisos(e: FormEvent) {
    e.preventDefault();
    if (compromisos.some((c) => c.accion.trim().length < 5 || !c.fechaPrevista)) {
      await erpAlert.fire({ icon: "warning", title: "Completá acción y fecha de cada compromiso" });
      return;
    }

    setEnviando(true);
    try {
      setPlan(await crearCompromisosGrow(compromisos));
      successToast("Compromisos registrados correctamente");
    } catch {
      await erpAlert.fire({ icon: "error", title: "No se pudieron registrar los compromisos" });
    } finally {
      setEnviando(false);
    }
  }

  async function handleReportar(id: string, estado: "CUMPLIDO" | "NO_CUMPLIDO") {
    const result = await erpAlert.fire({
      icon: "question",
      title: estado === "CUMPLIDO" ? "¿Marcar como cumplido?" : "¿Marcar como no cumplido?",
      input: "text",
      inputPlaceholder: "Contanos tu aprendizaje o resultado (opcional)",
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    try {
      setPlan(await reportarCompromisoGrow(id, estado, result.value || undefined));
      successToast("Compromiso actualizado");
    } catch {
      await erpAlert.fire({ icon: "error", title: "No se pudo actualizar el compromiso" });
    }
  }

  if (cargando) {
    return (
      <PageTransition footer={<BottomNav />}>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
          <BackHeader title="Plan de desarrollo" subtitle="Metodología GROW con IA" />
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        </main>
      </PageTransition>
    );
  }

  if (!puedeEmpezar && !plan) {
    return (
      <PageTransition footer={<BottomNav />}>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
          <BackHeader title="Plan de desarrollo" subtitle="Metodología GROW con IA" />
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-sm">
            <Lock className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Todavía no está disponible</p>
            <p className="mt-1 text-sm text-gray-500">
              Necesitás tener tu programa activo (consentimiento y pago) antes de empezar tu plan GROW.
            </p>
            <Link
              href="/programa"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white shadow-sm"
            >
              Ver mi programa
            </Link>
          </section>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader title="Plan de desarrollo" subtitle="Metodología GROW con IA" />

        {/* CATÁLOGO DE PLANES (Si no hay plan activo) */}
        {!plan ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-r from-avanza-green to-emerald-700 p-5 text-white shadow-md">
              <div className="flex items-center gap-2 text-emerald-100">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Coach Inteligente Avanza</span>
              </div>
              <h2 className="mt-2 text-lg font-bold">Catálogo de Planes GROW</h2>
              <p className="mt-1 text-xs text-emerald-50">
                Elegí el programa de 4 semanas según el área que querés transformar.
              </p>
            </div>

            <div className="space-y-3">
              {(Object.keys(CATALOGO_PLANES_GROW) as TipoPlanGrow[]).map((tipoKey) => {
                const info = CATALOGO_PLANES_GROW[tipoKey];
                const Icono = ICONO_CATALOGO[tipoKey] || Target;
                const estaSeleccionado = planSeleccionado === tipoKey;

                return (
                  <div
                    key={tipoKey}
                    onClick={() => setPlanSeleccionado(tipoKey)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      estaSeleccionado
                        ? "border-avanza-green bg-emerald-50/50 shadow-sm ring-1 ring-avanza-green"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-emerald-100 p-2 text-avanza-green">
                        <Icono className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">{info.titulo}</p>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                            {info.duracionSemanas} sem.
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{info.subtitulo}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {info.etiquetas.map((t) => (
                            <span key={t} className="rounded-md bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={Boolean(iniciandoTipo)}
              onClick={() => handleIniciar(planSeleccionado)}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-avanza-green px-5 font-semibold text-white shadow-sm disabled:opacity-60"
            >
              <Rocket className="h-4 w-4" />
              {iniciandoTipo ? "Iniciando plan..." : `Comenzar: ${CATALOGO_PLANES_GROW[planSeleccionado].titulo}`}
            </button>
          </section>
        ) : plan.estado === "CERRADO" ? (
          /* PLAN CERRADO */
          <section className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-r from-avanza-green to-emerald-700 p-5 text-center text-white shadow-md">
              <Trophy className="mx-auto h-8 w-8 text-yellow-300" aria-hidden="true" />
              <p className="mt-2 text-base font-bold">¡Plan GROW completado!</p>
              <p className="text-xs text-emerald-100">{CATALOGO_PLANES_GROW[plan.tipo as TipoPlanGrow]?.titulo || plan.tipo}</p>
            </div>

            {plan.sesiones.map((s) => {
              const respData = s.respuestas as any;
              const items: { pregunta: string; respuesta: string }[] = Array.isArray(respData)
                ? respData
                : respData?.items || [];
              const feedback: FeedbackIaGrow | undefined = respData?.feedbackIa;

              return (
                <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Semana {s.semana} · {ETAPA_LABEL[s.etapa]}
                    </p>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-avanza-green">
                      Completada
                    </span>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {items.map((r, i) => (
                      <li key={i} className="text-xs text-gray-600">
                        <p className="font-medium text-gray-800">{r.pregunta}</p>
                        <p className="mt-0.5 text-gray-600 italic">"{r.respuesta}"</p>
                      </li>
                    ))}
                  </ul>

                  {feedback && (
                    <div className="mt-3 rounded-xl bg-emerald-50/70 p-3 text-xs text-gray-700">
                      <div className="flex items-center gap-1.5 font-semibold text-avanza-green-dark">
                        <Sparkles className="h-3.5 w-3.5 text-avanza-green" />
                        Reflexión del Coach IA
                      </div>
                      <p className="mt-1 leading-relaxed">{feedback.reflexion}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ) : plan.estado === "EN_SEGUIMIENTO" ? (
          /* COMPROMISOS EN SEGUIMIENTO */
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Tus compromisos de acción</h2>
                <p className="text-xs text-gray-500">Plan: {CATALOGO_PLANES_GROW[plan.tipo as TipoPlanGrow]?.titulo || plan.tipo}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                En seguimiento
              </span>
            </div>

            <ul className="space-y-3">
              {plan.sesiones
                .flatMap((s) => s.compromisos)
                .map((c) => (
                  <li key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-900">{c.accion}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Fecha límite: {new Intl.DateTimeFormat("es-DO", { dateStyle: "medium" }).format(
                        new Date(c.fechaPrevista),
                      )}
                    </p>
                    {c.estado === "PENDIENTE" ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReportar(c.id, "CUMPLIDO")}
                          className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-avanza-green px-3 text-xs font-semibold text-white shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Cumplido
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportar(c.id, "NO_CUMPLIDO")}
                          className="flex min-h-[36px] flex-1 items-center justify-center rounded-xl border border-gray-300 px-3 text-xs font-semibold text-gray-700"
                        >
                          No cumplido
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          c.estado === "CUMPLIDO"
                            ? "bg-avanza-green-light text-avanza-green-dark"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {c.estado}
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ) : sesionActual && sesionActual.etapa === "WILL" && sesionActual.completadaAt ? (
          /* REGISTRO DE COMPROMISOS (ETAPA WILL COMPLETADA) */
          <form onSubmit={handleEnviarCompromisos} className="space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-avanza-green" />
                  <p className="text-sm font-semibold text-gray-900">Asistente IA de Compromisos</p>
                </div>
                <button
                  type="button"
                  onClick={handleSugerirCompromisosIa}
                  disabled={cargandoIa}
                  className="rounded-lg bg-avanza-green px-2.5 py-1 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {cargandoIa ? "Analizando..." : "Sugerir con IA"}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                La IA analiza tus respuestas de las 4 etapas para sugerir compromisos concretos y medibles.
              </p>
            </div>

            {compromisos.map((c, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <TextAreaField
                  id={`accion-${i}`}
                  label={`Compromiso ${i + 1}`}
                  rows={2}
                  value={c.accion}
                  onChange={(e) =>
                    setCompromisos((prev) => prev.map((x, j) => (j === i ? { ...x, accion: e.target.value } : x)))
                  }
                />
                <label className="mt-2 block text-sm font-medium text-gray-700" htmlFor={`fecha-${i}`}>
                  Fecha prevista
                </label>
                <input
                  id={`fecha-${i}`}
                  type="date"
                  value={c.fechaPrevista}
                  onChange={(e) =>
                    setCompromisos((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, fechaPrevista: e.target.value } : x)),
                    )
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-avanza-green focus:outline-none"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={enviando}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {enviando ? "Guardando..." : "Registrar compromisos"}
            </button>
          </form>
        ) : sesionActual ? (
          /* SESIÓN EN CURSO */
          (() => {
            const Icon = ICONO_ETAPA[sesionActual.etapa];
            const preguntas = obtenerPreguntasPlan(plan.tipo, sesionActual.etapa);
            const sesionAnterior = plan.sesiones.find((s) => s.semana === sesionActual.semana - 1 && s.completadaAt);
            const feedbackAnterior: FeedbackIaGrow | undefined = (sesionAnterior?.respuestas as any)?.feedbackIa;

            return (
              <form onSubmit={handleEnviarSesion} className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-avanza-green" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold text-avanza-green-dark">
                        Semana {sesionActual.semana} de {plan.totalSemanas} · Etapa {ETAPA_LABEL[sesionActual.etapa]}
                      </p>
                      <p className="text-[11px] text-gray-500">{CATALOGO_PLANES_GROW[plan.tipo as TipoPlanGrow]?.titulo || plan.tipo}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-avanza-green-dark">
                    Activa
                  </span>
                </div>

                {/* Feedback de la etapa previa si existe */}
                {feedbackAnterior && (
                  <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-avanza-green">
                      <Sparkles className="h-4 w-4" />
                      Reflexión de tu sesión anterior (IA Avanza)
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-700">{feedbackAnterior.reflexion}</p>
                    {feedbackAnterior.preguntasReflexivas?.length > 0 && (
                      <div className="mt-2 rounded-lg bg-emerald-50/60 p-2.5 text-[11px] text-emerald-900">
                        <span className="font-semibold">Pregunta para reflexionar: </span>
                        {feedbackAnterior.preguntasReflexivas[0]}
                      </div>
                    )}
                  </div>
                )}

                {preguntas.map((pregunta, i) => (
                  <TextAreaField
                    key={i}
                    id={`pregunta-${i}`}
                    label={pregunta}
                    rows={3}
                    value={respuestas[i] ?? ""}
                    onChange={(e) =>
                      setRespuestas((prev) => prev.map((r, j) => (j === i ? e.target.value : r)))
                    }
                  />
                ))}

                <button
                  type="submit"
                  disabled={enviando}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-avanza-green px-5 font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  {enviando ? "Analizando y guardando con IA..." : "Completar sesión"}
                </button>
              </form>
            );
          })()
        ) : null}
      </main>
    </PageTransition>
  );
}
