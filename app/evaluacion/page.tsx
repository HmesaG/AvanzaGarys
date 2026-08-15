"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import BackHeader from "@/components/BackHeader";
import PageTransition from "@/components/PageTransition";
import TextAreaField from "@/components/TextAreaField";
import SelectField from "@/components/SelectField";
import { saveEvaluacion } from "@/lib/client-state";
import { OPCIONES_TIEMPO } from "@/lib/mock-data";
import { successToast } from "@/lib/alerts";

type FormState = {
  objetivoPrincipal: string;
  principalDificultad: string;
  tiempoDeseado: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  objetivoPrincipal: "",
  principalDificultad: "",
  tiempoDeseado: "",
};

function validateField(name: keyof FormState, value: string): string | undefined {
  if (name === "tiempoDeseado") {
    if (!value) return "Selecciona una opción";
    return undefined;
  }
  if (!value.trim()) return "Este campo es obligatorio";
  if (value.trim().length < 10) return "Cuéntanos un poco más (mínimo 10 caracteres)";
  return undefined;
}

export default function EvaluacionPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof FormState) {
    setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const nextErrors: Errors = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    saveEvaluacion(form);
    window.setTimeout(() => {
      setSubmitting(false);
      successToast("Evaluación guardada");
      router.push("/agenda");
    }, 400);
  }

  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-8 safe-top">
        <BackHeader
          title="Evaluación inicial"
          subtitle="Ayúdanos a entender tu punto de partida"
        />

        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          <TextAreaField
            id="objetivoPrincipal"
            label="¿Cuál es tu objetivo principal?"
            placeholder="Ej. Mejorar mi manejo del estrés y ganar confianza"
            required
            aria-required="true"
            rows={3}
            value={form.objetivoPrincipal}
            onChange={(e) => handleChange("objetivoPrincipal", e.target.value)}
            onBlur={() => handleBlur("objetivoPrincipal")}
            error={errors.objetivoPrincipal}
          />

          <TextAreaField
            id="principalDificultad"
            label="¿Cuál es tu principal dificultad hoy?"
            placeholder="Ej. Me cuesta mantener la constancia en mis rutinas"
            required
            aria-required="true"
            rows={3}
            value={form.principalDificultad}
            onChange={(e) => handleChange("principalDificultad", e.target.value)}
            onBlur={() => handleBlur("principalDificultad")}
            error={errors.principalDificultad}
          />

          <div>
            <SelectField
              id="tiempoDeseado"
              label="¿En cuánto tiempo esperas ver resultados?"
              placeholder="Selecciona una opción"
              options={OPCIONES_TIEMPO}
              value={form.tiempoDeseado}
              onChange={(value) => {
                handleChange("tiempoDeseado", value);
                setErrors((prev) => ({ ...prev, tiempoDeseado: undefined }));
              }}
              required
            />
            {errors.tiempoDeseado && (
              <p className="mt-1.5 text-sm text-red-600">{errors.tiempoDeseado}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Continuar a agenda"}
          </button>
        </form>
      </main>
    </PageTransition>
  );
}
