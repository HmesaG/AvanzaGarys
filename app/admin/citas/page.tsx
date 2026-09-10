"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Video,
  MapPin,
  List,
  CalendarDays,
  Loader2,
  AlertCircle,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { ErrorApi, pedirJson } from "@/lib/api-navegador";
import {
  ESTADO_CITA_BADGE,
  ESTADO_CITA_DOT,
  ESTADO_CITA_LABEL,
  formatFechaCorta,
  formatHora,
  iniciales,
} from "@/lib/admin-formato";
import type { EstadoCita, LineaAsesoria } from "@/generated/prisma/client";

// Forma de la respuesta de `/api/admin/citas`. Se declara a mano porque los
// `DateTime` de Prisma llegan como string después de pasar por JSON.
type CitaApi = {
  id: string;
  fecha: string;
  modalidad: string;
  estado: EstadoCita;
  notas: string | null;
  cliente: {
    id: string;
    linea: LineaAsesoria;
    usuario: { nombre: string; email: string };
  };
  coach: { id: string; nombre: string } | null;
};

/**
 * El backend (`listarCitas`) filtra por rango de fechas, no por estado, y ese
 * contrato lo comparten el dashboard y esta pantalla. El filtro de estado se
 * resuelve acá sobre las citas del mes ya descargadas: son pocas y evita un
 * viaje al servidor por cada toque de tab.
 */
const FILTROS: { id: EstadoCita | "todas"; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "CONFIRMADA", label: "Confirmadas" },
  { id: "PENDIENTE", label: "Pendientes" },
];

const VISTAS: { id: "lista" | "calendario"; label: string; icon: typeof List }[] = [
  { id: "lista", label: "Lista", icon: List },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
];

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function FilaCita({ cita }: { cita: CitaApi }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-blue-light text-sm font-semibold text-avanza-blue"
        aria-hidden="true"
      >
        {iniciales(cita.cliente.usuario.nombre)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">
          {cita.cliente.usuario.nombre}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span className="capitalize">{formatFechaCorta(cita.fecha)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatHora(cita.fecha)}
          </span>
          <span className="flex items-center gap-1">
            {cita.modalidad === "Virtual" ? (
              <Video className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {cita.modalidad}
          </span>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_CITA_BADGE[cita.estado]}`}
      >
        {ESTADO_CITA_LABEL[cita.estado]}
      </span>
    </li>
  );
}

export default function AdminCitasPage() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<EstadoCita | "todas">("todas");
  const [vista, setVista] = useState<"lista" | "calendario">("lista");
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  const [citas, setCitas] = useState<CitaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hoy = useMemo(() => new Date(), []);
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();
  const diaHoy = hoy.getDate();

  const manejarError = useCallback(
    (err: unknown): string => {
      if (err instanceof ErrorApi) {
        if (err.esNoAutenticado) {
          router.replace("/login?next=/admin/citas");
          return "Tu sesión expiró. Redirigiendo al inicio de sesión…";
        }
        return err.message;
      }
      return "No se pudieron cargar las citas.";
    },
    [router],
  );

  // Se pide el mes completo de una sola vez: alcanza tanto para la grilla del
  // calendario como para la vista lista, y evita refetch al alternar entre ambas.
  useEffect(() => {
    const controlador = new AbortController();

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const desde = new Date(anioActual, mesActual, 1);
        const hasta = new Date(anioActual, mesActual + 1, 1);
        const respuesta = await pedirJson<{ citas: CitaApi[] }>(
          `/api/admin/citas?desde=${encodeURIComponent(desde.toISOString())}&hasta=${encodeURIComponent(hasta.toISOString())}`,
          { signal: controlador.signal },
        );
        setCitas(respuesta.citas);
      } catch (err) {
        if (controlador.signal.aborted) return;
        setError(manejarError(err));
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }

    cargar();
    return () => controlador.abort();
  }, [anioActual, mesActual, manejarError]);

  const citasFiltradas = useMemo(
    () => (filtro === "todas" ? citas : citas.filter((cita) => cita.estado === filtro)),
    [citas, filtro],
  );

  const nombreMesAnio = new Intl.DateTimeFormat("es-DO", {
    month: "long",
    year: "numeric",
  }).format(hoy);
  const nombreMes = nombreMesAnio.charAt(0).toUpperCase() + nombreMesAnio.slice(1);
  const nombreMesSolo = new Intl.DateTimeFormat("es-DO", { month: "long" }).format(hoy);

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const primerDiaSemana = new Date(anioActual, mesActual, 1).getDay();
  // Convierte domingo=0 en offset lunes-primero (lunes=0 ... domingo=6)
  const offsetInicio = (primerDiaSemana + 6) % 7;

  const citasPorDia = useMemo(() => {
    const mapa = new Map<number, CitaApi[]>();
    for (const cita of citasFiltradas) {
      const fecha = new Date(cita.fecha);
      if (fecha.getFullYear() !== anioActual || fecha.getMonth() !== mesActual) continue;
      const dia = fecha.getDate();
      const lista = mapa.get(dia) ?? [];
      lista.push(cita);
      mapa.set(dia, lista);
    }
    return mapa;
  }, [citasFiltradas, anioActual, mesActual]);

  const citasDelDiaSeleccionado = diaSeleccionado ? (citasPorDia.get(diaSeleccionado) ?? []) : [];

  function handleClickDia(dia: number) {
    setDiaSeleccionado((actual) => (actual === dia ? null : dia));
  }

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Citas" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filtrar citas por estado"
            className="flex flex-1 gap-2"
          >
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                  filtro === f.id
                    ? "bg-avanza-green text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Alternar entre vista lista y calendario"
          className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1"
        >
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={vista === v.id}
              onClick={() => setVista(v.id)}
              className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${
                vista === v.id
                  ? "bg-white text-avanza-green shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <v.icon className="h-4 w-4" aria-hidden="true" />
              {v.label}
            </button>
          ))}
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : cargando ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando citas de {nombreMesSolo}…
          </p>
        ) : vista === "lista" ? (
          citasFiltradas.length === 0 ? (
            <p className="mt-10 text-center text-sm text-gray-500">
              No hay citas en este filtro durante {nombreMesSolo}.
            </p>
          ) : (
            <ul className="space-y-3">
              {citasFiltradas.map((cita) => (
                <FilaCita key={cita.id} cita={cita} />
              ))}
            </ul>
          )
        ) : (
          <div>
            <p className="mb-3 text-center text-sm font-semibold text-gray-900">
              {nombreMes}
            </p>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>

            <div
              className="grid grid-cols-7 gap-1"
              role="grid"
              aria-label={`Calendario de ${nombreMes}`}
            >
              {Array.from({ length: offsetInicio }).map((_, i) => (
                <div key={`blank-${i}`} aria-hidden="true" />
              ))}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const dia = i + 1;
                const citasDia = citasPorDia.get(dia) ?? [];
                const estadosDelDia = [...new Set(citasDia.map((c) => c.estado))];
                const esHoy = dia === diaHoy;
                const estaSeleccionado = dia === diaSeleccionado;

                return (
                  <button
                    key={dia}
                    type="button"
                    disabled={citasDia.length === 0}
                    onClick={() => handleClickDia(dia)}
                    aria-pressed={estaSeleccionado}
                    aria-label={
                      citasDia.length > 0
                        ? `Día ${dia}, ${citasDia.length} cita${citasDia.length === 1 ? "" : "s"}`
                        : `Día ${dia}, sin citas`
                    }
                    className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors duration-150 ${
                      estaSeleccionado
                        ? "bg-avanza-green text-white font-semibold"
                        : citasDia.length > 0
                          ? "bg-white text-gray-900 font-medium ring-1 ring-gray-200 hover:bg-gray-50"
                          : "text-gray-300"
                    } ${esHoy && !estaSeleccionado ? "ring-2 ring-avanza-blue" : ""} disabled:cursor-default`}
                  >
                    <span>{dia}</span>
                    {estadosDelDia.length > 0 && (
                      <span className="flex items-center gap-0.5" aria-hidden="true">
                        {estadosDelDia.map((estado) => (
                          <span
                            key={estado}
                            className={`h-1.5 w-1.5 rounded-full ${
                              estaSeleccionado ? "bg-white" : ESTADO_CITA_DOT[estado]
                            }`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-avanza-green" aria-hidden="true" />
                Confirmada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-avanza-orange" aria-hidden="true" />
                Pendiente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-400" aria-hidden="true" />
                Realizada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
                Cancelada
              </span>
            </div>

            <div className="mt-5 animate-fade-in">
              {diaSeleccionado === null ? (
                <p className="mt-6 text-center text-sm text-gray-500">
                  Selecciona un día con citas para ver el detalle.
                </p>
              ) : citasDelDiaSeleccionado.length === 0 ? (
                <p className="mt-6 text-center text-sm text-gray-500">
                  No hay citas de este filtro en el día {diaSeleccionado}.
                </p>
              ) : (
                <>
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">
                    Citas del {diaSeleccionado} de {nombreMesSolo}
                  </h2>
                  <ul className="space-y-3">
                    {citasDelDiaSeleccionado.map((cita) => (
                      <FilaCita key={cita.id} cita={cita} />
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
