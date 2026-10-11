"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, CreditCard, FileCheck2, Hourglass, PartyPopper } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import PageTransition from "@/components/PageTransition";
import {
  obtenerEstado,
  aceptarConsentimiento,
  registrarPago,
  ApiFetchError,
  type EstadoCliente,
} from "@/lib/cliente-api";
import { erpAlert, successToast } from "@/lib/alerts";

const METODOS = ["Tarjeta", "Transferencia", "Efectivo"] as const;

export default function ProgramaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

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
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <CreditCard className="h-8 w-8 text-avanza-orange" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">
              Registrá tu pago — {estado.pago ? `RD$ ${estado.pago.monto}` : ""}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {METODOS.map((metodo) => (
                <button
                  key={metodo}
                  type="button"
                  disabled={procesando}
                  onClick={() => handlePago(metodo)}
                  className="min-h-[44px] rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-avanza-green disabled:opacity-60"
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
            <button
              type="button"
              onClick={() => router.push("/agenda")}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-5 font-semibold text-avanza-green-dark"
            >
              Ir a mi agenda
            </button>
          </section>
        )}
      </main>
    </PageTransition>
  );
}
