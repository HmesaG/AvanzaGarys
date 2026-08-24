"use client";

// Panel admin — Empresas (Fase 5 Entrega 1: coaching organizacional). Mismo
// patrón lista + detalle que `/admin/clientes` (ver ese archivo como plantilla).
import { useEffect, useMemo, useState, FormEvent } from "react";
import {
  Search,
  Plus,
  X,
  Mail,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import TextField from "@/components/TextField";
import { successToast } from "@/lib/alerts";

type EmpresaAdmin = {
  id: string;
  nombre: string;
  contacto: string;
  correo: string;
  participantes: number;
};

type ParticipanteEmpresa = {
  id: string;
  nombre: string;
  correo: string;
  diagnosticoCompletado: boolean;
};

type EmpresaDetalleData = {
  id: string;
  nombre: string;
  contacto: string;
  correo: string;
  participantes: ParticipanteEmpresa[];
};

function EmpresaDetalle({ empresaId, onVolver }: { empresaId: string; onVolver: () => void }) {
  const [empresa, setEmpresa] = useState<EmpresaDetalleData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      try {
        const res = await fetch(`/api/admin/empresas/${empresaId}`);
        if (!res.ok) throw new Error("Error al cargar la empresa");
        const { empresa: detalle } = (await res.json()) as { empresa: EmpresaDetalleData };
        if (!cancelado) {
          setEmpresa(detalle);
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
  }, [empresaId]);

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
        <p className="mt-10 text-center text-sm text-gray-500">Cargando empresa...</p>
      ) : error || !empresa ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          No se pudo cargar la ficha de la empresa.
        </p>
      ) : (
        <>
          <section className="mb-6 flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <span
              className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-avanza-blue-light text-avanza-blue"
              aria-hidden="true"
            >
              <Building2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="text-lg font-bold text-gray-900">{empresa.nombre}</p>
          </section>

          <section
            aria-label="Datos de contacto"
            className="mb-6 rounded-2xl border border-gray-200 bg-white p-4"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Contacto
            </h2>
            <p className="flex min-h-[36px] items-center gap-3 text-sm text-gray-700">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Users className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </span>
              {empresa.contacto}
            </p>
            <a
              href={`mailto:${empresa.correo}`}
              className="flex min-h-[44px] items-center gap-3 rounded-lg py-1 text-sm text-gray-700 transition-colors duration-150 hover:text-avanza-green"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Mail className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </span>
              {empresa.correo}
            </a>
          </section>

          <section aria-label="Participantes">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Participantes ({empresa.participantes.length})
            </h2>
            {empresa.participantes.length === 0 ? (
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                <Users className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                Sin participantes registrados todavía.
              </div>
            ) : (
              <ul className="space-y-3">
                {empresa.participantes.map((persona) => (
                  <li
                    key={persona.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {persona.nombre}
                      </p>
                      <p className="truncate text-xs text-gray-500">{persona.correo}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        persona.diagnosticoCompletado
                          ? "bg-avanza-green-light text-avanza-green-dark"
                          : "bg-avanza-orange-light text-avanza-orange"
                      }`}
                    >
                      {persona.diagnosticoCompletado
                        ? "Diagnóstico completado"
                        : "Diagnóstico pendiente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

type FormEmpresa = { nombre: string; contacto: string; correo: string };

const initialForm: FormEmpresa = { nombre: "", contacto: "", correo: "" };

export default function AdminEmpresasPage() {
  const [busqueda, setBusqueda] = useState("");
  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [form, setForm] = useState<FormEmpresa>(initialForm);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargarEmpresas() {
    try {
      const res = await fetch("/api/admin/empresas");
      if (!res.ok) throw new Error("Error al cargar empresas");
      const { empresas: lista } = (await res.json()) as { empresas: EmpresaAdmin[] };
      setEmpresas(lista);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarEmpresas();
  }, []);

  const empresasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter((e) => e.nombre.toLowerCase().includes(q));
  }, [busqueda, empresas]);

  function handleChange<K extends keyof FormEmpresa>(field: K, value: FormEmpresa[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancelarForm() {
    setForm(initialForm);
    setErrorForm(null);
    setMostrandoForm(false);
  }

  async function handleGuardar(e: FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const cuerpo = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(cuerpo.error ?? "No se pudo crear la empresa");
      }
      successToast("Empresa creada");
      setForm(initialForm);
      setMostrandoForm(false);
      setCargando(true);
      await cargarEmpresas();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "No se pudo crear la empresa");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Empresas" />

      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        {empresaSeleccionadaId ? (
          <EmpresaDetalle
            empresaId={empresaSeleccionadaId}
            onVolver={() => setEmpresaSeleccionadaId(null)}
          />
        ) : (
          <>
            {mostrandoForm ? (
              <form
                noValidate
                onSubmit={handleGuardar}
                className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-4"
              >
                <TextField
                  id="nombre"
                  label="Nombre de la empresa"
                  icon={Building2}
                  placeholder="Ej. Constructora del Este"
                  required
                  value={form.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                />
                <TextField
                  id="contacto"
                  label="Persona de contacto"
                  icon={Users}
                  placeholder="Ej. Ana Ramírez"
                  required
                  value={form.contacto}
                  onChange={(e) => handleChange("contacto", e.target.value)}
                />
                <TextField
                  id="correo"
                  label="Correo de contacto"
                  icon={Mail}
                  type="email"
                  placeholder="Ej. contacto@empresa.com"
                  required
                  value={form.correo}
                  onChange={(e) => handleChange("correo", e.target.value)}
                />

                {errorForm && (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {errorForm}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancelarForm}
                    disabled={guardando}
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 font-semibold text-gray-700 transition-all duration-150 hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setMostrandoForm(true)}
                className="mb-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-avanza-green/50 px-5 font-semibold text-avanza-green transition-colors duration-150 hover:bg-avanza-green-light active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva empresa
              </button>
            )}

            <label className="relative mb-5 block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar empresa por nombre"
                aria-label="Buscar empresa por nombre"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-avanza-green focus:outline-none focus:ring-2 focus:ring-avanza-green/20"
              />
            </label>

            {cargando ? (
              <p className="mt-10 text-center text-sm text-gray-500">Cargando empresas...</p>
            ) : error ? (
              <p className="mt-10 text-center text-sm text-gray-500">
                No se pudo cargar la lista de empresas.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {empresasFiltradas.length} empresa{empresasFiltradas.length === 1 ? "" : "s"}
                </p>

                {empresasFiltradas.length === 0 ? (
                  <p className="mt-10 text-center text-sm text-gray-500">
                    No se encontraron empresas con ese nombre.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {empresasFiltradas.map((empresa) => (
                      <li key={empresa.id}>
                        <button
                          type="button"
                          onClick={() => setEmpresaSeleccionadaId(empresa.id)}
                          className="flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors duration-150 hover:bg-gray-50 active:scale-[0.99]"
                        >
                          <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-blue-light text-avanza-blue"
                            aria-hidden="true"
                          >
                            <Building2 className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {empresa.nombre}
                              </p>
                              <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                {empresa.participantes}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-gray-500">
                              <p className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                {empresa.contacto}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                                {empresa.correo}
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
