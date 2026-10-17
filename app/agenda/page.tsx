"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, Laptop, MapPin, CheckCircle2, X, Lock, Video, ExternalLink } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import BotonCalendario from "@/components/BotonCalendario";
import {
  obtenerEstado,
  crearCita,
  cancelarCita,
  ApiFetchError,
  type EstadoCliente,
} from "@/lib/cliente-api";
import { HORARIOS_DISPONIBLES } from "@/lib/mock-data";
import { erpAlert, successToast } from "@/lib/alerts";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildDias(count: number) {
  const hoy = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    return {
      key: d.toISOString().slice(0, 10),
      diaSemana: DIAS[d.getDay()],
      diaMes: d.getDate(),
      label: `${d.getDate() === hoy.getDate() ? "Hoy" : capitalize(DIAS_LARGO[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`,
    };
  });
}

export default function AgendaPage() {
  const dias = useMemo(() => buildDias(14), []);
  const [estado, setEstado] = useState<EstadoCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState(dias[0].key);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [modalidad, setModalidad] = useState<"Virtual" | "Presencial">("Virtual");
  const [confirmando, setConfirmando] = useState(false);

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

  async function handleConfirmar() {
    if (!horaSeleccionada) return;
    const dia = dias.find((d) => d.key === diaSeleccionado)!;

    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Confirmar sesión?",
      html: `<p class="text-sm text-gray-600">${dia.label} · ${horaSeleccionada} · ${modalidad}</p>`,
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    setConfirmando(true);
    try {
      const fechaIso = `${dia.key}T${a24h(horaSeleccionada)}:00`;
      await crearCita(fechaIso, modalidad);
      setHoraSeleccionada(null);
      successToast("Sesión agendada");
      await recargar();
    } catch (error) {
      const mensaje = error instanceof ApiFetchError ? error.message : "No se pudo agendar la sesión";
      await erpAlert.fire({ icon: "error", title: "Algo salió mal", text: mensaje });
    } finally {
      setConfirmando(false);
    }
  }

  async function handleCancelar() {
    if (!estado?.proximaCita) return;
    const result = await erpAlert.fire({
      icon: "warning",
      title: "¿Cancelar la sesión agendada?",
      text: "Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "Volver",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      await cancelarCita(estado.proximaCita.id);
      successToast("Sesión cancelada");
      await recargar();
    } catch (error) {
      const mensaje = error instanceof ApiFetchError ? error.message : "No se pudo cancelar la sesión";
      await erpAlert.fire({ icon: "error", title: "Algo salió mal", text: mensaje });
    }
  }

  if (cargando || !estado) {
    return (
      <PageTransition footer={<BottomNav />}>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
          <BackHeader title="Agenda" subtitle="Reserva o revisa tu próxima sesión" />
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        </main>
      </PageTransition>
    );
  }

  if (!estado.puedeAgendar) {
    return (
      <PageTransition footer={<BottomNav />}>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
          <BackHeader title="Agenda" subtitle="Reserva o revisa tu próxima sesión" />
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Aún no puedes agendar</p>
            <p className="mt-1 text-sm text-gray-500">
              Completá el consentimiento y el pago de tu programa primero.
            </p>
            <Link
              href="/programa"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white"
            >
              Ver mi programa
            </Link>
          </section>
        </main>
      </PageTransition>
    );
  }

  const sesionActual = estado.proximaCita;

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader title="Agenda" subtitle="Reserva o revisa tu próxima sesión" />

        {sesionActual && (
          <section
            aria-label="Sesión agendada"
            className="mb-6 rounded-2xl bg-avanza-green p-5 text-white shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-avanza-green-light">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Sesión confirmada
                </p>
                <p className="mt-2 text-lg font-bold">
                  {new Intl.DateTimeFormat("es-DO", { dateStyle: "long" }).format(new Date(sesionActual.fecha))}
                </p>
                <p className="text-sm text-avanza-green-light">
                  {new Intl.DateTimeFormat("es-DO", { hour: "2-digit", minute: "2-digit" }).format(
                    new Date(sesionActual.fecha),
                  )}{" "}
                  · {sesionActual.modalidad}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelar}
                aria-label="Cancelar sesión agendada"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <BotonCalendario cita={sesionActual} />
            </div>

            {sesionActual.modalidad === "Virtual" && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <a
                  href={`https://meet.jit.si/Avanza-Coaching-${sesionActual.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white text-avanza-green font-semibold text-sm shadow hover:bg-emerald-50 active:scale-[0.98] transition-all"
                >
                  <Video className="h-4 w-4" aria-hidden="true" />
                  Entrar a la Sala Virtual
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </a>
              </div>
            )}
          </section>
        )}

        {!sesionActual && (
          <>
            <section aria-label="Elegir fecha" className="mb-6">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Calendar className="h-4 w-4 text-avanza-green" aria-hidden="true" />
                Elige una fecha
              </h2>
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                {dias.map((d) => {
                  const active = d.key === diaSeleccionado;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDiaSeleccionado(d.key)}
                      aria-pressed={active}
                      className={`flex min-h-[64px] w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-sm ${
                        active
                          ? "border-avanza-green bg-avanza-green text-white font-semibold"
                          : "border-gray-200 bg-white text-gray-700 hover:border-avanza-green/40"
                      }`}
                    >
                      <span className="text-[11px] uppercase">{d.diaSemana}</span>
                      <span className="text-base font-bold tabular-nums">{d.diaMes}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-label="Elegir horario" className="mb-6">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Clock className="h-4 w-4 text-avanza-green" aria-hidden="true" />
                Elige un horario
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {HORARIOS_DISPONIBLES.map((hora) => {
                  const active = hora === horaSeleccionada;
                  return (
                    <button
                      key={hora}
                      type="button"
                      onClick={() => setHoraSeleccionada(hora)}
                      aria-pressed={active}
                      className={`min-h-[44px] rounded-xl border text-sm font-medium ${
                        active
                          ? "border-avanza-green bg-avanza-green-light text-avanza-green-dark"
                          : "border-gray-200 bg-white text-gray-700 hover:border-avanza-green/40"
                      }`}
                    >
                      {hora}
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-label="Elegir modalidad" className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Modalidad</h2>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "Virtual" as const, icon: Laptop },
                    { value: "Presencial" as const, icon: MapPin },
                  ]
                ).map(({ value, icon: Icon }) => {
                  const active = modalidad === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setModalidad(value)}
                      aria-pressed={active}
                      className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border text-sm font-medium ${
                        active
                          ? "border-avanza-green bg-avanza-green-light text-avanza-green-dark"
                          : "border-gray-200 bg-white text-gray-700 hover:border-avanza-green/40"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {value}
                    </button>
                  );
                })}
              </div>
            </section>

            <button
              type="button"
              onClick={handleConfirmar}
              disabled={!horaSeleccionada || confirmando}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmando ? "Agendando..." : "Confirmar sesión"}
            </button>
          </>
        )}
      </main>
    </PageTransition>
  );
}

/** "09:00 AM" -> "09:00" en 24h, para construir un ISO local simple. */
function a24h(hora12: string): string {
  const [hm, ampm] = hora12.split(" ");
  const [h, m] = hm.split(":").map(Number);
  let hora = h % 12;
  if (ampm === "PM") hora += 12;
  return `${String(hora).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
