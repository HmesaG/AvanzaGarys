"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import TextField from "@/components/TextField";
import { successToast } from "@/lib/alerts";

/** Destino por defecto según el rol devuelto por la API. */
const DESTINO_POR_ROL: Record<string, string> = {
  ADMINISTRADOR: "/admin",
  COACH: "/admin",
  SECRETARIA: "/admin",
  CLIENTE: "/home",
};

type FormState = {
  correo: string;
  password: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  correo: "",
  password: "",
};

function validateField(name: keyof FormState, value: string): string | undefined {
  switch (name) {
    case "correo":
      if (!value.trim()) return "Ingresa tu correo electrónico";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Correo electrónico inválido";
      return undefined;
    case "password":
      if (!value) return "Ingresa tu contraseña";
      if (value.length < 4) return "La contraseña es demasiado corta";
      return undefined;
    default:
      return undefined;
  }
}

/**
 * El parámetro `?redirect=` lo controla quien arma el link, no la app. Sin este
 * filtro, `/login?redirect=https://sitio-falso/` haría que tras un login exitoso
 * el usuario aterrice en un sitio ajeno creyendo que sigue en Avanza (open
 * redirect, base clásica de phishing). Solo se aceptan rutas internas: una barra
 * inicial, y nunca `//` ni `/\` que el navegador interpreta como host externo.
 */
function destinoSeguro(valor: string | null): string | null {
  if (!valor) return null;
  if (!valor.startsWith("/")) return null;
  if (valor.startsWith("//") || valor.startsWith("/\\")) return null;
  return valor;
}

// `useSearchParams` obliga a un límite de Suspense para que la página pueda
// seguir prerenderizándose de forma estática (ver LoginPage al final).
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof FormState) {
    const error = validateField(field, form[field] ?? "");
    setErrors((prev) => ({ ...prev, [field]: error }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const nextErrors: Errors = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((field) => {
      const error = validateField(field, form[field] ?? "");
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: form.correo, password: form.password }),
      });

      if (!res.ok) {
        setErrorGeneral(
          res.status === 401
            ? "Correo o contraseña incorrectos"
            : res.status === 429
              ? "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
              : "No se pudo iniciar sesión. Intenta de nuevo.",
        );
        return;
      }

      const { usuario } = (await res.json()) as { usuario: { rol: string } };
      successToast("Sesión iniciada");

      // Si el middleware nos mandó acá desde una ruta protegida, volvemos a ella.
      const redirect = destinoSeguro(searchParams.get("redirect"));
      router.replace(redirect || DESTINO_POR_ROL[usuario.rol] || "/home");
    } catch {
      setErrorGeneral("No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pb-16 pt-8 safe-top">
        <header className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-avanza-green-light">
            <Lock className="h-6 w-6 text-avanza-green" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-gray-500">
            Inicia sesión para continuar tu proceso
          </p>
        </header>

        <form noValidate onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            required
            aria-required="true"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            error={errors.password}
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
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tenés cuenta?{" "}
          <Link
            href="/registro"
            className="font-semibold text-avanza-green transition-colors duration-150 hover:text-avanza-green-dark"
          >
            Regístrate
          </Link>
        </p>
      </main>
    </PageTransition>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
