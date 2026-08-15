import Link from "next/link";
import { User, Briefcase, Activity, LogIn } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { TIPOS_ASESORIA } from "@/lib/mock-data";

// Server Component: sin estado propio, solo navegación — evita el costo
// de un client bundle innecesario para una pantalla de puros links.

const ICONOS = { user: User, briefcase: Briefcase, activity: Activity } as const;

export default function LandingPage() {
  return (
    <PageTransition>
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-16 safe-top">
          <header className="mb-10 text-center">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-avanza-green-light">
              <Activity className="h-8 w-8 text-avanza-green" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">AVANZA</h1>
            <p className="mt-2 text-base text-gray-500">Impulsa tu mejor versión</p>
          </header>

          <h2 className="mb-4 text-center text-lg font-semibold text-gray-800">
            ¿Qué tipo de asesoría necesitas?
          </h2>

          <nav aria-label="Líneas de asesoría" className="flex flex-col gap-4">
            {TIPOS_ASESORIA.map((tipo) => {
              const Icon = ICONOS[tipo.icon];
              return (
                <Link
                  key={tipo.id}
                  href={`/registro?tipo=${tipo.id}`}
                  className={`flex min-h-[64px] w-full items-center gap-4 rounded-2xl px-5 text-left font-semibold text-white shadow-sm transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${tipo.colorClass} ${tipo.ringClass}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="text-base">{tipo.label}</span>
                </Link>
              );
            })}
          </nav>

          <p className="mt-10 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-avanza-green transition-colors duration-150 hover:text-avanza-green-dark"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Iniciar sesión
            </Link>
          </p>
        </div>

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 w-full text-avanza-green-light"
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,64 C100,120 300,0 400,56 L400,120 L0,120 Z"
          />
        </svg>
      </main>
    </PageTransition>
  );
}
