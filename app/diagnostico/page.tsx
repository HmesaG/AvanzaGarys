"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import BackHeader from "@/components/BackHeader";
import PageTransition from "@/components/PageTransition";
import TextAreaField from "@/components/TextAreaField";
import SelectField from "@/components/SelectField";
import { enviarDiagnostico, ApiFetchError } from "@/lib/cliente-api";
import { erpAlert, successToast } from "@/lib/alerts";

const NIVELES = [
  { value: "Buena", label: "Buena" },
  { value: "Regular", label: "Regular" },
  { value: "Deficiente", label: "Deficiente" },
];

type FormState = {
  climaLaboral: string;
  principalDesafio: string;
  nivelComunicacion: "Buena" | "Regular" | "Deficiente" | "";
  objetivoEmpresa: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  climaLaboral: "",
  principalDesafio: "",
  nivelComunicacion: "",
  objetivoEmpresa: "",
};

function validateField(name: keyof FormState, value: string): string | undefined {
  if (name === "nivelComunicacion") {
    if (!value) return "Selecciona una opción";
    return undefined;
  }
  if (!value.trim()) return "Este campo es obligatorio";
  if (value.trim().length < 5) return "Contanos un poco más (mínimo 5 caracteres)";
  return undefined;
}

export default function DiagnosticoPage() {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const nextErrors: Errors = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await enviarDiagnostico({
        climaLaboral: form.climaLaboral,
        principalDesafio: form.principalDesafio,
        nivelComunicacion: form.nivelComunicacion as "Buena" | "Regular" | "Deficiente",
        objetivoEmpresa: form.objetivoEmpresa,
      });
      successToast("Diagnóstico enviado");
      router.push("/home");
    } catch (error) {
      if (error instanceof ApiFetchError && error.status === 409) {
        await erpAlert.fire({ icon: "info", title: "Ya completaste tu diagnóstico organizacional" });
        router.push("/home");
        return;
      }
      const mensaje = error instanceof ApiFetchError ? error.message : "No se pudo enviar el diagnóstico";
      await erpAlert.fire({ icon: "error", title: "Algo salió mal", text: mensaje });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-8 safe-top">
        <BackHeader title="Diagnóstico organizacional" subtitle="Cuéntanos sobre tu empresa" />

        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          <TextAreaField
            id="climaLaboral"
            label="¿Cómo describirías el clima laboral actual?"
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
              label="¿Cómo calificarías el nivel de comunicación interna?"
              placeholder="Selecciona una opción"
              options={NIVELES}
              value={form.nivelComunicacion}
              onChange={(value) => {
                handleChange("nivelComunicacion", value as FormState["nivelComunicacion"]);
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
            label="¿Cuál es el objetivo general de la empresa?"
            required
            aria-required="true"
            rows={3}
            value={form.objetivoEmpresa}
            onChange={(e) => handleChange("objetivoEmpresa", e.target.value)}
            onBlur={() => handleBlur("objetivoEmpresa")}
            error={errors.objetivoEmpresa}
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Enviar diagnóstico"}
          </button>
        </form>
      </main>
    </PageTransition>
  );
}
