"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Phone, Mail, Pencil, LogOut, Briefcase, X } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import TextField from "@/components/TextField";
import SelectField from "@/components/SelectField";
import {
  getClienteState,
  saveRegistro,
  clearClienteState,
  tipoAsesoriaLabel,
  type RegistroCliente,
} from "@/lib/client-state";
import { TIPOS_ASESORIA, type TipoAsesoria } from "@/lib/mock-data";
import { erpAlert, successToast } from "@/lib/alerts";

export default function PerfilPage() {
  const router = useRouter();
  const [registro, setRegistro] = useState<RegistroCliente | null>(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<RegistroCliente | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setRegistro(getClienteState().registro);
  }, []);

  function handleEmpezarEdicion() {
    if (!registro) return;
    setForm(registro);
    setEditando(true);
  }

  function handleCancelarEdicion() {
    setForm(null);
    setEditando(false);
  }

  function handleChange<K extends keyof RegistroCliente>(
    field: K,
    value: RegistroCliente[K]
  ) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function handleGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    setGuardando(true);
    window.setTimeout(() => {
      saveRegistro(form);
      setRegistro(form);
      setGuardando(false);
      setEditando(false);
      successToast("Perfil actualizado");
    }, 350);
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

    clearClienteState();
    router.push("/login");
  }

  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8 safe-top">
        <BackHeader title="Perfil" subtitle="Tu información y preferencias" />

        {!registro ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-gray-900">
              Aún no tienes datos registrados
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Completa tu registro para ver tu perfil aquí.
            </p>
            <Link
              href="/registro"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98]"
            >
              Ir a registro
            </Link>
          </section>
        ) : editando && form ? (
          <form noValidate onSubmit={handleGuardar} className="space-y-5">
            <TextField
              id="nombreCompleto"
              label="Nombre completo"
              icon={User}
              autoComplete="name"
              required
              value={form.nombreCompleto}
              onChange={(e) => handleChange("nombreCompleto", e.target.value)}
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
            <SelectField
              id="tipoAsesoria"
              label="Línea de asesoría"
              placeholder="Selecciona una opción"
              options={TIPOS_ASESORIA.map((t) => ({ value: t.id, label: t.label }))}
              value={form.tipoAsesoria}
              onChange={(value) =>
                handleChange("tipoAsesoria", value as TipoAsesoria | "")
              }
              required
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
                  aria-label="Editar datos personales"
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
                  <dd className="mt-0.5 text-sm text-gray-900">
                    {registro.nombreCompleto}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Correo electrónico
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{registro.correo}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Teléfono
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{registro.telefono}</dd>
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
                {tipoAsesoriaLabel(registro.tipoAsesoria)}
              </span>
            </section>

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
      <BottomNav />
    </PageTransition>
  );
}
