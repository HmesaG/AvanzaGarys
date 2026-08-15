"use client";

// Agenda del cliente — Entrega 2: las sesiones son filas de `citas` en la base,
// leídas y escritas por `/api/cliente/citas`. El permiso para agendar
// (consentimiento aceptado + pago registrado) lo decide el servidor.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, Laptop, MapPin, CheckCircle2, Lock, X } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import {
  agendarCita,
  cancelarCita,
  fechaLabel,
  obtenerCitas,
  type CitaCliente,
  type ModalidadLabel,
} from "@/lib/cliente-api";
import { HORARIOS_DISPONIBLES } from "@/lib/mock-data";
import { erpAlert, successToast } from "@/lib/alerts";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** ISO corto en hora local: `toISOString()` corre un día en zonas negativas. */
function isoLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function buildDias(count: number) {
  const hoy = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const key = isoLocal(d);
    return {
      key,
      diaSemana: DIAS[d.getDay()],
      diaMes: d.getDate(),
      label: fechaLabel(key),
    };
  });
}

export default function AgendaPage() {
  const dias = useMemo(() => buildDias(14), []);
  const [sesionActual, setSesionActual] = useState<CitaCliente | null>(null);
  const [puedeAgendar, setPuedeAgendar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(dias[0].key);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [modalidad, setModalidad] = useState<ModalidadLabel>("Virtual");
  const [confirmando, setConfirmando] = useState(false);

  const cargarAgenda = useCallback(async () => {
    try {
      const datos = await obtenerCitas();
      setSesionActual(datos.citas[0] ?? null);
      setPuedeAgendar(datos.puedeAgendar);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarAgenda();
  }, [cargarAgenda]);

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
      const cita = await agendarCita({
        fecha: dia.key,
        hora: horaSeleccionada,
        modalidad,
      });
      setSesionActual(cita);
      setHoraSeleccionada(null);
      successToast("Sesión agendada");
    } catch (err) {
      erpAlert.fire({
        icon: "error",
        title: err instanceof Error ? err.message : "No se pudo agendar la sesión",
      });
    } finally {
      setConfirmando(false);
    }
  }

  async function handleCancelar() {
    if (!sesionActual) return;
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
      await cancelarCita(sesionActual.id);
      setSesionActual(null);
      successToast("Sesión cancelada");
    } catch (err) {
      erpAlert.fire({
        icon: "error",
        title: err instanceof Error ? err.message : "No se pudo cancelar la sesión",
      });
    }
  }

  if (cargando || error) {
    return (
      <PageTransition footer={<BottomNav />}>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
          <BackHeader title="Agenda" subtitle="Reserva o revisa tu próxima sesión" />
          <p className="mt-10 text-center text-sm text-gray-500">
            {cargando
              ? "Cargando tu agenda..."
              : "No se pudo cargar tu agenda. Intenta de nuevo más tarde."}
          </p>
        </main>
      </PageTransition>
    );
  }

  if (!puedeAgendar) {
    return (
      <PageTransition footer={<BottomNav />}>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
          <BackHeader title="Agenda" subtitle="Reserva o revisa tu próxima sesión" />

          <section
            aria-label="Agenda bloqueada"
            className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-avanza-orange-light">
              <Lock className="h-6 w-6 text-avanza-orange" aria-hidden="true" />
            </span>
            <p className="mt-3 text-base font-bold text-gray-900">
              Aún no puedes agendar
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Primero necesitas la aprobación de tu evaluación, aceptar el
              consentimiento y registrar tu pago.
            </p>
            <Link
              href="/programa"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98]"
            >
              Ver mi programa
            </Link>
          </section>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader title="Agenda" subtitle="Reserva o revisa tu próxima sesión" />

        {sesionActual && (
          <section
            aria-label="Sesión agendada"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl bg-avanza-green p-5 text-white"
          >
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-avanza-green-light">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {sesionActual.estado === "confirmada"
                  ? "Sesión confirmada"
                  : "Sesión por confirmar"}
              </p>
              <p className="mt-2 text-lg font-bold">{fechaLabel(sesionActual.fecha)}</p>
              <p className="text-sm text-avanza-green-light">
                {sesionActual.hora} · {sesionActual.modalidad}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancelar}
              aria-label="Cancelar sesión agendada"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors duration-150 hover:bg-white/25 active:scale-95"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>
        )}

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
                  className={`flex min-h-[64px] w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-sm transition-all duration-150 active:scale-95 ${
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
                  className={`min-h-[44px] rounded-xl border text-sm font-medium transition-all duration-150 active:scale-95 ${
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
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all duration-150 active:scale-95 ${
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
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmando ? "Agendando..." : "Confirmar sesión"}
        </button>
      </main>
    </PageTransition>
  );
}
