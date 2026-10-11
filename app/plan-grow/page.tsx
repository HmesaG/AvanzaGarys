"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { Compass, Flag, Lightbulb, Rocket, CheckCircle2, Lock, Trophy } from "lucide-react";
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
  type PlanGrow,
  type EtapaGrowValor,
} from "@/lib/grow-api";
import { obtenerEstado } from "@/lib/cliente-api";
import { PREGUNTAS_GROW, ETAPA_LABEL, COMPROMISOS_REQUERIDOS } from "@/lib/grow-constants";
import { erpAlert, successToast } from "@/lib/alerts";

const ICONO_ETAPA: Record<EtapaGrowValor, typeof Flag> = {
  GOAL: Flag,
  REALITY: Compass,
  OPTIONS: Lightbulb,
  WILL: Rocket,
};

export default function PlanGrowPage() {
  const [plan, setPlan] = useState<PlanGrow | null>(null);
  const [puedeEmpezar, setPuedeEmpezar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [respuestas, setRespuestas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [compromisos, setCompromisos] = useState(
    Array.from({ length: COMPROMISOS_REQUERIDOS }, () => ({ accion: "", fechaPrevista: "" })),
  );

  async function cargar() {
    const [p, estado] = await Promise.all([obtenerPlanGrow(), obtenerEstado()]);
    setPlan(p);
    setPuedeEmpezar(estado.puedeAgendar);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const sesionActual = plan?.sesiones.find((s) => !s.completadaAt) ?? null;

  useEffect(() => {
    if (sesionActual) {
      setRespuestas(PREGUNTAS_GROW[sesionActual.etapa].map(() => ""));
    }
  }, [sesionActual?.id]);

  async function handleIniciar() {
    setIniciando(true);
    try {
      setPlan(await iniciarPlanGrow());
    } catch (error) {
      await erpAlert.fire({ icon: "error", title: "No se pudo iniciar el plan" });
    } finally {
      setIniciando(false);
    }
  }

  async function handleEnviarSesion(e: FormEvent) {
    e.preventDefault();
    if (!sesionActual) return;

    const preguntas = PREGUNTAS_GROW[sesionActual.etapa];
    const payload = preguntas.map((pregunta, i) => ({ pregunta, respuesta: respuestas[i] ?? "" }));
    if (payload.some((r) => r.respuesta.trim().length < 3)) {
      await erpAlert.fire({ icon: "warning", title: "Completá todas las respuestas" });
      return;
    }

    setEnviando(true);
    try {
      setPlan(await responderSesionGrow(sesionActual.id, payload));
      successToast("Respuestas guardadas");
    } catch {
      await erpAlert.fire({ icon: "error", title: "No se pudo guardar la sesión" });
    } finally {
      setEnviando(false);
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
      successToast("Compromisos registrados");
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
      inputPlaceholder: "Contanos qué pasó (opcional)",
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
          <BackHeader title="Plan de desarrollo" subtitle="Metodología GROW" />
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        </main>
      </PageTransition>
    );
  }

  if (!puedeEmpezar && !plan) {
    return (
      <PageTransition footer={<BottomNav />}>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
          <BackHeader title="Plan de desarrollo" subtitle="Metodología GROW" />
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Todavía no está disponible</p>
            <p className="mt-1 text-sm text-gray-500">
              Necesitás tener tu programa activo (consentimiento y pago) antes de empezar.
            </p>
            <Link
              href="/programa"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white"
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
        <BackHeader title="Plan de desarrollo" subtitle="Metodología GROW" />

        {!plan ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <Rocket className="mx-auto h-8 w-8 text-avanza-green" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Plan de Desarrollo de Liderazgo</p>
            <p className="mt-1 text-sm text-gray-500">
              4 semanas, una etapa GROW por semana: Objetivo, Realidad, Opciones y Acción.
            </p>
            <button
              type="button"
              disabled={iniciando}
              onClick={handleIniciar}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white disabled:opacity-60"
            >
              {iniciando ? "Iniciando..." : "Comenzar plan"}
            </button>
          </section>
        ) : plan.estado === "CERRADO" ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-avanza-green p-5 text-center text-white">
              <Trophy className="mx-auto h-8 w-8" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">¡Plan completado!</p>
            </div>
            {plan.sesiones.map((s) => (
              <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-900">
                  Semana {s.semana} · {ETAPA_LABEL[s.etapa]}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {s.respuestas?.map((r, i) => (
                    <li key={i} className="text-xs text-gray-600">
                      <span className="font-medium text-gray-800">{r.pregunta}</span> {r.respuesta}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {plan.sesiones.flatMap((s) => s.compromisos).length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-gray-900">Compromisos</p>
                {plan.sesiones.flatMap((s) => s.compromisos).map((c) => (
                  <p key={c.id} className="text-xs text-gray-600">
                    {c.accion} — <span className="font-medium">{c.estado}</span>
                  </p>
                ))}
              </div>
            )}
          </section>
        ) : plan.estado === "EN_SEGUIMIENTO" ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Tus compromisos</h2>
            <ul className="space-y-3">
              {plan.sesiones
                .flatMap((s) => s.compromisos)
                .map((c) => (
                  <li key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-900">{c.accion}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Para el {new Intl.DateTimeFormat("es-DO", { dateStyle: "medium" }).format(
                        new Date(c.fechaPrevista),
                      )}
                    </p>
                    {c.estado === "PENDIENTE" ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReportar(c.id, "CUMPLIDO")}
                          className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-avanza-green px-3 text-xs font-semibold text-white"
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
          <form onSubmit={handleEnviarCompromisos} className="space-y-5">
            <p className="text-sm text-gray-600">
              Registrá {COMPROMISOS_REQUERIDOS} compromisos concretos con fecha para cumplirlos.
            </p>
            {compromisos.map((c, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
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
                  Fecha
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
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white disabled:opacity-60"
            >
              {enviando ? "Guardando..." : "Registrar compromisos"}
            </button>
          </form>
        ) : sesionActual ? (
          (() => {
            const Icon = ICONO_ETAPA[sesionActual.etapa];
            return (
              <form onSubmit={handleEnviarSesion} className="space-y-5">
                <div className="flex items-center gap-2 rounded-2xl bg-avanza-green-light p-4">
                  <Icon className="h-5 w-5 text-avanza-green-dark" aria-hidden="true" />
                  <p className="text-sm font-semibold text-avanza-green-dark">
                    Semana {sesionActual.semana} de {plan.totalSemanas} · {ETAPA_LABEL[sesionActual.etapa]}
                  </p>
                </div>
                {PREGUNTAS_GROW[sesionActual.etapa].map((pregunta, i) => (
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
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white disabled:opacity-60"
                >
                  {enviando ? "Guardando..." : "Continuar"}
                </button>
              </form>
            );
          })()
        ) : null}
      </main>
    </PageTransition>
  );
}
