"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import TextField from "@/components/TextField";
import { successToast, errorToast } from "@/lib/alerts";
import { ErrorApi, pedirJson } from "@/lib/api-navegador";

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

/** Sólo se sigue un `next` relativo propio de la app: evita open redirect vía `?next=https://evil.com`. */
function destinoSeguro(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      const { usuario } = await pedirJson<{ usuario: { rol: string } }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: form.correo, password: form.password }),
      });

      successToast("Sesión iniciada");
      // Staff (ADMINISTRADOR/COACH/SECRETARIA) va al panel; CLIENTE a su home.
      // El `next` del middleware (si venía de una ruta protegida) tiene prioridad.
      const destino =
        destinoSeguro(searchParams.get("next")) ??
        (usuario.rol === "CLIENTE"
          ? "/home"
          : usuario.rol === "SECRETARIA"
          ? "/admin/secretaria"
          : "/admin");
      router.push(destino);
    } catch (error) {
      const mensaje =
        error instanceof ErrorApi ? error.message : "No se pudo iniciar sesión. Intenta de nuevo.";
      errorToast(mensaje);
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

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-avanza-green px-5 font-semibold text-white transition-all duration-150 hover:bg-avanza-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>

          <div className="relative my-5 flex items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="mx-3 flex-shrink text-xs font-medium uppercase tracking-wider text-gray-400">
              O continúa con
            </span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          <button
            type="button"
            onClick={() =>
              successToast("El acceso directo con Google se activará en la configuración del dominio.")
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
