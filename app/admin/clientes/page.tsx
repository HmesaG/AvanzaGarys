"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Phone, Mail, ChevronLeft, ChevronRight, Clock, Video, MapPin, CalendarX } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import {
  formatFechaCorta,
  fechaHoyIso,
  type CitaAdmin,
  type ClienteAdmin,
  type LineaAsesoriaAdmin,
} from "@/lib/admin-mock-data";

const LINEA_BADGE: Record<LineaAsesoriaAdmin, string> = {
  Personal: "bg-avanza-green-light text-avanza-green-dark",
  Corporativo: "bg-avanza-blue-light text-avanza-blue",
  Deportivo: "bg-avanza-orange-light text-avanza-orange",
};

type ClienteDetalleData = ClienteAdmin & {
  edad: number;
  citas: CitaAdmin[];
  programas: { id: string; nombre: string; asignadoEn: string }[];
};

function ClienteDetalle({
  clienteId,
  onVolver,
}: {
  clienteId: string;
  onVolver: () => void;
}) {
  const [cliente, setCliente] = useState<ClienteDetalleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      try {
        const res = await fetch(`/api/admin/clientes/${clienteId}`);
        if (!res.ok) throw new Error("Error al cargar el cliente");
        const { cliente: detalle } = (await res.json()) as { cliente: ClienteDetalleData };
        if (!cancelado) {
          setCliente(detalle);
          setError(false);
        }
      } catch {
        if (!cancelado) setError(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [clienteId]);

  const hoyIso = fechaHoyIso();
  const proximas = (cliente?.citas ?? [])
    .filter((c) => c.fecha >= hoyIso)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pasadas = (cliente?.citas ?? [])
    .filter((c) => c.fecha < hoyIso)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="animate-fade-in">
      <button
        type="button"
        onClick={onVolver}
        className="mb-4 flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-avanza-green transition-colors duration-150 hover:bg-avanza-green-light active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la lista
      </button>

      {cargando ? (
        <p className="mt-10 text-center text-sm text-gray-500">Cargando cliente...</p>
      ) : error || !cliente ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          No se pudo cargar la ficha del cliente.
        </p>
      ) : (
        <>
          <section className="mb-6 flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <span
              className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-avanza-green-light text-xl font-semibold text-avanza-green-dark"
              aria-hidden="true"
            >
              {cliente.iniciales}
            </span>
            <p className="text-lg font-bold text-gray-900">{cliente.nombre}</p>
            <span
              className={`mt-2 rounded-full px-2.5 py-1 text-xs font-medium ${LINEA_BADGE[cliente.linea]}`}
            >
              Línea {cliente.linea}
            </span>
          </section>

          <section aria-label="Datos de contacto" className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Contacto
            </h2>
            <a
              href={`tel:${cliente.telefono.replace(/-/g, "")}`}
              className="flex min-h-[44px] items-center gap-3 rounded-lg py-1 text-sm text-gray-700 transition-colors duration-150 hover:text-avanza-green"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Phone className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </span>
              {cliente.telefono}
            </a>
            <a
              href={`mailto:${cliente.correo}`}
              className="flex min-h-[44px] items-center gap-3 rounded-lg py-1 text-sm text-gray-700 transition-colors duration-150 hover:text-avanza-green"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Mail className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </span>
              {cliente.correo}
            </a>
          </section>

          {cliente.programas.length > 0 && (
            <section aria-label="Programas asignados" className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Programas asignados</h2>
              <ul className="space-y-2">
                {cliente.programas.map((programa) => (
                  <li
                    key={programa.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 text-sm font-medium text-gray-900"
                  >
                    {programa.nombre}
                  </li>
                ))}
              </ul>
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
                  <li
                    key={cita.id}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize text-gray-900">
                        {formatFechaCorta(cita.fecha)}
                      </p>
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
                      {cita.estado === "confirmada" ? "Confirmada" : "Pendiente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {pasadas.length > 0 && (
            <section aria-label="Historial de citas">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Historial</h2>
              <ul className="space-y-3">
                {pasadas.map((cita) => (
                  <li
                    key={cita.id}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize text-gray-700">
                        {formatFechaCorta(cita.fecha)}
                      </p>
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
                    <span className="shrink-0 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                      Realizada
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminClientesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/admin/clientes");
        if (!res.ok) throw new Error("Error al cargar clientes");
        const { clientes: lista } = (await res.json()) as { clientes: ClienteAdmin[] };
        setClientes(lista);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [busqueda, clientes]);

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Clientes" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        {clienteSeleccionadoId ? (
          <ClienteDetalle
            clienteId={clienteSeleccionadoId}
            onVolver={() => setClienteSeleccionadoId(null)}
          />
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
                placeholder="Buscar cliente por nombre"
                aria-label="Buscar cliente por nombre"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-avanza-green focus:outline-none focus:ring-2 focus:ring-avanza-green/20"
              />
            </label>

            {cargando ? (
              <p className="mt-10 text-center text-sm text-gray-500">Cargando clientes...</p>
            ) : error ? (
              <p className="mt-10 text-center text-sm text-gray-500">
                No se pudo cargar la lista de clientes.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {clientesFiltrados.length} cliente{clientesFiltrados.length === 1 ? "" : "s"}
                </p>

                {clientesFiltrados.length === 0 ? (
                  <p className="mt-10 text-center text-sm text-gray-500">
                    No se encontraron clientes con ese nombre.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {clientesFiltrados.map((cliente) => (
                      <li key={cliente.id}>
                        <button
                          type="button"
                          onClick={() => setClienteSeleccionadoId(cliente.id)}
                          className="flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors duration-150 hover:bg-gray-50 active:scale-[0.99]"
                        >
                          <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-green-light text-sm font-semibold text-avanza-green-dark"
                            aria-hidden="true"
                          >
                            {cliente.iniciales}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {cliente.nombre}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${LINEA_BADGE[cliente.linea]}`}
                              >
                                {cliente.linea}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-gray-500">
                              <p className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                {cliente.telefono}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                                {cliente.correo}
                              </p>
                            </div>
                          </div>
                          <ChevronRight
                            className="mt-2.5 h-4 w-4 shrink-0 text-gray-300"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </main>
    </PageTransition>
  );
}
