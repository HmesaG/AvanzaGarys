"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  TrendingUp,
  ClipboardList,
  ClipboardCheck,
  MessageCircle,
  Target,
  ArrowRight,
  Sparkles,
  Clock,
  Award,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import {
  fechaLabel,
  obtenerEstado,
  tipoAsesoriaLabel,
  type EstadoCliente,
} from "@/lib/cliente-api";
import { OBJETIVO_PRINCIPAL_MOCK, PROGRESO_MOCK } from "@/lib/mock-data";

const ACCESOS = [
  {
    // Antes apuntaba a `/registro`. Con sesión real, ese formulario crea una
    // cuenta nueva: el acceso de "tus datos" para alguien ya registrado es su
    // perfil.
    href: "/perfil",
    label: "Mis datos",
    desc: "Perfil y contacto",
    icon: ClipboardList,
    color: "text-avanza-green",
    bg: "bg-avanza-green-light",
  },
  {
    href: "/evaluacion",
    label: "Evaluación",
    desc: "Punto de partida",
    icon: ClipboardCheck,
    color: "text-avanza-blue",
    bg: "bg-avanza-blue-light",
  },
  {
    href: "/agenda",
    label: "Agenda",
    desc: "Reserva sesión",
    icon: Calendar,
    color: "text-avanza-orange",
    bg: "bg-avanza-orange-light",
  },
  {
    href: "/proceso",
    label: "Mi proceso",
    desc: "Ver avance",
    icon: Target,
    color: "text-avanza-green",
    bg: "bg-avanza-green-light",
  },
  {
    href: "/mensajes",
    label: "Mensajes",
    desc: "Habla con tu asesor",
    icon: MessageCircle,
    color: "text-avanza-blue",
    bg: "bg-avanza-blue-light",
  },
] as const;

export default function HomePage() {
  const [estado, setEstado] = useState<EstadoCliente | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        setEstado(await obtenerEstado());
      } catch {
        // El resumen degrada a los textos por defecto: la home nunca queda en
        // blanco por un fallo de red.
      }
    }
    void cargar();
  }, []);

  const nombre = estado?.perfil.nombreCompleto.split(" ")[0];
  const tipo = estado?.perfil.tipoAsesoria;
  const proximaCita = estado?.proximaCita ?? null;
  const objetivo = estado?.evaluacion?.objetivoPrincipal ?? OBJETIVO_PRINCIPAL_MOCK;

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <header className="mb-6">
          <p className="flex items-center gap-1.5 text-sm font-medium text-avanza-green">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {tipo ? tipoAsesoriaLabel(tipo) : "Avanza"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {nombre ? `Hola, ${nombre}` : "Hola de nuevo"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Este es tu resumen de hoy.
          </p>
        </header>

        {/* Próxima sesión */}
        <section aria-label="Próxima sesión" className="mb-4">
          {proximaCita ? (
            <Link
              href="/agenda"
              className="block rounded-2xl bg-avanza-green p-5 text-white shadow-sm transition-transform duration-150 active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-avanza-green-light">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Próxima sesión
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {fechaLabel(proximaCita.fecha)}
                  </p>
                  <p className="text-sm text-avanza-green-light">
                    {proximaCita.hora} · {proximaCita.modalidad}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </div>
            </Link>
          ) : (
            <Link
              href="/agenda"
              className="flex items-center justify-between rounded-2xl border border-dashed border-gray-300 bg-white p-5 transition-colors duration-150 hover:border-avanza-green active:scale-[0.98]"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  Aún no tienes sesión agendada
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  Reserva tu primera sesión con tu asesor
                </p>
              </div>
              <ArrowRight
                className="h-5 w-5 shrink-0 text-avanza-green"
                aria-hidden="true"
              />
            </Link>
          )}
        </section>

        {/* Progreso */}
        <section
          aria-label="Tu progreso"
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <TrendingUp className="h-4 w-4 text-avanza-green" aria-hidden="true" />
              Tu progreso
            </p>
            <span
              className="text-sm font-bold tabular-nums text-avanza-green"
              aria-hidden="true"
            >
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
          <p className="mt-3 text-sm text-gray-600">
            Objetivo: <span className="font-medium text-gray-900">{objetivo}</span>
          </p>
        </section>

        {/* Accesos rápidos */}
        <section aria-label="Accesos rápidos">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Accesos rápidos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {ACCESOS.map(({ href, label, desc, icon: Icon, color, bg }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 transition-all duration-150 hover:border-avanza-green/40 active:scale-[0.97]"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${bg}`}
                >
                  <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    {label}
                  </span>
                  <span className="block text-xs text-gray-500">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
