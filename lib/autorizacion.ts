// Reglas de autorización sobre recursos concretos (anti-IDOR).
//
// Los ids son CUID, no enteros correlativos (ADR 007), así que no se pueden
// enumerar a ciegas — pero eso es ofuscación, no autorización. Todo endpoint que
// devuelva datos de un cliente puntual tiene que pasar por acá.
import { ApiError } from "./http";
import { Rol } from "../generated/prisma/client";
import type { UsuarioSesion } from "./auth";

/** Roles internos de Avanza: ven la operación, no son clientes. */
export const ROLES_STAFF: Rol[] = [Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA];

export function esStaff(usuario: UsuarioSesion): boolean {
  return ROLES_STAFF.includes(usuario.rol);
}

/**
 * Un cliente sólo puede leer su propia ficha; el staff puede leer cualquiera.
 *
 * Se llama ANTES de buscar el recurso a propósito: así un cliente que prueba
 * ids ajenos recibe siempre 403, sin poder distinguir "existe pero no es tuyo"
 * de "no existe" por el código de respuesta.
 */
export function asegurarAccesoACliente(usuario: UsuarioSesion, clienteId: string): void {
  if (esStaff(usuario)) return;
  if (usuario.clienteId && usuario.clienteId === clienteId) return;

  throw new ApiError(403, "No tenés permiso para ver este cliente", "sin_permiso");
}
