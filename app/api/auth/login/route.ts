import type { NextRequest } from "next/server";
import { abrirSesion, verificarCredenciales } from "@/lib/auth";
import {
  ApiError,
  ipDeRequest,
  jsonError,
  jsonOk,
  leerJson,
  manejarError,
  verificarOrigen,
} from "@/lib/http";
import { limitarTasa, resetearLimite } from "@/lib/rate-limit";
import { emailValido } from "@/lib/validacion";

const VENTANA_SEGUNDOS = 15 * 60;
/** Freno grueso contra fuerza bruta desde una misma IP. */
const LIMITE_POR_IP = 10;
/**
 * Freno por cuenta: sin esto, una botnet distribuida evade el límite por IP
 * atacando el mismo email desde muchas direcciones. Contrapartida conocida: un
 * atacante puede bloquear a un usuario legítimo por 15 minutos. Se acepta —
 * la ventana es corta y el login exitoso limpia el contador.
 */
const LIMITE_POR_CUENTA = 5;

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);

    const ip = ipDeRequest(request);
    const claveIp = `login:ip:${ip}`;
    const limiteIp = await limitarTasa(claveIp, LIMITE_POR_IP, VENTANA_SEGUNDOS);
    if (!limiteIp.permitido) {
      const respuesta = jsonError(
        429,
        "Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.",
        "rate_limit",
      );
      respuesta.headers.set("Retry-After", String(limiteIp.resetEnSegundos));
      return respuesta;
    }

    const cuerpo = await leerJson(request);
    // El formulario del frontend usa "correo"; se acepta "email" también para
    // no atar la API al nombre del campo de una vista.
    const email = emailValido(cuerpo.correo ?? cuerpo.email);
    const password = cuerpo.password;
    if (typeof password !== "string" || password.length === 0) {
      // Sin trim ni recorte: la contraseña se compara tal cual la escribió el usuario.
      throw new ApiError(400, "Ingresá tu contraseña", "campo_invalido");
    }

    const claveCuenta = `login:cuenta:${email}`;
    const limiteCuenta = await limitarTasa(claveCuenta, LIMITE_POR_CUENTA, VENTANA_SEGUNDOS);
    if (!limiteCuenta.permitido) {
      const respuesta = jsonError(
        429,
        "Demasiados intentos para esta cuenta. Probá de nuevo en unos minutos.",
        "rate_limit",
      );
      respuesta.headers.set("Retry-After", String(limiteCuenta.resetEnSegundos));
      return respuesta;
    }

    const usuario = await verificarCredenciales(email, password);
    if (!usuario) {
      // Mensaje único a propósito: no revelar si el correo existe.
      throw new ApiError(401, "Correo o contraseña incorrectos", "credenciales_invalidas");
    }

    await abrirSesion(usuario);
    await Promise.all([resetearLimite(claveIp), resetearLimite(claveCuenta)]);

    return jsonOk({ usuario });
  } catch (error) {
    return manejarError(error);
  }
}
