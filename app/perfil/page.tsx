"use client";

// Perfil del cliente — Entrega 2: los datos vienen de `/api/cliente/perfil` y la
// edición hace PATCH sobre `Cliente`/`Usuario`. Cerrar sesión invalida la sesión
// real en Redis vía `/api/auth/logout`.
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  Pencil,
  LogOut,
  Briefcase,
  X,
  FileText,
  ClipboardList,
  Award,
  CreditCard,
  Building2,
} from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import TextField from "@/components/TextField";
import {
  actualizarPerfil,
  obtenerEstado,
  obtenerPerfil,
  tipoAsesoriaLabel,
  type EstadoCliente,
  type PerfilCliente,
} from "@/lib/cliente-api";
import { erpAlert, successToast } from "@/lib/alerts";

type FormState = {
  telefono: string;
  correo: string;
};

const EVALUACION_CHIP: Record<string, string> = {
  PENDIENTE: "bg-avanza-orange-light text-avanza-orange",
  APROBADA: "bg-avanza-green-light text-avanza-green-dark",
  RECHAZADA: "bg-red-100 text-red-600",
};

const EVALUACION_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

function formatMonto(valor: number): string {
  return `RD$ ${new Intl.NumberFormat("es-DO", { maximumFractionDigits: 0 }).format(valor)}`;
}

export default function PerfilPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<EstadoCliente | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        setPerfil(await obtenerPerfil());
        setError(false);
      } catch {
        setError(true);
      } finally {
        setCargando(false);
      }
    }
    void cargar();

    // "Mi expediente" es contenido adicional: si falla, el resto del perfil
    // sigue funcionando (mismo patrón defensivo que /home).
    async function cargarEstado() {
      try {
        setEstado(await obtenerEstado());
      } catch {
        // Sin datos de expediente, la sección simplemente no se muestra.
      }
    }
    void cargarEstado();
  }, []);

  function handleEmpezarEdicion() {
    if (!perfil) return;
    setForm({ telefono: perfil.telefono, correo: perfil.correo });
    setEditando(true);
  }

  function handleCancelarEdicion() {
    setForm(null);
    setEditando(false);
  }

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    setGuardando(true);
    try {
      setPerfil(await actualizarPerfil(form));
      setEditando(false);
      setForm(null);
      successToast("Perfil actualizado");
    } catch (err) {
      erpAlert.fire({
        icon: "error",
        title: err instanceof Error ? err.message : "No se pudo actualizar el perfil",
      });
    } finally {
      setGuardando(false);
    }
  }

  async function handleCerrarSesion() {
    const result = await erpAlert.fire({
      icon: "question",
      title: "¿Cerrar sesión?",
      text: "Vas a salir de tu cuenta en este dispositivo.",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Aunque falle la revocación en el servidor, se saca al usuario de la app.
    }
    router.push("/login");
  }

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader title="Perfil" subtitle="Tu información y preferencias" />

        {cargando ? (
          <p className="mt-10 text-center text-sm text-gray-500">Cargando tu perfil...</p>
        ) : error || !perfil ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            No se pudo cargar tu perfil. Intenta de nuevo más tarde.
          </p>
        ) : editando && form ? (
          <form noValidate onSubmit={handleGuardar} className="space-y-5">
            <TextField
              id="telefono"
              label="Teléfono"
              icon={Phone}
              type="tel"
              autoComplete="tel"
              required
              value={form.telefono}
              onChange={(e) => handleChange("telefono", e.target.value)}
            />
            <TextField
              id="correo"
              label="Correo electrónico"
              icon={Mail}
              type="email"
              autoComplete="email"
              required
              value={form.correo}
              onChange={(e) => handleChange("correo", e.target.value)}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelarEdicion}
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
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <section
              aria-label="Datos personales"
              className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <User className="h-4 w-4 text-avanza-green" aria-hidden="true" />
                  Datos personales
                </p>
                <button
                  type="button"
                  onClick={handleEmpezarEdicion}
                  aria-label="Editar datos de contacto"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-avanza-green transition-colors duration-150 hover:bg-avanza-green-light active:scale-95"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Nombre
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{perfil.nombreCompleto}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Correo electrónico
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{perfil.correo}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Teléfono
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{perfil.telefono}</dd>
                </div>
              </dl>
            </section>

            <section
              aria-label="Línea de asesoría"
              className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"
            >
              <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Briefcase className="h-4 w-4 text-avanza-green" aria-hidden="true" />
                Línea de asesoría
              </p>
              <span className="inline-flex items-center rounded-full bg-avanza-green-light px-3 py-1.5 text-sm font-medium text-avanza-green-dark">
                {tipoAsesoriaLabel(perfil.tipoAsesoria)}
              </span>
            </section>

            {estado && (
              <section
                aria-label="Mi expediente"
                className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"
              >
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <FileText className="h-4 w-4 text-avanza-green" aria-hidden="true" />
                  Mi expediente
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/evaluacion"
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity duration-150 hover:opacity-80 ${
                      estado.evaluacion
                        ? (EVALUACION_CHIP[estado.evaluacion.estado] ?? "bg-gray-100 text-gray-600")
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                    {estado.evaluacion
                      ? `Evaluación: ${EVALUACION_LABEL[estado.evaluacion.estado] ?? estado.evaluacion.estado}`
                      : "Sin evaluación"}
                  </Link>

                  <Link
                    href="/programa"
                    className="inline-flex items-center gap-1.5 rounded-full bg-avanza-blue-light px-3 py-1.5 text-sm font-medium text-avanza-blue transition-opacity duration-150 hover:opacity-80"
                  >
                    <Award className="h-3.5 w-3.5" aria-hidden="true" />
                    {estado.programaAsignado
                      ? estado.programaAsignado.nombre
                      : "Sin programa asignado"}
                  </Link>

                  <Link
                    href="/programa"
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity duration-150 hover:opacity-80 ${
                      estado.pago
                        ? estado.pago.estado === "PAGADO"
                          ? "bg-avanza-green-light text-avanza-green-dark"
                          : "bg-avanza-orange-light text-avanza-orange"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                    {estado.pago
                      ? `${estado.pago.estado === "PAGADO" ? "Pagado" : "Pendiente"} · ${formatMonto(estado.pago.monto)}`
                      : "Sin pagos registrados"}
                  </Link>

                  {estado.perfil.tipoAsesoria === "CORPORATIVO" && (
                    <Link
                      href="/diagnostico"
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity duration-150 hover:opacity-80 ${
                        estado.diagnosticoCompletado
                          ? "bg-avanza-green-light text-avanza-green-dark"
                          : "bg-avanza-orange-light text-avanza-orange"
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {estado.diagnosticoCompletado
                        ? "Diagnóstico: completado"
                        : "Diagnóstico: pendiente"}
                    </Link>
                  )}
                </div>
              </section>
            )}

            <button
              type="button"
              onClick={handleCerrarSesion}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-5 font-semibold text-red-600 transition-all duration-150 hover:bg-red-50 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </>
        )}
      </main>
    </PageTransition>
  );
}
