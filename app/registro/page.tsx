"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, Cake } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import PageTransition from "@/components/PageTransition";
import TextField from "@/components/TextField";
import SelectField from "@/components/SelectField";
import { saveRegistro } from "@/lib/client-state";
import { TIPOS_ASESORIA, type TipoAsesoria } from "@/lib/mock-data";
import { successToast } from "@/lib/alerts";

type FormState = {
  nombreCompleto: string;
  telefono: string;
  correo: string;
  edad: string;
  tipoAsesoria: TipoAsesoria | "";
};

type Errors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  nombreCompleto: "",
  telefono: "",
  correo: "",
  edad: "",
  tipoAsesoria: "",
};

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
    case "edad": {
      if (!value.trim()) return "Ingresa tu edad";
      const n = Number(value);
      if (!Number.isInteger(n) || n < 12 || n > 100) return "Ingresa una edad válida";
      return undefined;
    }
    case "tipoAsesoria":
      if (!value) return "Selecciona una línea de asesoría";
      return undefined;
    default:
      return undefined;
  }
}

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof FormState) {
    const error = validateField(field, form[field] ?? "");
    setErrors((prev) => ({ ...prev, [field]: error }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const nextErrors: Errors = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((field) => {
      const error = validateField(field, form[field] ?? "");
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    saveRegistro(form);
    window.setTimeout(() => {
      setSubmitting(false);
      successToast("Registro guardado");
      router.push("/evaluacion");
    }, 400);
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
            id="edad"
            label="Edad"
            icon={Cake}
            type="number"
            inputMode="numeric"
            placeholder="Ej. 28"
            min={12}
            max={100}
            autoComplete="off"
            required
            aria-required="true"
            value={form.edad}
            onChange={(e) => handleChange("edad", e.target.value)}
            onBlur={() => handleBlur("edad")}
            error={errors.edad}
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
                setErrors((prev) => ({ ...prev, tipoAsesoria: undefined }));
              }}
              required
            />
            {errors.tipoAsesoria && (
              <p className="mt-1.5 text-sm text-red-600">{errors.tipoAsesoria}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Continuar"}
          </button>
        </form>
      </main>
    </PageTransition>
  );
}
