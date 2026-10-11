"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, Plus, Users, Loader2, AlertCircle } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { ErrorApi, pedirJson } from "@/lib/api-navegador";
import { erpAlert, successToast } from "@/lib/alerts";

type EmpresaLista = { id: string; nombre: string; _count: { clientes: number } };
type EmpresaDetalle = {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  clientes: { id: string; nombre: string; email: string; diagnosticoCompletado: boolean }[];
};

function Cargando({ etiqueta }: { etiqueta: string }) {
  return (
    <p className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {etiqueta}
    </p>
  );
}

export default function AdminEmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<EmpresaLista[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<EmpresaDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  const manejarError = useCallback(
    (err: unknown, porDefecto: string) => {
      if (err instanceof ErrorApi) {
        if (err.esNoAutenticado) {
          router.replace("/login?next=/admin/empresas");
          return "Tu sesión expiró. Redirigiendo…";
        }
        return err.message;
      }
      return porDefecto;
    },
    [router],
  );

  async function cargarLista() {
    setError(null);
    try {
      const { empresas } = await pedirJson<{ empresas: EmpresaLista[] }>("/api/admin/empresas");
      setEmpresas(empresas);
    } catch (err) {
      setError(manejarError(err, "No se pudo cargar la lista de empresas."));
    }
  }

  useEffect(() => {
    cargarLista();
  }, []);

  async function abrirDetalle(id: string) {
    setCargandoDetalle(true);
    setError(null);
    try {
      const { empresa } = await pedirJson<{ empresa: EmpresaDetalle }>(`/api/admin/empresas/${id}`);
      setDetalle(empresa);
    } catch (err) {
      setError(manejarError(err, "No se pudo cargar la ficha de la empresa."));
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function crearEmpresa(e: FormEvent) {
    e.preventDefault();
    if (!nombreNuevo.trim()) return;

    setCreando(true);
    try {
      await pedirJson("/api/admin/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreNuevo.trim() }),
      });
      successToast("Empresa creada");
      setNombreNuevo("");
      setMostrarAlta(false);
      await cargarLista();
    } catch (err) {
      await erpAlert.fire({
        icon: "error",
        title: "No se pudo crear la empresa",
        text: err instanceof ErrorApi ? err.message : "Ocurrió un error inesperado",
      });
    } finally {
      setCreando(false);
    }
  }

  return (
    <PageTransition footer={<AdminBottomNav />}>
      <AdminHeader title="Empresas" />
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
        {detalle || cargandoDetalle ? (
          <>
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="mb-4 flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-avanza-green hover:bg-avanza-green-light active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Volver a empresas
            </button>

            {cargandoDetalle || !detalle ? (
              <Cargando etiqueta="Cargando ficha de la empresa…" />
            ) : (
              <>
                <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-blue-light">
                      <Building2 className="h-5 w-5 text-avanza-blue" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{detalle.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {detalle.clientes.length} participante{detalle.clientes.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </section>

                <section aria-label="Participantes">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Users className="h-4 w-4 text-avanza-green" aria-hidden="true" />
                    Participantes
                  </h2>
                  {detalle.clientes.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                      Todavía no hay clientes vinculados a esta empresa.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {detalle.clientes.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{c.nombre}</p>
                            <p className="truncate text-xs text-gray-500">{c.email}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                              c.diagnosticoCompletado
                                ? "bg-avanza-green-light text-avanza-green-dark"
                                : "bg-avanza-orange-light text-avanza-orange"
                            }`}
                          >
                            {c.diagnosticoCompletado ? "Diagnóstico: Completado" : "Diagnóstico: Pendiente"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {empresas?.length ?? 0} empresa{empresas?.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                onClick={() => setMostrarAlta((v) => !v)}
                className="flex min-h-[36px] items-center gap-1.5 rounded-xl bg-avanza-green px-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva empresa
              </button>
            </div>

            {mostrarAlta && (
              <form onSubmit={crearEmpresa} className="mb-5 flex gap-2 rounded-2xl border border-gray-200 bg-white p-3">
                <input
                  type="text"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:border-avanza-green focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={creando || !nombreNuevo.trim()}
                  className="rounded-lg bg-avanza-green px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {creando ? "..." : "Crear"}
                </button>
              </form>
            )}

            {error ? (
              <div role="alert" className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            ) : empresas === null ? (
              <Cargando etiqueta="Cargando empresas…" />
            ) : empresas.length === 0 ? (
              <p className="mt-10 text-center text-sm text-gray-500">Todavía no hay empresas registradas.</p>
            ) : (
              <ul className="space-y-3">
                {empresas.map((empresa) => (
                  <li key={empresa.id}>
                    <button
                      type="button"
                      onClick={() => abrirDetalle(empresa.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50 active:scale-[0.99]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-avanza-blue-light">
                        <Building2 className="h-5 w-5 text-avanza-blue" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{empresa.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {empresa._count.clientes} participante{empresa._count.clientes === 1 ? "" : "s"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </PageTransition>
  );
}
