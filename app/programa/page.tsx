"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, CreditCard, FileCheck2, Hourglass, PartyPopper, UploadCloud, Building, X, Loader2 } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import PageTransition from "@/components/PageTransition";
import {
  obtenerEstado,
  aceptarConsentimiento,
  registrarPago,
  ApiFetchError,
  type EstadoCliente,
} from "@/lib/cliente-api";
import { erpAlert, successToast, errorToast } from "@/lib/alerts";

const METODOS = ["Tarjeta", "Transferencia", "Efectivo"] as const;

export default function ProgramaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [archivoVoucher, setArchivoVoucher] = useState<File | null>(null);
  const [subiendoVoucher, setSubiendoVoucher] = useState(false);

  async function recargar() {
    try {
      setEstado(await obtenerEstado());
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    recargar();
  }, []);

  async function handleConsentimiento() {
    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Aceptás el programa?",
      text: "Confirmá que estás de acuerdo con el programa asignado para continuar.",
      showCancelButton: true,
      confirmButtonText: "Sí, acepto",
      cancelButtonText: "Volver",
    });
    if (!result.isConfirmed) return;

    setProcesando(true);
    try {
      await aceptarConsentimiento();
      successToast("Consentimiento registrado");
      await recargar();
    } catch (error) {
      const mensaje = error instanceof ApiFetchError ? error.message : "No se pudo registrar el consentimiento";
      await erpAlert.fire({ icon: "error", title: "Algo salió mal", text: mensaje });
    } finally {
      setProcesando(false);
    }
  }

  async function handlePago(metodo: (typeof METODOS)[number]) {
    if (metodo === "Transferencia") {
      setModalTransferencia(true);
      return;
    }

    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Confirmar pago?",
      html: `<p class="text-sm text-gray-600">Método: ${metodo}</p>`,
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    setProcesando(true);
    try {
      await registrarPago(metodo);
      successToast("Pago registrado");
      await recargar();
    } catch (error) {
      const mensaje = error instanceof ApiFetchError ? error.message : "No se pudo registrar el pago";
      await erpAlert.fire({ icon: "error", title: "Algo salió mal", text: mensaje });
    } finally {
      setProcesando(false);
    }
  }

  async function handleConfirmarTransferencia() {
    setSubiendoVoucher(true);
    try {
      let comprobanteUrl: string | undefined = undefined;
      if (archivoVoucher) {
        if (archivoVoucher.size > 10 * 1024 * 1024) {
          errorToast("El comprobante no debe superar los 10MB");
          setSubiendoVoucher(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", archivoVoucher);
        const res = await fetch("/api/mensajes/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("No se pudo subir el archivo de comprobante");
        }

        const data = await res.json();
        comprobanteUrl = data.url;
      }

      await registrarPago("Transferencia", comprobanteUrl);
      setModalTransferencia(false);
      setArchivoVoucher(null);
      successToast("Pago y comprobante registrados correctamente");
      await recargar();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Error al registrar la transferencia";
      await erpAlert.fire({ icon: "error", title: "Algo salió mal", text: mensaje });
    } finally {
      setSubiendoVoucher(false);
    }
  }

  if (cargando || !estado) {
    return (
      <PageTransition>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-8 safe-top">
          <BackHeader title="Mi programa" />
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-8 safe-top">
        <BackHeader title="Mi programa" subtitle="Revisión, consentimiento y pago" />

        {!estado.evaluacion ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center">
            <ClipboardCheck className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Todavía no enviaste tu evaluación</p>
            <button
              type="button"
              onClick={() => router.push("/evaluacion")}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white"
            >
              Ir a evaluación
            </button>
          </section>
        ) : estado.evaluacion.estado === "PENDIENTE" ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
            <Hourglass className="mx-auto h-8 w-8 text-avanza-orange" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Tu evaluación está en revisión</p>
            <p className="mt-1 text-sm text-gray-500">
              Tu coach va a revisarla pronto y te va a asignar un programa.
            </p>
          </section>
        ) : !estado.programa ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
            <Hourglass className="mx-auto h-8 w-8 text-avanza-orange" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Esperando asignación de programa</p>
          </section>
        ) : !estado.programa.consentimientoAceptado ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <FileCheck2 className="h-8 w-8 text-avanza-blue" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">{estado.programa.nombre}</p>
            {estado.programa.descripcion && (
              <p className="mt-1 text-sm text-gray-600">{estado.programa.descripcion}</p>
            )}
            <button
              type="button"
              disabled={procesando}
              onClick={handleConsentimiento}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white disabled:opacity-60"
            >
              Aceptar programa
            </button>
          </section>
        ) : estado.pago?.estado !== "PAGADO" ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <CreditCard className="h-8 w-8 text-avanza-orange" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
              Registrá tu pago — {estado.pago ? `RD$ ${estado.pago.monto}` : ""}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {METODOS.map((metodo) => (
                <button
                  key={metodo}
                  type="button"
                  disabled={procesando}
                  onClick={() => handlePago(metodo)}
                  className="min-h-[44px] rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-avanza-green disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-emerald-500"
                >
                  {metodo}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-avanza-green p-5 text-center text-white">
            <PartyPopper className="mx-auto h-8 w-8" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">¡Todo listo! Ya podés agendar tu primera sesión.</p>
            {estado.pago?.comprobanteUrl && (
              <p className="mt-1 text-xs text-emerald-100">
                Comprobante de pago adjuntado y registrado.
              </p>
            )}
            <button
              type="button"
              onClick={() => router.push("/agenda")}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-5 font-semibold text-avanza-green-dark"
            >
              Ir a mi agenda
            </button>
          </section>
        )}

        {/* Modal de Transferencia Bancaria y Subida de Comprobante */}
        {modalTransferencia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xl animate-scale-up dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-avanza-green dark:bg-emerald-950/50 dark:text-emerald-400">
                    <Building className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Transferencia Bancaria</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Datos para depósito y comprobante</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalTransferencia(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Cuenta bancaria */}
              <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-xs text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 space-y-1.5">
                <p className="font-semibold text-gray-900 dark:text-white">Banco Popular Dominicano</p>
                <p>Cuenta Corriente (DOP): <strong className="font-mono text-gray-900 dark:text-white">812-493821-0</strong></p>
                <p>Titular: <strong>AvanzA Coaching SRL</strong></p>
                <p>RNC: <strong className="font-mono">1-32-84920-1</strong></p>
                <p className="pt-1 text-avanza-green font-bold dark:text-emerald-400">
                  Monto a transferir: RD$ {estado.pago?.monto}
                </p>
              </div>

              {/* Input comprobante */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 dark:text-gray-300">
                  Adjuntar Comprobante o Captura (Imagen o PDF)
                </label>
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-5 text-center cursor-pointer hover:border-avanza-green transition-colors dark:border-gray-700 dark:hover:border-emerald-500">
                  <UploadCloud className="h-7 w-7 text-gray-400 mb-1" />
                  {archivoVoucher ? (
                    <p className="text-xs font-semibold text-avanza-green truncate max-w-xs dark:text-emerald-400">
                      {archivoVoucher.name}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Selecciona o arrastra tu comprobante
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG o PDF (máx. 10MB)</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setArchivoVoucher(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Botones */}
              <div className="mt-5 flex gap-2 justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
                <button
                  type="button"
                  disabled={subiendoVoucher}
                  onClick={() => setModalTransferencia(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={subiendoVoucher}
                  onClick={handleConfirmarTransferencia}
                  className="flex items-center gap-1.5 rounded-xl bg-avanza-green px-4 py-2 text-xs font-semibold text-white shadow hover:bg-avanza-green/90 disabled:opacity-50 active:scale-95"
                >
                  {subiendoVoucher && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {subiendoVoucher ? "Enviando..." : "Confirmar y Registrar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
