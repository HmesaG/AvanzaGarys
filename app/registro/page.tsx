"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Phone, Mail, Lock, Building2 } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import PageTransition from "@/components/PageTransition";
import TextField from "@/components/TextField";
import SelectField from "@/components/SelectField";
import { registrarCliente, obtenerEmpresas, ApiFetchError } from "@/lib/cliente-api";
import { TIPOS_ASESORIA, type TipoAsesoria } from "@/lib/mock-data";
import { successToast, erpAlert } from "@/lib/alerts";

type FormState = {
  nombreCompleto: string;
  telefono: string;
  correo: string;
  password: string;
  tipoAsesoria: TipoAsesoria | "";
  empresaId: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  nombreCompleto: "",
  telefono: "",
  correo: "",
  password: "",
  tipoAsesoria: "",
  empresaId: "",
};

const TIPOS_VALIDOS = new Set(TIPOS_ASESORIA.map((t) => t.id));

function tipoDesdeQuery(value: string | null): TipoAsesoria | "" {
  return value && TIPOS_VALIDOS.has(value as TipoAsesoria) ? (value as TipoAsesoria) : "";
}

function validateField(name: keyof FormState, value: string): string | undefined {
  switch (name) {
    case "nombreCompleto":
      if (!value.trim()) return "Ingresa tu nombre completo";
      if (value.trim().length < 3) return "El nombre es demasiado corto";
      return undefined;
    case "telefono":
      if (!value.trim()) return "Ingresa un número de teléfono";
      if (!/^[0-9+()\-\s]{7,}$/.test(value)) return "Número de teléfono inválido";
      return undefined;
    case "correo":
      if (!value.trim()) return "Ingresa tu correo electrónico";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Correo electrónico inválido";
      return undefined;
    case "password":
      if (!value) return "Ingresa una contraseña";
      if (value.length < 8) return "La contraseña debe tener al menos 8 caracteres";
      return undefined;
    case "tipoAsesoria":
      if (!value) return "Selecciona una línea de asesoría";
      return undefined;
    case "empresaId":
      return undefined;
    default:
      return undefined;
  }
}

function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    tipoAsesoria: tipoDesdeQuery(searchParams.get("tipo")),
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    if (form.tipoAsesoria !== "corporativo") return;
    obtenerEmpresas()
      .then(setEmpresas)
      .catch(() => setEmpresas([]));
  }, [form.tipoAsesoria]);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof FormState) {
    const error = validateField(field, form[field] ?? "");
    setErrors((prev) => ({ ...prev, [field]: error }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const nextErrors: Errors = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((field) => {
      const error = validateField(field, form[field] ?? "");
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await registrarCliente({
        nombreCompleto: form.nombreCompleto,
        telefono: form.telefono,
        correo: form.correo,
        password: form.password,
        tipoAsesoria: form.tipoAsesoria as "personal" | "corporativo" | "deportivo",
        empresaId: form.tipoAsesoria === "corporativo" && form.empresaId ? form.empresaId : undefined,
      });
      successToast("Registro guardado");
      router.push("/evaluacion");
    } catch (error) {
      const mensaje = error instanceof ApiFetchError ? error.message : "No se pudo completar el registro";
      await erpAlert.fire({ icon: "error", title: "No se pudo registrar", text: mensaje });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-8 safe-top">
        <BackHeader
          title="Regístrate"
          subtitle="Cuéntanos un poco sobre ti para comenzar"
        />

        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          <TextField
            id="nombreCompleto"
            label="Nombre completo"
            icon={User}
            placeholder="Ej. María Fernández"
            autoComplete="name"
            required
            aria-required="true"
            value={form.nombreCompleto}
            onChange={(e) => handleChange("nombreCompleto", e.target.value)}
            onBlur={() => handleBlur("nombreCompleto")}
            error={errors.nombreCompleto}
          />

          <TextField
            id="telefono"
            label="Teléfono"
            icon={Phone}
            type="tel"
            placeholder="Ej. 809-555-1234"
            autoComplete="tel"
            required
            aria-required="true"
            value={form.telefono}
            onChange={(e) => handleChange("telefono", e.target.value)}
            onBlur={() => handleBlur("telefono")}
            error={errors.telefono}
          />

          <TextField
            id="correo"
            label="Correo electrónico"
            icon={Mail}
            type="email"
            placeholder="Ej. maria@correo.com"
            autoComplete="email"
            required
            aria-required="true"
            value={form.correo}
            onChange={(e) => handleChange("correo", e.target.value)}
            onBlur={() => handleBlur("correo")}
            error={errors.correo}
          />

          <TextField
            id="password"
            label="Contraseña"
            icon={Lock}
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
            aria-required="true"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            error={errors.password}
          />

          <div>
            <SelectField
              id="tipoAsesoria"
              label="Línea de asesoría"
              placeholder="Selecciona una opción"
              options={TIPOS_ASESORIA.map((t) => ({ value: t.id, label: t.label }))}
              value={form.tipoAsesoria}
              onChange={(value) => {
                handleChange("tipoAsesoria", value as TipoAsesoria | "");
                handleChange("empresaId", "");
                setErrors((prev) => ({ ...prev, tipoAsesoria: undefined }));
              }}
              required
            />
            {errors.tipoAsesoria && (
              <p className="mt-1.5 text-sm text-red-600">{errors.tipoAsesoria}</p>
            )}
          </div>

          {form.tipoAsesoria === "corporativo" && (
            <div>
              <SelectField
                id="empresaId"
                label="Empresa"
                placeholder={empresas.length ? "Selecciona tu empresa" : "Cargando empresas..."}
                options={empresas.map((e) => ({ value: e.id, label: e.nombre }))}
                value={form.empresaId}
                onChange={(value) => handleChange("empresaId", value)}
              />
              <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                <Building2 className="h-3 w-3" aria-hidden="true" />
                Si tu empresa no aparece, continuá sin seleccionarla.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Continuar"}
          </button>

          <div className="relative my-5 flex items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="mx-3 flex-shrink text-xs font-medium uppercase tracking-wider text-gray-400">
              O regístrate con
            </span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          <button
            type="button"
            onClick={() =>
              successToast("El registro directo con Google se activará en la configuración del dominio.")
            }
            className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-5 font-semibold text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </button>
        </form>
      </main>
    </PageTransition>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroForm />
    </Suspense>
  );
}
