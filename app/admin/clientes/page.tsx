"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  CalendarX,
  UserCog,
  Building2,
  ClipboardCheck,
  Target,
  Wallet,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  TrendingUp,
  Trophy,
  MessageCircle,
  Receipt,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import AdminChatModal from "@/components/AdminChatModal";
import { ErrorApi, pedirJson } from "@/lib/api-navegador";
import {
  ESTADO_CITA_BADGE,
  ESTADO_CITA_LABEL,
  ESTADO_PAGO_BADGE,
  ESTADO_PAGO_LABEL,
  LINEA_BADGE,
  LINEA_LABEL,
  formatFechaCorta,
  formatFechaLarga,
  formatHora,
  formatMonto,
  iniciales,
} from "@/lib/admin-formato";
import type { EstadoCita, EstadoPago, LineaAsesoria } from "@/generated/prisma/client";

/** Ms de quietud en el input antes de pegarle a la API. */
const DEBOUNCE_BUSQUEDA = 300;

// Formas de la respuesta JSON de `/api/admin/clientes` y `/api/admin/clientes/[id]`.
// Se declaran a mano (y no derivadas de `lib/admin-queries.ts`) porque al pasar
// por JSON los `DateTime` de Prisma llegan como string, no como `Date`.

type ClienteLista = {
  id: string;
  linea: LineaAsesoria;
  telefono: string | null;
  createdAt: string;
  usuario: { id: string; nombre: string; email: string; activo: boolean };
  coach: { id: string; nombre: string } | null;
  empresa: { id: string; nombre: string } | null;
  _count: { programas: number; citas: number; evaluaciones: number };
};

type ClienteDetalle = {
  id: string;
  linea: LineaAsesoria;
  telefono: string | null;
  createdAt: string;
  usuario: { id: string; nombre: string; email: string; activo: boolean };
  coach: { id: string; nombre: string } | null;
  empresa: { id: string; nombre: string } | null;
  evaluaciones: {
    id: string;
    objetivoPrincipal: string;
    principalDificultad: string | null;
    tiempoObjetivo: string | null;
    revisadaAt: string | null;
    createdAt: string;
    revisadaPor: { id: string; nombre: string } | null;
  }[];
  programas: {
    id: string;
    nombre: string;
    descripcion: string | null;
    progreso: number;
    activo: boolean;
    consentimientoAceptado: boolean;
  }[];
  citas: {
    id: string;
    fecha: string;
    modalidad: string;
    estado: EstadoCita;
    notas: string | null;
  }[];
  pagos: {
    id: string;
    monto: number;
    estado: EstadoPago;
    metodo: string | null;
    concepto: string | null;
    fechaPago: string | null;
    comprobanteUrl: string | null;
  }[];
  tareas: { id: string; label: string; completada: boolean }[];
  diagnostico?: {
    climaLaboral: string;
    principalDesafio: string;
    nivelComunicacion: string;
    objetivoEmpresa: string;
  } | null;
  diagnosticoDeportivo?: {
    disciplina: string;
    categoria: string;
    metaCompetitiva: string;
    bloqueoMental: string;
    nivelDescansoNutricion: string;
    horasEntrenamientoSemana: number;
  } | null;
};

function Cargando({ etiqueta }: { etiqueta: string }) {
  return (
    <p className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {etiqueta}
    </p>
  );
}

function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {mensaje}
    </div>
  );
}

function FilaCita({
  cita,
  atenuada = false,
}: {
  cita: ClienteDetalle["citas"][number];
  atenuada?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border border-gray-200 p-4 ${
        atenuada ? "bg-gray-50" : "bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold capitalize ${
            atenuada ? "text-gray-700" : "text-gray-900"
          }`}
        >
          {formatFechaCorta(cita.fecha)}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
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

function DetalleCliente({
  cliente,
  onVolver,
  onAbrirChat,
}: {
  cliente: ClienteDetalle;
  onVolver: () => void;
  onAbrirChat: (c: { id: string; nombre: string; linea: string }) => void;
}) {
  const ahora = Date.now();
  // La API devuelve las citas de la más nueva a la más vieja; las próximas se
  // reordenan para que la más cercana quede arriba.
  const proximas = cliente.citas
    .filter((cita) => new Date(cita.fecha).getTime() >= ahora)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pasadas = cliente.citas.filter((cita) => new Date(cita.fecha).getTime() < ahora);

  return (
    <div className="animate-fade-in">
      <button
        type="button"
        onClick={onVolver}
        className="mb-4 flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-avanza-green transition-colors duration-150 hover:bg-avanza-green-light active:scale-95 dark:hover:bg-emerald-950/40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la lista
      </button>

      <section className="mb-6 flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <span
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-avanza-green-light text-xl font-semibold text-avanza-green-dark dark:bg-emerald-950/50 dark:text-emerald-400"
          aria-hidden="true"
        >
          {iniciales(cliente.usuario.nombre)}
        </span>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{cliente.usuario.nombre}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${LINEA_BADGE[cliente.linea]}`}
          >
            Línea {LINEA_LABEL[cliente.linea]}
          </span>
          {!cliente.usuario.activo && (
            <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Inactivo
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          Cliente desde {formatFechaLarga(cliente.createdAt)}
        </p>

        {/* Botón de Chat Integrado */}
        <button
          type="button"
          onClick={() =>
            onAbrirChat({
              id: cliente.id,
              nombre: cliente.usuario.nombre,
              linea: LINEA_LABEL[cliente.linea],
            })
          }
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-avanza-green px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-avanza-green/90 active:scale-98"
        >
          <MessageCircle className="h-4 w-4" />
          Abrir Chat con Coachee
        </button>
      </section>

      <section
        aria-label="Datos de contacto"
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Contacto
        </h2>
        {cliente.telefono ? (
          <a
            href={`tel:${cliente.telefono.replace(/[^\d+]/g, "")}`}
            className="flex min-h-[44px] items-center gap-3 rounded-lg py-1 text-sm text-gray-700 transition-colors duration-150 hover:text-avanza-green dark:text-gray-300 dark:hover:text-emerald-400"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            </span>
            {cliente.telefono}
          </a>
        ) : (
          <p className="flex min-h-[44px] items-center gap-3 py-1 text-sm text-gray-400 dark:text-gray-500">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </span>
            Sin teléfono registrado
          </p>
        )}
        <a
          href={`mailto:${cliente.usuario.email}`}
          className="flex min-h-[44px] items-center gap-3 rounded-lg py-1 text-sm text-gray-700 transition-colors duration-150 hover:text-avanza-green dark:text-gray-300 dark:hover:text-emerald-400"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate">{cliente.usuario.email}</span>
        </a>
        <p className="flex min-h-[44px] items-center gap-3 py-1 text-sm text-gray-700 dark:text-gray-300">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <UserCog className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </span>
          {cliente.coach ? cliente.coach.nombre : "Sin coach asignado"}
        </p>
        {cliente.empresa && (
          <p className="flex min-h-[44px] items-center gap-3 py-1 text-sm text-gray-700 dark:text-gray-300">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            </span>
            {cliente.empresa.nombre}
          </p>
        )}
      </section>

      {cliente.programas.length > 0 && (
        <section aria-label="Programas" className="mb-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Target className="h-4 w-4 text-avanza-green" aria-hidden="true" />
            Programas
          </h2>
          <ul className="space-y-3">
            {cliente.programas.map((programa) => (
              <li
                key={programa.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{programa.nombre}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      programa.activo
                        ? "bg-avanza-green-light text-avanza-green-dark"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {programa.activo ? "Activo" : "Cerrado"}
                  </span>
                </div>
                {programa.descripcion && (
                  <p className="mt-1 text-xs text-gray-500">{programa.descripcion}</p>
                )}
                <div
                  role="progressbar"
                  aria-label={`Progreso de ${programa.nombre}`}
                  aria-valuenow={programa.progreso}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100"
                >
                  <div
                    className="h-full rounded-full bg-avanza-green transition-[width] duration-500 ease-out"
                    style={{ width: `${programa.progreso}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs tabular-nums text-gray-500">
                  {programa.progreso}% completado
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cliente.evaluaciones.length > 0 && (
        <section aria-label="Evaluaciones" className="mb-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <ClipboardCheck className="h-4 w-4 text-avanza-blue" aria-hidden="true" />
            Evaluaciones
          </h2>
          <ul className="space-y-3">
            {cliente.evaluaciones.map((evaluacion) => (
              <li
                key={evaluacion.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {evaluacion.objetivoPrincipal}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      evaluacion.revisadaAt
                        ? "bg-avanza-green-light text-avanza-green-dark"
                        : "bg-avanza-orange-light text-avanza-orange"
                    }`}
                  >
                    {evaluacion.revisadaAt ? "Revisada" : "Pendiente"}
                  </span>
                </div>
                {evaluacion.principalDificultad && (
                  <p className="mt-1.5 text-xs text-gray-600">
                    Dificultad: {evaluacion.principalDificultad}
                  </p>
                )}
                {evaluacion.tiempoObjetivo && (
                  <p className="mt-1 text-xs text-gray-600">
                    Tiempo deseado: {evaluacion.tiempoObjetivo}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Enviada el {formatFechaLarga(evaluacion.createdAt)}
                  {evaluacion.revisadaPor ? ` · Revisó ${evaluacion.revisadaPor.nombre}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cliente.diagnosticoDeportivo && (
        <section aria-label="Diagnóstico Deportivo" className="mb-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Trophy className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Diagnóstico Deportivo (Alto Rendimiento)
          </h2>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-2 text-xs text-gray-700">
            <div>
              <span className="font-semibold text-gray-900">Disciplina: </span>
              {cliente.diagnosticoDeportivo.disciplina} ({cliente.diagnosticoDeportivo.categoria})
            </div>
            <div>
              <span className="font-semibold text-gray-900">Horas semanales: </span>
              {cliente.diagnosticoDeportivo.horasEntrenamientoSemana} hrs · Recuperación: {cliente.diagnosticoDeportivo.nivelDescansoNutricion}
            </div>
            <div>
              <span className="font-semibold text-gray-900">Meta competitiva: </span>
              {cliente.diagnosticoDeportivo.metaCompetitiva}
            </div>
            <div>
              <span className="font-semibold text-gray-900">Desafío / Presión mental: </span>
              {cliente.diagnosticoDeportivo.bloqueoMental}
            </div>
          </div>
        </section>
      )}

      {cliente.diagnostico && (
        <section aria-label="Diagnóstico Organizacional" className="mb-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Building2 className="h-4 w-4 text-avanza-blue" aria-hidden="true" />
            Diagnóstico Organizacional
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2 text-xs text-gray-700">
            <div>
              <span className="font-semibold text-gray-900">Clima laboral: </span>
              {cliente.diagnostico.climaLaboral}
            </div>
            <div>
              <span className="font-semibold text-gray-900">Comunicación: </span>
              {cliente.diagnostico.nivelComunicacion}
            </div>
            <div>
              <span className="font-semibold text-gray-900">Desafío principal: </span>
              {cliente.diagnostico.principalDesafio}
            </div>
            <div>
              <span className="font-semibold text-gray-900">Objetivo empresa: </span>
              {cliente.diagnostico.objetivoEmpresa}
            </div>
          </div>
        </section>
      )}

      <section aria-label="Próximas citas" className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Próximas citas</h2>
        {proximas.length === 0 ? (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
            <CalendarX className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            Sin citas próximas agendadas.
          </div>
        ) : (
          <ul className="space-y-3">
            {proximas.map((cita) => (
              <FilaCita key={cita.id} cita={cita} />
            ))}
          </ul>
        )}
      </section>

      {pasadas.length > 0 && (
        <section aria-label="Historial de citas" className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Historial</h2>
          <ul className="space-y-3">
            {pasadas.map((cita) => (
              <FilaCita key={cita.id} cita={cita} atenuada />
            ))}
          </ul>
        </section>
      )}

      {cliente.pagos.length > 0 && (
        <section aria-label="Pagos">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Wallet className="h-4 w-4 text-avanza-orange" aria-hidden="true" />
            Pagos
          </h2>
          <ul className="space-y-3">
            {cliente.pagos.map((pago) => (
              <li
                key={pago.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tabular-nums text-gray-900">
                    {formatMonto(pago.monto)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {pago.concepto ?? "Sin concepto"}
                    {pago.metodo ? ` · ${pago.metodo}` : ""}
                    {pago.fechaPago ? ` · ${formatFechaCorta(pago.fechaPago)}` : ""}
                  </p>
                  {pago.comprobanteUrl && (
                    <div className="mt-1.5">
                      <a
                        href={pago.comprobanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/40 dark:text-emerald-300 dark:border dark:border-emerald-800/40"
                      >
                        <Receipt className="h-3 w-3" />
                        <span>Ver Comprobante / Voucher</span>
                      </a>
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_PAGO_BADGE[pago.estado]}`}
                >
                  {ESTADO_PAGO_LABEL[pago.estado]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cliente.tareas.length > 0 && (
        <section aria-label="Progreso">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <TrendingUp className="h-4 w-4 text-avanza-green" aria-hidden="true" />
            Progreso ({cliente.tareas.filter((t) => t.completada).length}/{cliente.tareas.length})
          </h2>
          <ul className="space-y-2">
            {cliente.tareas.map((tarea) => (
              <li
                key={tarea.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
              >
                {tarea.completada ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-avanza-green" aria-hidden="true" />
                ) : (
                  <Square className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                )}
                <span
                  className={`text-sm ${tarea.completada ? "text-gray-500 line-through" : "text-gray-700"}`}
                >
                  {tarea.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function AdminClientesPage() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<ClienteLista[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  const [detalle, setDetalle] = useState<ClienteDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Estado para el modal de chat en vivo con el coachee
  const [chatCliente, setChatCliente] = useState<{ id: string; nombre: string; linea: string } | null>(
    null,
  );

  // La sesión murió del lado del servidor: no hay UX posible más que volver a
  // pedir credenciales. El resto de los errores se muestran en pantalla.
  const manejarError = useCallback(
    (error: unknown, porDefecto: string): string => {
      if (error instanceof ErrorApi) {
        if (error.esNoAutenticado) {
          router.replace("/login?next=/admin/clientes");
          return "Tu sesión expiró. Redirigiendo al inicio de sesión…";
        }
        return error.message;
      }
      return porDefecto;
    },
    [router],
  );

  // La búsqueda la resuelve la API (`?q=`), no el cliente: así el filtro corre
  // sobre todos los clientes y no sólo sobre la página ya descargada.
  useEffect(() => {
    const termino = busqueda.trim();
    const controlador = new AbortController();

    const temporizador = window.setTimeout(async () => {
      setCargandoLista(true);
      setErrorLista(null);
      try {
        const url = termino
          ? `/api/admin/clientes?q=${encodeURIComponent(termino)}`
          : "/api/admin/clientes";
        const respuesta = await pedirJson<{ clientes: ClienteLista[] }>(url, {
          signal: controlador.signal,
        });
        setClientes(respuesta.clientes);
      } catch (error) {
        if (controlador.signal.aborted) return;
        setErrorLista(manejarError(error, "No se pudo cargar la lista de clientes."));
      } finally {
        if (!controlador.signal.aborted) setCargandoLista(false);
      }
    }, DEBOUNCE_BUSQUEDA);

    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [busqueda, manejarError]);

  async function abrirDetalle(clienteId: string) {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    setDetalle(null);
    try {
      const { cliente } = await pedirJson<{ cliente: ClienteDetalle }>(
        `/api/admin/clientes/${clienteId}`,
      );
      setDetalle(cliente);
    } catch (error) {
      setErrorDetalle(manejarError(error, "No se pudo cargar la ficha del cliente."));
    } finally {
      setCargandoDetalle(false);
    }
  }

  function volverALista() {
    setDetalle(null);
    setErrorDetalle(null);
  }

  const enVistaDetalle = detalle !== null || cargandoDetalle || errorDetalle !== null;

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Clientes" />

      <main className="mx-auto min-h-dvh max-w-md lg:max-w-6xl px-5 pb-28 pt-6">
        {enVistaDetalle ? (
          detalle ? (
            <DetalleCliente
              cliente={detalle}
              onVolver={volverALista}
              onAbrirChat={(c) => setChatCliente(c)}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={volverALista}
                className="mb-4 flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-avanza-green transition-colors duration-150 hover:bg-avanza-green-light active:scale-95 dark:hover:bg-emerald-950/40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Volver a la lista
              </button>
              {cargandoDetalle ? (
                <Cargando etiqueta="Cargando ficha del cliente…" />
              ) : (
                <MensajeError mensaje={errorDetalle ?? ""} />
              )}
            </>
          )
        ) : (
          <>
            <label className="relative mb-5 block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo"
                aria-label="Buscar cliente por nombre o correo"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-avanza-green focus:outline-none focus:ring-2 focus:ring-avanza-green/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </label>

            {errorLista ? (
              <MensajeError mensaje={errorLista} />
            ) : cargandoLista ? (
              <Cargando etiqueta="Cargando clientes…" />
            ) : (
              <>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {clientes.length} cliente{clientes.length === 1 ? "" : "s"}
                </p>

                {clientes.length === 0 ? (
                  <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {busqueda.trim()
                      ? "No se encontraron clientes con esa búsqueda."
                      : "Todavía no hay clientes registrados."}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {clientes.map((cliente) => (
                      <li key={cliente.id} className="relative">
                        <div className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-xs transition-colors duration-150 hover:bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-850">
                          <button
                            type="button"
                            onClick={() => abrirDetalle(cliente.id)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left active:scale-[0.99]"
                          >
                            <span
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-green-light text-sm font-semibold text-avanza-green-dark dark:bg-emerald-950/50 dark:text-emerald-400"
                              aria-hidden="true"
                            >
                              {iniciales(cliente.usuario.nombre)}
                            </span>
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                  {cliente.usuario.nombre}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${LINEA_BADGE[cliente.linea]}`}
                                >
                                  {LINEA_LABEL[cliente.linea]}
                                </span>
                              </div>
                              <div className="mt-1.5 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                                <p className="flex items-center gap-1.5 truncate">
                                  <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{cliente.usuario.email}</span>
                                </p>
                                <p className="flex items-center gap-1.5 truncate">
                                  <UserCog className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{cliente.coach ? cliente.coach.nombre : "Sin coach"}</span>
                                </p>
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setChatCliente({
                                  id: cliente.id,
                                  nombre: cliente.usuario.nombre,
                                  linea: LINEA_LABEL[cliente.linea],
                                })
                              }
                              aria-label={`Abrir chat con ${cliente.usuario.nombre}`}
                              title="Chat con coachee"
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-avanza-green hover:bg-emerald-100 active:scale-95 transition-all dark:bg-emerald-950/50 dark:text-emerald-300"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirDetalle(cliente.id)}
                              aria-label="Ver ficha completa"
                              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}

        {/* Modal de Chat en Vivo para Staff / Coach */}
        {chatCliente && (
          <AdminChatModal
            clienteId={chatCliente.id}
            clienteNombre={chatCliente.nombre}
            clienteLinea={chatCliente.linea}
            onCerrar={() => setChatCliente(null)}
          />
        )}
      </main>
    </PageTransition>
  );
}
