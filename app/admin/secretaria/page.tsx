"use client";

import { useEffect, useState, FormEvent, useMemo } from "react";
import {
  PhoneCall,
  Calendar,
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Video,
  Receipt,
  Loader2,
  MapPin,
  ExternalLink,
  Plus,
  X,
  Building,
  UserCheck,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { pedirJson, ErrorApi } from "@/lib/api-navegador";
import { erpToast, errorToast, successToast } from "@/lib/alerts";
import { formatFechaCorta, formatHora, iniciales } from "@/lib/admin-formato";

type CitaRecepcion = {
  id: string;
  fecha: string;
  modalidad: string;
  estado: string;
  enlaceReunion?: string | null;
  notas?: string | null;
  cliente: {
    id: string;
    linea: string;
    usuario: { nombre: string; email: string };
  };
  coach?: { id: string; nombre: string } | null;
};

type ClienteDirectorio = {
  id: string;
  linea: string;
  telefono?: string | null;
  usuario: { id: string; nombre: string; email: string };
  coach?: { id: string; nombre: string } | null;
};

type CoachItem = {
  id: string;
  nombre: string;
  email: string;
};

export default function AdminSecretariaPage() {
  const [tab, setTab] = useState<"citas" | "registro" | "directorio">("citas");
  const [citasHoy, setCitasHoy] = useState<CitaRecepcion[]>([]);
  const [clientes, setClientes] = useState<ClienteDirectorio[]>([]);
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroDirectorio, setFiltroDirectorio] = useState("");

  // Estado para registro rápido de coachee
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevaLinea, setNuevaLinea] = useState("PERSONAL");
  const [nuevoCoachId, setNuevoCoachId] = useState("");
  const [registrando, setRegistrando] = useState(false);

  // Estado para agendar cita rápida
  const [modalAgendar, setModalAgendar] = useState(false);
  const [agendarClienteId, setAgendarClienteId] = useState("");
  const [agendarFecha, setAgendarFecha] = useState("");
  const [agendarHora, setAgendarHora] = useState("10:00");
  const [agendarModalidad, setAgendarModalidad] = useState("Presencial");
  const [guardandoCita, setGuardandoCita] = useState(false);

  async function cargarDatos() {
    setCargando(true);
    try {
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
      const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();

      const [resCitas, resClientes, resCoaches] = await Promise.all([
        pedirJson<{ citas: CitaRecepcion[] }>(
          `/api/admin/citas?desde=${encodeURIComponent(inicioDia)}&hasta=${encodeURIComponent(finDia)}`,
        ).catch(() => ({ citas: [] })),
        pedirJson<{ clientes: ClienteDirectorio[] }>("/api/admin/clientes").catch(() => ({ clientes: [] })),
        pedirJson<{ coaches: CoachItem[] }>("/api/admin/coaches").catch(() => ({ coaches: [] })),
      ]);

      setCitasHoy(resCitas.citas || []);
      setClientes(resClientes.clientes || []);
      setCoaches(resCoaches.coaches || []);
    } catch {
      errorToast("Error al cargar datos del módulo de secretaría");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  async function handleConfirmarLlegada(citaId: string) {
    try {
      await pedirJson(`/api/admin/citas/${citaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "CONFIRMADA" }),
      });
      setCitasHoy((prev) =>
        prev.map((c) => (c.id === citaId ? { ...c, estado: "CONFIRMADA" } : c)),
      );
      successToast("Asistencia confirmada");
    } catch {
      errorToast("No se pudo actualizar el estado de la cita");
    }
  }

  async function handleCrearCliente(e: FormEvent) {
    e.preventDefault();
    if (!nuevoNombre || !nuevoEmail) return;

    setRegistrando(true);
    try {
      const data = await pedirJson<{ cliente: ClienteDirectorio }>("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoNombre,
          email: nuevoEmail,
          telefono: nuevoTelefono,
          linea: nuevaLinea,
          coachId: nuevoCoachId || undefined,
        }),
      });

      if (data?.cliente) {
        setClientes((prev) => [data.cliente, ...prev]);
        setNuevoNombre("");
        setNuevoEmail("");
        setNuevoTelefono("");
        successToast("Coachee registrado correctamente");
        setTab("directorio");
      }
    } catch (err: unknown) {
      const msg = err instanceof ErrorApi ? err.message : "Error al registrar cliente";
      errorToast(msg);
    } finally {
      setRegistrando(false);
    }
  }

  async function handleGuardarCita(e: FormEvent) {
    e.preventDefault();
    if (!agendarClienteId || !agendarFecha || !agendarHora) return;

    setGuardandoCita(true);
    try {
      const fechaCompleta = new Date(`${agendarFecha}T${agendarHora}:00`);
      const data = await pedirJson<{ cita: CitaRecepcion }>("/api/admin/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: agendarClienteId,
          fecha: fechaCompleta.toISOString(),
          modalidad: agendarModalidad,
        }),
      });

      if (data?.cita) {
        successToast("Cita agendada exitosamente");
        setModalAgendar(false);
        cargarDatos();
      }
    } catch (err: unknown) {
      const msg = err instanceof ErrorApi ? err.message : "No se pudo agendar la cita";
      errorToast(msg);
    } finally {
      setGuardandoCita(false);
    }
  }

  const clientesFiltrados = useMemo(() => {
    if (!filtroDirectorio.trim()) return clientes;
    const q = filtroDirectorio.toLowerCase();
    return clientes.filter(
      (c) =>
        c.usuario.nombre.toLowerCase().includes(q) ||
        c.usuario.email.toLowerCase().includes(q) ||
        (c.telefono && c.telefono.includes(q)),
    );
  }, [clientes, filtroDirectorio]);

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Recepción & Secretaría" />

      <main className="mx-auto min-h-dvh max-w-md lg:max-w-6xl px-5 pb-28 pt-6">
        {/* Cabecera del Portal de Recepción */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PhoneCall className="h-6 w-6 text-avanza-green" />
              <span>Módulo de Secretaría & Recepción</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Control de ingresos del día, llamadas, citas y registro express de coachees.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalAgendar(true)}
              className="flex items-center gap-1.5 rounded-xl bg-avanza-green px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-avanza-green/90 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Agendar Cita</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("registro")}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <UserPlus className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Nuevo Coachee</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación del Módulo */}
        <div className="mb-6 flex gap-2 border-b border-gray-200 pb-1 dark:border-gray-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab("citas")}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              tab === "citas"
                ? "border-avanza-green text-avanza-green"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Citas del Día ({citasHoy.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("directorio")}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              tab === "directorio"
                ? "border-avanza-green text-avanza-green"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Directorio de Coachees ({clientes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("registro")}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              tab === "registro"
                ? "border-avanza-green text-avanza-green"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Registro Rápido</span>
          </button>
        </div>

        {/* Contenido según la pestaña activa */}
        {tab === "citas" && (
          <section aria-label="Citas de Hoy">
            {cargando ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 className="h-7 w-7 animate-spin text-avanza-green" />
                <p className="mt-2 text-xs">Cargando agenda de recepción...</p>
              </div>
            ) : citasHoy.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center bg-white dark:border-gray-800 dark:bg-gray-900">
                <Calendar className="mx-auto h-9 w-9 text-gray-400 mb-2" />
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  No hay citas registradas para hoy
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Usa el botón &quot;Agendar Cita&quot; para registrar sesiones presenciales o virtuales.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {citasHoy.map((cita) => {
                  const esVirtual = cita.modalidad === "Virtual";
                  const enlace = cita.enlaceReunion || `https://meet.jit.si/Avanza-Coaching-${cita.id}`;

                  return (
                    <div
                      key={cita.id}
                      className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-white">
                            <Clock className="h-3.5 w-3.5 text-avanza-green" />
                            {formatHora(cita.fecha)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              cita.estado === "CONFIRMADA"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {cita.estado}
                          </span>
                        </div>

                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {cita.cliente.usuario.nombre}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {cita.coach?.nombre ? `Coach: ${cita.coach.nombre}` : "Coach no asignado"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          {esVirtual ? (
                            <Video className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                          <span>Modalidad {cita.modalidad}</span>
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 dark:border-gray-800">
                        {esVirtual ? (
                          <a
                            href={enlace}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <span>Abrir Sala</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            En Sala AvanzA
                          </span>
                        )}

                        {cita.estado !== "CONFIRMADA" && (
                          <button
                            type="button"
                            onClick={() => handleConfirmarLlegada(cita.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Confirmar Llegada</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "directorio" && (
          <section aria-label="Directorio de Coachees">
            <div className="mb-4 relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o teléfono..."
                value={filtroDirectorio}
                onChange={(e) => setFiltroDirectorio(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientesFiltrados.map((cliente) => (
                <div
                  key={cliente.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900 flex items-start gap-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-bold text-avanza-green dark:bg-emerald-950/60 dark:text-emerald-300">
                    {iniciales(cliente.usuario.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                      {cliente.usuario.nombre}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{cliente.usuario.email}</p>
                    {cliente.telefono && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 font-mono mt-0.5">
                        📞 {cliente.telefono}
                      </p>
                    )}
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {cliente.linea}
                      </span>
                      {cliente.coach && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Coach: {cliente.coach.nombre.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "registro" && (
          <section aria-label="Registro Rápido de Coachee" className="max-w-xl mx-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <UserPlus className="h-5 w-5 text-avanza-green" />
              <span>Alta Express de Coachee / Cliente</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Registra un nuevo cliente que se comunique por recepción o teléfono para asignarle coach de inmediato.
            </p>

            <form onSubmit={handleCrearCliente} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej. Roberto Martínez"
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="cliente@ejemplo.com"
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="809-555-0199"
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                    Línea de Coaching
                  </label>
                  <select
                    value={nuevaLinea}
                    onChange={(e) => setNuevaLinea(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="CORPORATIVO">Corporativo / B2B</option>
                    <option value="DEPORTIVO">Deportivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                    Coach Asignado (Opcional)
                  </label>
                  <select
                    value={nuevoCoachId}
                    onChange={(e) => setNuevoCoachId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">-- Sin asignar por ahora --</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={registrando}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-avanza-green py-3 text-xs sm:text-sm font-semibold text-white shadow hover:bg-avanza-green/90 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {registrando && <Loader2 className="h-4 w-4 animate-spin" />}
                  {registrando ? "Registrando expediente..." : "Completar Alta de Coachee"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Modal para Agendar Cita */}
        {modalAgendar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl animate-scale-up dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-avanza-green" />
                  <span>Agendar Cita en Recepción</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setModalAgendar(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleGuardarCita} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                    Seleccionar Coachee *
                  </label>
                  <select
                    required
                    value={agendarClienteId}
                    onChange={(e) => setAgendarClienteId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">-- Elige un cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.usuario.nombre} ({c.linea})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      required
                      value={agendarFecha}
                      onChange={(e) => setAgendarFecha(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                      Hora *
                    </label>
                    <input
                      type="time"
                      required
                      value={agendarHora}
                      onChange={(e) => setAgendarHora(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 dark:text-gray-300">
                    Modalidad *
                  </label>
                  <select
                    value={agendarModalidad}
                    onChange={(e) => setAgendarModalidad(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm text-gray-900 focus:border-avanza-green focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Presencial">Presencial (En Oficinas AvanzA)</option>
                    <option value="Virtual">Virtual (Sala Online / Meet / Zoom)</option>
                  </select>
                </div>

                <div className="mt-5 flex gap-2 justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setModalAgendar(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoCita}
                    className="flex items-center gap-1.5 rounded-xl bg-avanza-green px-4 py-2 text-xs font-semibold text-white shadow hover:bg-avanza-green/90 disabled:opacity-50 active:scale-95"
                  >
                    {guardandoCita && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {guardandoCita ? "Guardando..." : "Confirmar Cita"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
