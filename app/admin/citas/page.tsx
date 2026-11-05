"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Video,
  MapPin,
  List,
  CalendarDays,
  CalendarPlus,
  Settings2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  X,
  Save,
  Printer,
  Download,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import BotonCalendario from "@/components/BotonCalendario";
import { ErrorApi, pedirJson } from "@/lib/api-navegador";
import { erpToast, errorToast } from "@/lib/alerts";
import {
  ESTADO_CITA_BADGE,
  ESTADO_CITA_DOT,
  ESTADO_CITA_LABEL,
  formatFechaCorta,
  formatHora,
  formatMonto,
  iniciales,
} from "@/lib/admin-formato";
import type { EsquemaHonorario, EstadoCita, LineaAsesoria } from "@/generated/prisma/client";

type CitaApi = {
  id: string;
  fecha: string;
  modalidad: string;
  estado: EstadoCita;
  notas: string | null;
  enlaceReunion?: string | null;
  cliente: {
    id: string;
    linea: LineaAsesoria;
    usuario: { nombre: string; email: string };
  };
  coach: { id: string; nombre: string } | null;
};

type ClienteOpcion = {
  id: string;
  usuario: { nombre: string; email: string };
};

type MiDisponibilidadApi = {
  esquemaHonorario: EsquemaHonorario;
  valorHonorario: number | null;
  sesionesCompletadasMes: number;
  disponibilidad: {
    dias?: string[];
    horaInicio?: string;
    horaFin?: string;
    modalidadPreferida?: string;
    notaHorario?: string | null;
  } | null;
};

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
const DIAS_DISPONIBILIDAD = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function textoAcuerdoHonorario(esquema: EsquemaHonorario, valor: number | null): string {
  if (esquema === "PORCENTAJE") return `Comisión del ${valor ?? 0}% sobre pagos de tu cartera`;
  if (esquema === "FIJO_POR_SESION") return `${formatMonto(valor ?? 0)} fijo por sesión completada`;
  if (esquema === "FIJO_MENSUAL") return `${formatMonto(valor ?? 0)} fijo mensual`;
  return "Acuerdo de pago en revisión con la administración (Por definir)";
}

function FilaCita({
  cita,
  onAbrirNotas,
  onCambiarEstado,
  procesandoId,
}: {
  cita: CitaApi;
  onAbrirNotas: (cita: CitaApi) => void;
  onCambiarEstado: (citaId: string, estado: EstadoCita) => void;
  procesandoId: string | null;
}) {
  const procesando = procesandoId === cita.id;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-blue-light text-sm font-semibold text-avanza-blue"
          aria-hidden="true"
        >
          {iniciales(cita.cliente.usuario.nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {cita.cliente.usuario.nombre}
            </p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_CITA_BADGE[cita.estado]}`}
            >
              {ESTADO_CITA_LABEL[cita.estado]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="capitalize">{formatFechaCorta(cita.fecha)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatHora(cita.fecha)}
            </span>
            <span className="flex items-center gap-1">
              {cita.modalidad === "Virtual" ? (
                <Video className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              ) : (
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {cita.modalidad}
            </span>
            {cita.modalidad === "Virtual" && cita.estado !== "CANCELADA" && (
              <a
                href={cita.enlaceReunion || `https://meet.jit.si/Avanza-Coaching-${cita.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-avanza-blue hover:underline"
              >
                Sala Virtual &rarr;
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Acciones de Bitácora, Calendario y Autorización de Cita */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAbrirNotas(cita)}
            className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-xs text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FileText className="h-3.5 w-3.5 text-avanza-green dark:text-emerald-400" />
            {cita.notas ? "Bitácora (1)" : "+ Bitácora"}
          </button>
          <BotonCalendario
            cita={{
              id: cita.id,
              fecha: cita.fecha,
              modalidad: cita.modalidad,
              clienteNombre: cita.cliente.usuario.nombre,
              coachNombre: cita.coach?.nombre,
              enlaceReunion: cita.enlaceReunion,
            }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {cita.estado === "PENDIENTE" && (
            <>
              <button
                type="button"
                disabled={procesando}
                onClick={() => onCambiarEstado(cita.id, "CONFIRMADA")}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-avanza-green px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-avanza-green/90 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Autorizar Cita
              </button>
              <button
                type="button"
                disabled={procesando}
                onClick={() => onCambiarEstado(cita.id, "CANCELADA")}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar
              </button>
            </>
          )}
          {cita.estado === "CONFIRMADA" && (
            <button
              type="button"
              disabled={procesando}
              onClick={() => onCambiarEstado(cita.id, "COMPLETADA")}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completar Sesión
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function AdminCitasPage() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<EstadoCita | "todas">("todas");
  const [vista, setVista] = useState<"lista" | "calendario">("lista");
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);
  const [procesandoCitaId, setProcesandoCitaId] = useState<string | null>(null);

  const [citaNotas, setCitaNotas] = useState<CitaApi | null>(null);
  const [textoNotas, setTextoNotas] = useState("");
  const [enlaceReunionInput, setEnlaceReunionInput] = useState("");
  const [guardandoNotas, setGuardandoNotas] = useState(false);

  // Modal + Agendar Cita
  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [clientesOpciones, setClientesOpciones] = useState<ClienteOpcion[]>([]);
  const [nuevoClienteId, setNuevoClienteId] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("10:00");
  const [nuevaModalidad, setNuevaModalidad] = useState<"Virtual" | "Presencial">("Virtual");
  const [nuevasNotas, setNuevasNotas] = useState("");
  const [creandoCita, setCreandoCita] = useState(false);

  // Modal Mi Disponibilidad & Honorarios
  const [modalDisponibilidad, setModalDisponibilidad] = useState(false);
  const [infoDisponibilidad, setInfoDisponibilidad] = useState<MiDisponibilidadApi | null>(null);
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
  ]);
  const [horaInicioDisp, setHoraInicioDisp] = useState("09:00");
  const [horaFinDisp, setHoraFinDisp] = useState("18:00");
  const [modalidadDisp, setModalidadDisp] = useState("Virtual");
  const [notaHorarioDisp, setNotaHorarioDisp] = useState("");
  const [guardandoDisponibilidad, setGuardandoDisponibilidad] = useState(false);

  function abrirBitacora(cita: CitaApi) {
    setCitaNotas(cita);
    setTextoNotas(cita.notas || "");
    setEnlaceReunionInput(cita.enlaceReunion || "");
  }

  async function cambiarEstadoCita(citaId: string, estado: EstadoCita) {
    setProcesandoCitaId(citaId);
    try {
      await pedirJson(`/api/admin/citas/${citaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, estado } : c)));
      erpToast.fire({
        icon: "success",
        title:
          estado === "CONFIRMADA"
            ? "Cita autorizada y confirmada"
            : estado === "COMPLETADA"
              ? "Sesión marcada como completada"
              : "Cita cancelada",
      });
    } catch (err: unknown) {
      errorToast(err instanceof ErrorApi ? err.message : "No se pudo actualizar la cita");
    } finally {
      setProcesandoCitaId(null);
    }
  }

  async function abrirModalNuevaCita() {
    setModalNuevaCita(true);
    try {
      const { clientes } = await pedirJson<{ clientes: ClienteOpcion[] }>("/api/admin/clientes");
      setClientesOpciones(clientes);
      if (clientes.length > 0 && !nuevoClienteId) {
        setNuevoClienteId(clientes[0].id);
      }
      if (!nuevaFecha) {
        setNuevaFecha(new Date().toISOString().split("T")[0]);
      }
    } catch {
      // Silencioso si no hay clientes
    }
  }

  async function crearNuevaCita() {
    if (!nuevoClienteId || !nuevaFecha || !nuevaHora) {
      errorToast("Selecciona el paciente, la fecha y la hora");
      return;
    }
    setCreandoCita(true);
    try {
      const fechaIso = new Date(`${nuevaFecha}T${nuevaHora}:00`).toISOString();
      await pedirJson("/api/admin/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: nuevoClienteId,
          fecha: fechaIso,
          modalidad: nuevaModalidad,
          notas: nuevasNotas.trim() || null,
        }),
      });
      erpToast.fire({
        icon: "success",
        title: "Cita agendada en tu calendario",
      });
      setModalNuevaCita(false);
      setNuevasNotas("");
      await recargarCitasMes();
    } catch (err: unknown) {
      errorToast(err instanceof ErrorApi ? err.message : "No se pudo agendar la cita");
    } finally {
      setCreandoCita(false);
    }
  }

  async function abrirModalDisponibilidad() {
    setModalDisponibilidad(true);
    try {
      const data = await pedirJson<MiDisponibilidadApi>("/api/admin/mi-disponibilidad");
      setInfoDisponibilidad(data);
      if (data.disponibilidad) {
        if (Array.isArray(data.disponibilidad.dias) && data.disponibilidad.dias.length > 0) {
          setDiasSeleccionados(data.disponibilidad.dias);
        }
        if (data.disponibilidad.horaInicio) setHoraInicioDisp(data.disponibilidad.horaInicio);
        if (data.disponibilidad.horaFin) setHoraFinDisp(data.disponibilidad.horaFin);
        if (data.disponibilidad.modalidadPreferida) {
          setModalidadDisp(data.disponibilidad.modalidadPreferida);
        }
        if (data.disponibilidad.notaHorario) setNotaHorarioDisp(data.disponibilidad.notaHorario);
      }
    } catch (err: unknown) {
      errorToast(err instanceof ErrorApi ? err.message : "No se pudo cargar tu disponibilidad");
    }
  }

  function toggleDiaDisponibilidad(dia: string) {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  }

  async function guardarDisponibilidad() {
    setGuardandoDisponibilidad(true);
    try {
      await pedirJson("/api/admin/mi-disponibilidad", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dias: diasSeleccionados,
          horaInicio: horaInicioDisp,
          horaFin: horaFinDisp,
          modalidadPreferida: modalidadDisp,
          notaHorario: notaHorarioDisp.trim() || null,
        }),
      });
      erpToast.fire({
        icon: "success",
        title: "Horario de disponibilidad guardado",
      });
      setModalDisponibilidad(false);
    } catch (err: unknown) {
      errorToast(err instanceof ErrorApi ? err.message : "Error al guardar disponibilidad");
    } finally {
      setGuardandoDisponibilidad(false);
    }
  }

  async function guardarBitacora() {
    if (!citaNotas) return;
    setGuardandoNotas(true);
    try {
      await pedirJson(`/api/admin/citas/${citaNotas.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notas: textoNotas,
          enlaceReunion: enlaceReunionInput.trim() || null,
        }),
      });
      setCitas((prev) =>
        prev.map((c) =>
          c.id === citaNotas.id
            ? { ...c, notas: textoNotas, enlaceReunion: enlaceReunionInput.trim() || null }
            : c,
        ),
      );
      erpToast.fire({
        icon: "success",
        title: "Bitácora y enlace actualizados correctamente",
      });
      setCitaNotas(null);
    } catch (err: unknown) {
      const msg = err instanceof ErrorApi ? err.message : "Error al guardar la bitácora";
      errorToast(msg);
    } finally {
      setGuardandoNotas(false);
    }
  }

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

  const recargarCitasMes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const desde = new Date(anioActual, mesActual, 1);
      const hasta = new Date(anioActual, mesActual + 1, 1);
      const respuesta = await pedirJson<{ citas: CitaApi[] }>(
        `/api/admin/citas?desde=${encodeURIComponent(desde.toISOString())}&hasta=${encodeURIComponent(hasta.toISOString())}`,
      );
      setCitas(respuesta.citas);
    } catch (err) {
      setError(manejarError(err));
    } finally {
      setCargando(false);
    }
  }, [anioActual, mesActual, manejarError]);

  useEffect(() => {
    recargarCitasMes();
  }, [recargarCitasMes]);

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
      <AdminHeader title="Mi Calendario y Citas" />

      <main className="mx-auto min-h-dvh max-w-md lg:max-w-6xl px-5 pb-28 pt-6">
        {/* Barra superior de acciones del Calendario propio */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={abrirModalNuevaCita}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-avanza-green px-3 text-xs font-bold text-white shadow-sm hover:bg-avanza-green/90 active:scale-95 transition-all"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              <span>+ Agendar Cita</span>
            </button>

            <button
              type="button"
              onClick={abrirModalDisponibilidad}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <Settings2 className="h-3.5 w-3.5 text-avanza-blue" />
              <span>Mi Disponibilidad</span>
            </button>
          </div>

          <a
            href="/api/admin/citas/exportar"
            download
            title="Descargar registro de horas ICF en formato Excel / CSV"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-avanza-green dark:text-emerald-400" />
            <span>Log ICF</span>
          </a>
        </div>

        <div className="mb-4 flex items-center justify-between gap-2">
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
                className={`flex-1 rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold transition-colors duration-150 ${
                  filtro === f.id
                    ? "bg-avanza-green text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-700 dark:text-gray-300"
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
                <FilaCita
                  key={cita.id}
                  cita={cita}
                  onAbrirNotas={abrirBitacora}
                  onCambiarEstado={cambiarEstadoCita}
                  procesandoId={procesandoCitaId}
                />
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
                      <FilaCita
                        key={cita.id}
                        cita={cita}
                        onAbrirNotas={abrirBitacora}
                        onCambiarEstado={cambiarEstadoCita}
                        procesandoId={procesandoCitaId}
                      />
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal Agendar Nueva Cita */}
        {modalNuevaCita && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-avanza-green">
                    <CalendarPlus className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Agendar Sesión en mi Calendario
                    </h3>
                    <p className="text-xs text-gray-500">
                      Selecciona el paciente y horario de la sesión
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNuevaCita(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                    Paciente / Coachee
                  </label>
                  <select
                    value={nuevoClienteId}
                    onChange={(e) => setNuevoClienteId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">-- Seleccionar paciente --</option>
                    {clientesOpciones.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.usuario.nombre} ({cl.usuario.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={nuevaFecha}
                      onChange={(e) => setNuevaFecha(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                      Hora
                    </label>
                    <input
                      type="time"
                      value={nuevaHora}
                      onChange={(e) => setNuevaHora(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                    Modalidad
                  </label>
                  <select
                    value={nuevaModalidad}
                    onChange={(e) => setNuevaModalidad(e.target.value as "Virtual" | "Presencial")}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Virtual">Virtual (Videollamada)</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                    Notas iniciales (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={nuevasNotas}
                    onChange={(e) => setNuevasNotas(e.target.value)}
                    placeholder="Ej. Sesión de seguimiento GROW..."
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaCita(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={crearNuevaCita}
                  disabled={creandoCita}
                  className="flex items-center gap-1.5 rounded-xl bg-avanza-green px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-avanza-green/90 disabled:opacity-50"
                >
                  {creandoCita ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Agendar Cita"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Mi Disponibilidad y Acuerdo de Honorarios */}
        {modalDisponibilidad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-avanza-blue">
                    <Settings2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Mi Disponibilidad y Honorarios
                    </h3>
                    <p className="text-xs text-gray-500">
                      Configura los días y horarios de tu calendario
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalDisponibilidad(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {infoDisponibilidad && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <p className="font-bold text-emerald-900 dark:text-emerald-300">
                    Tu Acuerdo de Honorarios con el Centro:
                  </p>
                  <p className="mt-0.5 text-emerald-800 dark:text-emerald-200">
                    {textoAcuerdoHonorario(
                      infoDisponibilidad.esquemaHonorario,
                      infoDisponibilidad.valorHonorario,
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                    Sesiones completadas este mes: <strong>{infoDisponibilidad.sesionesCompletadasMes}</strong>
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">
                    Días de atención
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS_DISPONIBILIDAD.map((dia) => {
                      const activo = diasSeleccionados.includes(dia);
                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => toggleDiaDisponibilidad(dia)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            activo
                              ? "bg-avanza-green text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                      Hora inicio
                    </label>
                    <input
                      type="time"
                      value={horaInicioDisp}
                      onChange={(e) => setHoraInicioDisp(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                      Hora cierre
                    </label>
                    <input
                      type="time"
                      value={horaFinDisp}
                      onChange={(e) => setHoraFinDisp(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                    Modalidad preferida
                  </label>
                  <select
                    value={modalidadDisp}
                    onChange={(e) => setModalidadDisp(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Virtual">Virtual</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Ambas">Ambas (Virtual y Presencial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 dark:text-gray-300">
                    Observaciones de agenda (opcional)
                  </label>
                  <input
                    type="text"
                    value={notaHorarioDisp}
                    onChange={(e) => setNotaHorarioDisp(e.target.value)}
                    placeholder="Ej. Sábados solo por la mañana"
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalDisponibilidad(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={guardarDisponibilidad}
                  disabled={guardandoDisponibilidad}
                  className="flex items-center gap-1.5 rounded-xl bg-avanza-green px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-avanza-green/90 disabled:opacity-50"
                >
                  {guardandoDisponibilidad ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Guardar Horario
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Bitácora Confidencial */}
        {citaNotas && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-scale-up">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Bitácora Confidencial de Coaching</h3>
                    <p className="text-xs text-gray-500">
                      Coachee: {citaNotas.cliente.usuario.nombre} · {citaNotas.modalidad}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCitaNotas(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                    Enlace de Videollamada (Meet / Zoom / Teams)
                  </label>
                  <input
                    type="url"
                    value={enlaceReunionInput}
                    onChange={(e) => setEnlaceReunionInput(e.target.value)}
                    placeholder="https://meet.google.com/xyz o https://zoom.us/j/..."
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-avanza-blue focus:outline-none focus:ring-1 focus:ring-avanza-blue dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                    Notas de Sesión & Observaciones (Solo visible para Coaches / ICF)
                  </label>
                  <textarea
                    rows={5}
                    value={textoNotas}
                    onChange={(e) => setTextoNotas(e.target.value)}
                    placeholder="Escribe tus observaciones de la sesión: estado emocional, metas revisadas, acuerdos y tareas convenidas..."
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-avanza-blue focus:outline-none focus:ring-1 focus:ring-avanza-blue dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
                <a
                  href={`/admin/citas/${citaNotas.id}/reporte`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5 text-avanza-green" />
                  <span>Reporte ICF / Imprimir</span>
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCitaNotas(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={guardarBitacora}
                    disabled={guardandoNotas}
                    className="flex items-center gap-1.5 rounded-xl bg-avanza-green px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-avanza-green/90 disabled:opacity-50"
                  >
                    {guardandoNotas ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {guardandoNotas ? "Guardando..." : "Guardar Bitácora"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
