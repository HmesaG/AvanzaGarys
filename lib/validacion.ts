// Validación de payloads de la API. Sin dependencias externas: el proyecto no
// tiene librería de validación y agregar una (zod) por seis campos no se
// justifica todavía. Todo lanza ApiError 400 con mensaje en español.
import { ApiError } from "./http";
import { LineaAsesoria } from "../generated/prisma/client";

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function textoRequerido(
  valor: unknown,
  campo: string,
  { min = 1, max = 255 }: { min?: number; max?: number } = {},
): string {
  if (typeof valor !== "string") {
    throw new ApiError(400, `El campo "${campo}" es obligatorio`, "campo_invalido");
  }
  const limpio = valor.trim();
  if (limpio.length < min) {
    throw new ApiError(
      400,
      min === 1
        ? `El campo "${campo}" es obligatorio`
        : `El campo "${campo}" debe tener al menos ${min} caracteres`,
      "campo_invalido",
    );
  }
  if (limpio.length > max) {
    throw new ApiError(
      400,
      `El campo "${campo}" no puede superar los ${max} caracteres`,
      "campo_invalido",
    );
  }
  return limpio;
}

export function textoOpcional(
  valor: unknown,
  campo: string,
  { max = 255 }: { max?: number } = {},
): string | null {
  if (valor === undefined || valor === null || valor === "") return null;
  return textoRequerido(valor, campo, { max });
}

export function emailValido(valor: unknown, campo = "correo"): string {
  const texto = textoRequerido(valor, campo, { max: 254 }).toLowerCase();
  if (!RE_EMAIL.test(texto)) {
    throw new ApiError(400, "Correo electrónico inválido", "campo_invalido");
  }
  return texto;
}

/** Mínimo 8 caracteres. bcrypt trunca a 72 bytes, así que se acota arriba también. */
export function passwordValida(valor: unknown): string {
  if (typeof valor !== "string" || valor.length < 8) {
    throw new ApiError(400, "La contraseña debe tener al menos 8 caracteres", "campo_invalido");
  }
  if (valor.length > 72) {
    throw new ApiError(400, "La contraseña no puede superar los 72 caracteres", "campo_invalido");
  }
  return valor;
}

/**
 * Acepta tanto el enum de Prisma ("PERSONAL") como los ids que ya usa el
 * frontend mock ("personal", ver `lib/mock-data.ts`), para que la migración del
 * frontend no tenga que cambiar los valores del formulario.
 */
export function lineaValida(valor: unknown, campo = "linea"): LineaAsesoria {
  const texto = textoRequerido(valor, campo, { max: 32 }).toUpperCase();
  if (texto in LineaAsesoria) {
    return LineaAsesoria[texto as keyof typeof LineaAsesoria];
  }
  throw new ApiError(
    400,
    "Línea de asesoría inválida (personal, corporativo o deportivo)",
    "campo_invalido",
  );
}

/** Monto en moneda local. Positivo, con hasta 2 decimales. */
export function montoValido(valor: unknown, campo = "monto", { max = 1_000_000 } = {}): number {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (typeof numero !== "number" || !Number.isFinite(numero) || numero <= 0) {
    throw new ApiError(400, `El campo "${campo}" debe ser un número positivo`, "campo_invalido");
  }
  if (numero > max) {
    throw new ApiError(400, `El campo "${campo}" no puede superar ${max}`, "campo_invalido");
  }
  return Math.round(numero * 100) / 100;
}

export function fechaValida(valor: unknown, campo: string): Date {
  const texto = textoRequerido(valor, campo, { max: 40 });
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) {
    throw new ApiError(400, `El campo "${campo}" no es una fecha válida`, "campo_invalido");
  }
  return fecha;
}
