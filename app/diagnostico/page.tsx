"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import BackHeader from "@/components/BackHeader";
import PageTransition from "@/components/PageTransition";
import TextAreaField from "@/components/TextAreaField";
import SelectField from "@/components/SelectField";
import { enviarDiagnostico, obtenerEstado, type EstadoCliente } from "@/lib/cliente-api";
import { successToast } from "@/lib/alerts";

type FormState = {
  climaLaboral: string;
  principalDesafio: string;
  nivelComunicacion: string;
  objetivoEmpresa: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  climaLaboral: "",
  principalDesafio: "",
  nivelComunicacion: "",
  objetivoEmpresa: "",
};

const OPCIONES_COMUNICACION = [
  { value: "Buena", label: "Buena" },
  { value: "Regular", label: "Regular" },
  { value: "Deficiente", label: "Deficiente" },
];

function validateField(name: keyof FormState, value: string): string | undefined {
  if (name === "nivelComunicacion") {
    if (!value) return "Selecciona una opción";
    return undefined;
  }
  if (!value.trim()) return "Este campo es obligatorio";
  if (value.trim().length < 10) return "Cuéntanos un poco más (mínimo 10 caracteres)";
  return undefined;
}

export default function DiagnosticoPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const [estado, setEstado] = useState<EstadoCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        setEstado(await obtenerEstado());
        setError(false);
      } catch {
        setError(true);
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, []);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof FormState) {
    setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const nextErrors: Errors = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await enviarDiagnostico(form);
      successToast("Diagnóstico enviado");
      router.push("/home");
    } catch (error) {
      setErrorGeneral(
        error instanceof Error ? error.message : "No se pudo enviar el diagnóstico",
      );
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-8 safe-top">
        <BackHeader
          title="Diagnóstico organizacional"
          subtitle="Cuéntanos sobre tu empresa"
        />

        {cargando ? (
          <p className="mt-10 text-center text-sm text-gray-500">Cargando...</p>
        ) : error || !estado ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            No se pudo cargar tu estado. Intenta de nuevo más tarde.
          </p>
        ) : estado.perfil.tipoAsesoria !== "CORPORATIVO" ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            Este cuestionario es solo para clientes de línea Corporativo.
          </p>
        ) : estado.diagnosticoCompletado ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            Ya completaste tu diagnóstico organizacional, gracias.
          </p>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-5">
            <TextAreaField
              id="climaLaboral"
              label="¿Cómo describirías el clima laboral actual?"
              placeholder="Ej. En general es colaborativo, aunque hay tensión entre equipos"
              required
              aria-required="true"
              rows={3}
              value={form.climaLaboral}
              onChange={(e) => handleChange("climaLaboral", e.target.value)}
              onBlur={() => handleBlur("climaLaboral")}
              error={errors.climaLaboral}
            />

            <TextAreaField
              id="principalDesafio"
              label="¿Cuál es el principal desafío organizacional hoy?"
              placeholder="Ej. Coordinar equipos remotos con equipos presenciales"
              required
              aria-required="true"
              rows={3}
              value={form.principalDesafio}
              onChange={(e) => handleChange("principalDesafio", e.target.value)}
              onBlur={() => handleBlur("principalDesafio")}
              error={errors.principalDesafio}
            />

            <div>
              <SelectField
                id="nivelComunicacion"
                label="¿Cómo calificarías la comunicación interna?"
                placeholder="Selecciona una opción"
                options={OPCIONES_COMUNICACION}
                value={form.nivelComunicacion}
                onChange={(value) => {
                  handleChange("nivelComunicacion", value);
                  setErrors((prev) => ({ ...prev, nivelComunicacion: undefined }));
                }}
                required
              />
              {errors.nivelComunicacion && (
                <p className="mt-1.5 text-sm text-red-600">{errors.nivelComunicacion}</p>
              )}
            </div>

            <TextAreaField
              id="objetivoEmpresa"
              label="¿Qué espera lograr la empresa con este programa?"
              placeholder="Ej. Mejorar la retención y el clima laboral en los próximos 6 meses"
              required
              aria-required="true"
              rows={3}
              value={form.objetivoEmpresa}
              onChange={(e) => handleChange("objetivoEmpresa", e.target.value)}
              onBlur={() => handleBlur("objetivoEmpresa")}
              error={errors.objetivoEmpresa}
            />

            {errorGeneral && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorGeneral}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar diagnóstico"}
            </button>
          </form>
        )}
      </main>
    </PageTransition>
  );
}
