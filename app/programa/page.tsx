"use client";

// Puente entre evaluación y agenda (pasos 5-8 del flujo real): revisión del
// coach, asignación de programa, consentimiento/contrato y pago. Una sola
// pantalla con secciones que se van habilitando a medida que el cliente
// avanza — evita fragmentar en rutas nuevas por cada paso.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  XCircle,
  Award,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import SelectField from "@/components/SelectField";
import {
  getClienteState,
  saveConsentimiento,
  savePago,
  puedeAgendar,
  type ClienteState,
  type MetodoPago,
} from "@/lib/client-state";
import { formatIngresos } from "@/lib/admin-mock-data";
import { erpAlert, successToast } from "@/lib/alerts";

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Transferencia", label: "Transferencia" },
];

export default function ProgramaPage() {
  const router = useRouter();
  const [state, setState] = useState<ClienteState | null>(null);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPago>("Tarjeta");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    setState(getClienteState());
  }, []);

  if (!state) return null;

  async function handleAceptarConsentimiento() {
    if (!aceptoTerminos) return;
    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Aceptar consentimiento y contrato?",
      text: "Confirmas que leíste y aceptas los términos del programa asignado.",
      showCancelButton: true,
      confirmButtonText: "Sí, aceptar",
      cancelButtonText: "Volver",
    });
    if (!result.isConfirmed) return;

    setProcesando(true);
    window.setTimeout(() => {
      saveConsentimiento();
      setState(getClienteState());
      setProcesando(false);
      successToast("Consentimiento registrado");
    }, 350);
  }

  async function handleRegistrarPago() {
    if (!state || !state.pago) return;
    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Registrar pago?",
      html: `<p class="text-sm text-gray-600">${formatIngresos(state.pago.monto)} · ${metodo}</p>`,
      showCancelButton: true,
      confirmButtonText: "Confirmar pago",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    setProcesando(true);
    window.setTimeout(() => {
      savePago(metodo);
      setState(getClienteState());
      setProcesando(false);
      successToast("Pago registrado");
    }, 350);
  }

  const { evaluacion, estadoEvaluacion, programaAsignado, consentimiento, pago } = state;

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader
          title="Mi programa"
          subtitle="Aprobación, programa, contrato y pago"
        />

        {!evaluacion ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-gray-900">
              Aún no completaste tu evaluación inicial
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Complétala para que tu coach pueda revisarla y asignarte un programa.
            </p>
            <Link
              href="/evaluacion"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98]"
            >
              Ir a evaluación
            </Link>
          </section>
        ) : estadoEvaluacion === "pendiente" || !estadoEvaluacion ? (
          <section
            aria-label="Evaluación en revisión"
            className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-avanza-orange-light">
              <Clock className="h-6 w-6 text-avanza-orange" aria-hidden="true" />
            </span>
            <p className="mt-3 text-base font-bold text-gray-900">
              Tu evaluación está en revisión
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Tu coach está revisando tus respuestas para asignarte el programa
              más adecuado. Te avisaremos apenas esté lista.
            </p>
          </section>
        ) : estadoEvaluacion === "rechazada" ? (
          <section
            aria-label="Evaluación rechazada"
            className="flex flex-col items-center rounded-2xl border border-red-200 bg-white p-6 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </span>
            <p className="mt-3 text-base font-bold text-gray-900">
              Tu evaluación necesita ajustes
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Tu coach no pudo aprobarla tal como está. Vuelve a completarla con
              más detalle e inténtalo de nuevo.
            </p>
            <Link
              href="/evaluacion"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98]"
            >
              Volver a evaluación
            </Link>
          </section>
        ) : (
          <div className="space-y-6">
            {programaAsignado && (
              <section
                aria-label="Programa asignado"
                className="rounded-2xl border border-avanza-green-light bg-avanza-green-light p-5"
              >
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-avanza-green-dark">
                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                  Programa asignado
                </p>
                <p className="mt-2 text-lg font-bold text-gray-900">
                  {programaAsignado.nombre}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {programaAsignado.descripcion}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-avanza-green-dark">
                  <span className="rounded-full bg-white px-2.5 py-1">
                    {programaAsignado.sesionesIncluidas} sesiones incluidas
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1">
                    {formatIngresos(programaAsignado.precio)}
                  </span>
                </div>
              </section>
            )}

            <section
              aria-label="Consentimiento y contrato"
              className={`rounded-2xl border p-5 ${
                consentimiento?.aceptado
                  ? "border-avanza-green-light bg-white"
                  : "border-gray-200 bg-white"
              }`}
            >
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <ShieldCheck className="h-4 w-4 text-avanza-green" aria-hidden="true" />
                Consentimiento y contrato
              </p>

              {consentimiento?.aceptado ? (
                <p className="flex items-center gap-1.5 text-sm text-avanza-green-dark">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Aceptado el{" "}
                  {new Date(consentimiento.fecha).toLocaleDateString("es-DO")}
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-gray-600">
                    Al aceptar, confirmas que participarás en el programa
                    asignado bajo los términos de servicio de Avanza:
                    confidencialidad, puntualidad en las sesiones y
                    compromiso con el plan de trabajo acordado con tu coach.
                  </p>
                  <label className="mb-4 flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 p-3">
                    <input
                      type="checkbox"
                      checked={aceptoTerminos}
                      onChange={(e) => setAceptoTerminos(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-avanza-green focus:ring-2 focus:ring-avanza-green/40"
                    />
                    <span className="text-sm text-gray-700">
                      He leído y acepto los términos y el contrato del
                      programa.
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAceptarConsentimiento}
                    disabled={!aceptoTerminos || procesando}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {procesando ? "Procesando..." : "Aceptar y continuar"}
                  </button>
                </>
              )}
            </section>

            <section
              aria-label="Pago"
              className={`rounded-2xl border p-5 ${
                !consentimiento?.aceptado
                  ? "border-gray-200 bg-gray-50 opacity-60"
                  : "border-gray-200 bg-white"
              }`}
            >
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <CreditCard className="h-4 w-4 text-avanza-green" aria-hidden="true" />
                Pago
              </p>

              {!consentimiento?.aceptado ? (
                <p className="text-sm text-gray-500">
                  Disponible después de aceptar el consentimiento.
                </p>
              ) : pago?.estado === "pagado" ? (
                <p className="flex items-center gap-1.5 text-sm text-avanza-green-dark">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Pagado ({pago.metodo}) el{" "}
                  {pago.fecha && new Date(pago.fecha).toLocaleDateString("es-DO")}
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-gray-600">
                    Monto a pagar:{" "}
                    <span className="font-semibold text-gray-900">
                      {pago && formatIngresos(pago.monto)}
                    </span>
                  </p>
                  <div className="mb-4">
                    <SelectField
                      id="metodoPago"
                      label="Método de pago"
                      placeholder="Selecciona un método"
                      options={METODOS}
                      value={metodo}
                      onChange={(v) => setMetodo(v as MetodoPago)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRegistrarPago}
                    disabled={procesando}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {procesando ? "Procesando..." : "Registrar pago"}
                  </button>
                </>
              )}
            </section>

            {puedeAgendar(state) && (
              <button
                type="button"
                onClick={() => router.push("/agenda")}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-avanza-blue px-5 font-semibold text-white transition-all duration-150 hover:bg-blue-800 active:scale-[0.98]"
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Ir a mi agenda
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </main>
    </PageTransition>
  );
}
