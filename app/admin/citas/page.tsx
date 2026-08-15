"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Video, MapPin, List, CalendarDays } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import type { CitaAdmin, EstadoCita } from "@/lib/admin-mock-data";

const FILTROS: { id: EstadoCita | "todas"; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "confirmada", label: "Confirmadas" },
  { id: "pendiente", label: "Pendientes" },
];

const VISTAS: { id: "lista" | "calendario"; label: string; icon: typeof List }[] = [
  { id: "lista", label: "Lista", icon: List },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
];

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const ESTADO_DOT: Record<EstadoCita, string> = {
  confirmada: "bg-avanza-green",
  pendiente: "bg-avanza-orange",
};

const ESTADO_LABEL: Record<EstadoCita, string> = {
  confirmada: "Confirmada",
  pendiente: "Pendiente",
};

function CitaRow({ cita }: { cita: CitaAdmin }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-blue-light text-sm font-semibold text-avanza-blue"
        aria-hidden="true"
      >
        {cita.clienteIniciales}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{cita.clienteNombre}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {cita.hora}
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
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
          cita.estado === "confirmada"
            ? "bg-avanza-green-light text-avanza-green-dark"
            : "bg-avanza-orange-light text-avanza-orange"
        }`}
      >
        {ESTADO_LABEL[cita.estado]}
      </span>
    </li>
  );
}

export default function AdminCitasPage() {
  const [filtro, setFiltro] = useState<EstadoCita | "todas">("todas");
  const [vista, setVista] = useState<"lista" | "calendario">("lista");
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);
  const [citas, setCitas] = useState<CitaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/admin/citas");
        if (!res.ok) throw new Error("Error al cargar citas");
        const { citas: lista } = (await res.json()) as { citas: CitaAdmin[] };
        setCitas(lista);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, []);

  const citasFiltradas = useMemo(() => {
    if (filtro === "todas") return citas;
    return citas.filter((c) => c.estado === filtro);
  }, [filtro, citas]);

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();
  const diaHoy = hoy.getDate();
  const nombreMesAnio = new Intl.DateTimeFormat("es-DO", { month: "long", year: "numeric" }).format(hoy);
  const nombreMes = nombreMesAnio.charAt(0).toUpperCase() + nombreMesAnio.slice(1);
  const nombreMesSolo = new Intl.DateTimeFormat("es-DO", { month: "long" }).format(hoy);

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const primerDiaSemana = new Date(anioActual, mesActual, 1).getDay();
  // Convierte domingo=0 en offset lunes-primero (lunes=0 ... domingo=6)
  const offsetInicio = (primerDiaSemana + 6) % 7;

  const citasPorDia = useMemo(() => {
    const mapa = new Map<number, CitaAdmin[]>();
    for (const cita of citasFiltradas) {
      const [y, m, d] = cita.fecha.split("-").map(Number);
      if (y !== anioActual || m - 1 !== mesActual) continue;
      const lista = mapa.get(d) ?? [];
      lista.push(cita);
      mapa.set(d, lista);
    }
    return mapa;
  }, [citasFiltradas, anioActual, mesActual]);

  const citasDelDiaSeleccionado = diaSeleccionado ? (citasPorDia.get(diaSeleccionado) ?? []) : [];

  function handleCambiarVista(nuevaVista: "lista" | "calendario") {
    setVista(nuevaVista);
  }

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
              onClick={() => handleCambiarVista(v.id)}
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

        {cargando ? (
          <p className="mt-10 text-center text-sm text-gray-500">Cargando citas...</p>
        ) : error ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            No se pudo cargar la agenda. Intenta de nuevo más tarde.
          </p>
        ) : vista === "lista" ? (
          citasFiltradas.length === 0 ? (
            <p className="mt-10 text-center text-sm text-gray-500">
              No hay citas en este filtro.
            </p>
          ) : (
            <ul className="space-y-3">
              {citasFiltradas.map((cita) => (
                <CitaRow key={cita.id} cita={cita} />
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

            <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendario de ${nombreMes}`}>
              {Array.from({ length: offsetInicio }).map((_, i) => (
                <div key={`blank-${i}`} aria-hidden="true" />
              ))}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const dia = i + 1;
                const citasDia = citasPorDia.get(dia) ?? [];
                const tieneConfirmadas = citasDia.some((c) => c.estado === "confirmada");
                const tienePendientes = citasDia.some((c) => c.estado === "pendiente");
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
                    {citasDia.length > 0 && (
                      <span className="flex items-center gap-0.5" aria-hidden="true">
                        {tieneConfirmadas && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              estaSeleccionado ? "bg-white" : ESTADO_DOT.confirmada
                            }`}
                          />
                        )}
                        {tienePendientes && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              estaSeleccionado ? "bg-white" : ESTADO_DOT.pendiente
                            }`}
                          />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-avanza-green" aria-hidden="true" />
                Confirmada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-avanza-orange" aria-hidden="true" />
                Pendiente
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
                      <CitaRow key={cita.id} cita={cita} />
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
