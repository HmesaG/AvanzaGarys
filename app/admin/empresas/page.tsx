"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, Plus, Users, Loader2, AlertCircle, Printer, FileBarChart2, TrendingUp } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminBottomNav from "@/components/AdminBottomNav";
import PageTransition from "@/components/PageTransition";
import { ErrorApi, pedirJson } from "@/lib/api-navegador";
import { erpAlert, successToast } from "@/lib/alerts";
import { exportarInformeEmpresaPDF } from "@/lib/reportes-pdf";

type EmpresaLista = { id: string; nombre: string; _count: { clientes: number } };
type EmpresaDetalle = {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  metricas?: {
    totalColaboradores: number;
    diagnosticosCompletados: number;
    tasaCompletado: number;
    nivelesComunicacion: Record<string, number>;
    desafios: { colaborador: string; desafio: string; clima: string }[];
  };
  clientes: {
    id: string;
    nombre: string;
    email: string;
    diagnosticoCompletado: boolean;
    diagnostico?: {
      climaLaboral: string;
      principalDesafio: string;
      nivelComunicacion: string;
      objetivoEmpresa: string;
    } | null;
  }[];
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

                {detalle.metricas && (
                  <section aria-label="Informe Organizacional" className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileBarChart2 className="h-5 w-5 text-blue-700" />
                        <h2 className="text-sm font-bold text-gray-900">Informe Organizacional Consolidado</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const diag = detalle.clientes.find((c) => c.diagnostico)?.diagnostico;
                          exportarInformeEmpresaPDF({
                            empresaNombre: detalle.nombre,
                            ruc: detalle.ruc,
                            telefono: detalle.telefono,
                            totalClientes: detalle.clientes.length,
                            clientesActivos: detalle.clientes.filter((c) => c.diagnosticoCompletado).length,
                            promedioProgreso: detalle.metricas?.tasaCompletado ?? 0,
                            fechaGeneracion: new Date().toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }),
                            diagnostico: diag
                              ? {
                                  climaLaboral: diag.climaLaboral,
                                  principalDesafio: diag.principalDesafio,
                                  nivelComunicacion: diag.nivelComunicacion,
                                  objetivoEmpresa: diag.objetivoEmpresa,
                                }
                              : null,
                            colaboradores: detalle.clientes.map((c) => ({
                              nombre: c.nombre,
                              email: c.email,
                              programa: "Coaching Corporativo",
                              progreso: c.diagnosticoCompletado ? 100 : 25,
                            })),
                          });
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                      >
                        <Printer className="h-3.5 w-3.5 text-gray-500" />
                        Descargar Informe PDF
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl bg-white p-3 border border-blue-100">
                        <p className="text-[11px] text-gray-500 uppercase tracking-wide">Completitud Diagnóstico</p>
                        <p className="mt-1 text-xl font-bold text-blue-700">{detalle.metricas.tasaCompletado}%</p>
                        <p className="text-[10px] text-gray-400">
                          {detalle.metricas.diagnosticosCompletados} de {detalle.metricas.totalColaboradores} participantes
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3 border border-blue-100">
                        <p className="text-[11px] text-gray-500 uppercase tracking-wide">Comunicación Interna</p>
                        <p className="mt-1 text-xs font-semibold text-gray-800">
                          {detalle.metricas.nivelesComunicacion.BUENA ?? 0} Buena · {detalle.metricas.nivelesComunicacion.REGULAR ?? 0} Reg.
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {detalle.metricas.nivelesComunicacion.DEFICIENTE ?? 0} Deficiente
                        </p>
                      </div>
                    </div>

                    {detalle.metricas.desafios.length > 0 && (
                      <div className="rounded-xl bg-white p-3 border border-blue-100">
                        <p className="text-xs font-semibold text-gray-900 mb-2">Desafíos Detectados por Colaboradores</p>
                        <ul className="space-y-1.5 text-xs text-gray-600 max-h-40 overflow-y-auto">
                          {detalle.metricas.desafios.map((d, i) => (
                            <li key={i} className="border-b border-gray-100 pb-1 last:border-none">
                              <span className="font-medium text-gray-800">{d.colaborador}: </span>
                              <span>"{d.desafio}"</span>
                              <span className="text-[10px] text-gray-400 block">Clima: {d.clima}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

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
