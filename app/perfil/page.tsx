"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Phone, Mail, Pencil, LogOut, Briefcase, X, FileText, Building2 } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import TextField from "@/components/TextField";
import {
  obtenerPerfil,
  actualizarPerfil,
  obtenerEstado,
  ApiFetchError,
  type EstadoCliente,
} from "@/lib/cliente-api";
import { tipoAsesoriaLabel, type TipoAsesoria } from "@/lib/mock-data";
import { erpAlert, successToast } from "@/lib/alerts";

type Perfil = {
  nombre: string;
  email: string;
  cliente: { telefono: string | null; linea: string; empresa: { id: string; nombre: string } | null };
};

type FormPerfil = { nombre: string; telefono: string; correo: string };

function chipClase(color: "verde" | "ambar" | "rojo" | "gris") {
  switch (color) {
    case "verde":
      return "bg-avanza-green-light text-avanza-green-dark";
    case "ambar":
      return "bg-avanza-orange-light text-avanza-orange";
    case "rojo":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function PerfilPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [estado, setEstado] = useState<EstadoCliente | null>(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormPerfil | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const [p, e] = await Promise.all([obtenerPerfil(), obtenerEstado()]);
    setPerfil(p);
    setEstado(e);
  }

  useEffect(() => {
    cargar();
  }, []);

  function handleEmpezarEdicion() {
    if (!perfil) return;
    setForm({ nombre: perfil.nombre, telefono: perfil.cliente.telefono ?? "", correo: perfil.email });
    setEditando(true);
  }

  function handleCancelarEdicion() {
    setForm(null);
    setEditando(false);
  }

  function handleChange<K extends keyof FormPerfil>(field: K, value: FormPerfil[K]) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    setGuardando(true);
    try {
      await actualizarPerfil(form);
      successToast("Perfil actualizado");
      setEditando(false);
      await cargar();
    } catch (error) {
      const mensaje = error instanceof ApiFetchError ? error.message : "No se pudo actualizar el perfil";
      await erpAlert.fire({ icon: "error", title: "Algo salió mal", text: mensaje });
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

    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!perfil) {
    return (
      <PageTransition footer={<BottomNav />}>
        <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
          <BackHeader title="Perfil" subtitle="Tu información y preferencias" />
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition footer={<BottomNav />}>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader title="Perfil" subtitle="Tu información y preferencias" />

        {editando && form ? (
          <form noValidate onSubmit={handleGuardar} className="space-y-5">
            <TextField
              id="nombreCompleto"
              label="Nombre completo"
              icon={User}
              autoComplete="name"
              required
              value={form.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
            />
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
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                  aria-label="Editar datos personales"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-avanza-green hover:bg-avanza-green-light active:scale-95"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Nombre</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{perfil.nombre}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Correo electrónico
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{perfil.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Teléfono</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{perfil.cliente.telefono ?? "—"}</dd>
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
                {tipoAsesoriaLabel(perfil.cliente.linea.toLowerCase() as TipoAsesoria)}
              </span>
              {perfil.cliente.empresa && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {perfil.cliente.empresa.nombre}
                </p>
              )}
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
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${chipClase(
                      !estado.evaluacion ? "gris" : estado.evaluacion.estado === "REVISADA" ? "verde" : "ambar",
                    )}`}
                  >
                    Evaluación:{" "}
                    {!estado.evaluacion ? "Sin enviar" : estado.evaluacion.estado === "REVISADA" ? "Aprobada" : "Pendiente"}
                  </Link>
                  <Link
                    href="/programa"
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${chipClase(estado.programa ? "verde" : "gris")}`}
                  >
                    Programa: {estado.programa?.nombre ?? "Sin asignar"}
                  </Link>
                  <Link
                    href="/programa"
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${chipClase(
                      estado.pago?.estado === "PAGADO" ? "verde" : estado.pago ? "ambar" : "gris",
                    )}`}
                  >
                    Pago: {estado.pago ? (estado.pago.estado === "PAGADO" ? "Pagado" : "Pendiente") : "Sin pago"}
                  </Link>
                  {estado.requiereDiagnostico && (
                    <Link
                      href="/diagnostico"
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${chipClase(
                        estado.diagnosticoCompletado ? "verde" : "ambar",
                      )}`}
                    >
                      Diagnóstico: {estado.diagnosticoCompletado ? "Completado" : "Pendiente"}
                    </Link>
                  )}
                </div>
              </section>
            )}

            <button
              type="button"
              onClick={handleCerrarSesion}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-5 font-semibold text-red-600 hover:bg-red-50 active:scale-[0.98]"
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
