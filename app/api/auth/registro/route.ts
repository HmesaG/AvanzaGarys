import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/server/session";
import { csrfErrorResponse } from "@/lib/server/csrf";
import {
  consumirRateLimit,
  ipDeLaPeticion,
  respuestaRateLimit,
} from "@/lib/server/rate-limit";
import { Rol, TipoAsesoria } from "../../../../generated/enums";

// bcrypt y ioredis requieren runtime Node.js (no corren en Edge).
export const runtime = "nodejs";

/** Mismo costo que usa el seed y contra el que compara `login`. */
const BCRYPT_ROUNDS = 10;

// Alta pública: sin sesión previa y con escritura en base, así que va limitada
// por IP. No hay segundo límite por identidad (a diferencia de login): el correo
// lo elige el atacante en cada intento, contarlo no frenaría nada.
const MAX_POR_IP = 10;
const VENTANA_SEGUNDOS = 15 * 60;

// Cortacircuitos global.
//
// `ipDeLaPeticion` deriva la IP de `x-forwarded-for`, una cabecera que envía el
// propio cliente. Hoy la app se sirve sin reverse proxy delante (ver
// docker-compose.yml), así que ese valor es falsificable: rotando la cabecera en
// cada petición, el límite por IP de arriba se evade por completo. En login eso
// queda cubierto por el segundo límite por correo, pero el registro no tiene
// equivalente — sin este tope sería alta ilimitada de cuentas y, peor, hashing
// bcrypt (cost 10, ~100ms de CPU cada uno) sin cota: un DoS barato.
//
// El tope es global a propósito: es la única dimensión que el atacante no puede
// rotar. Se fija muy por encima del uso legítimo esperado (una app de coaching
// no recibe 100 altas cada 15 minutos), así que en la práctica solo se dispara
// bajo abuso. Cuando se despliegue detrás de un proxy propio que reescriba
// `x-forwarded-for`, el límite por IP pasa a ser el control principal y este
// queda como red de seguridad.
const MAX_GLOBAL = 100;

/** La UI usa los ids en minúscula de `TIPOS_ASESORIA`; la base, el enum en mayúscula. */
const TIPO_ASESORIA_POR_ID: Record<string, TipoAsesoria> = {
  personal: TipoAsesoria.PERSONAL,
  corporativo: TipoAsesoria.CORPORATIVO,
  deportivo: TipoAsesoria.DEPORTIVO,
};

// La validación de la UI es solo conveniencia: acá se vuelve a validar todo,
// porque el endpoint es público y cualquiera puede postear directo.
const registroSchema = z.object({
  nombreCompleto: z.string().trim().min(3).max(120),
  telefono: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{7,20}$/),
  correo: z.string().trim().email().max(160),
  edad: z.coerce.number().int().min(12).max(100),
  tipoAsesoria: z.enum(["personal", "corporativo", "deportivo"]),
  password: z.string().min(8).max(72),
});

/** `true` si el error de Prisma es una violación de índice único. */
function esCorreoDuplicado(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export async function POST(request: Request) {
  const csrfError = csrfErrorResponse(request);
  if (csrfError) return csrfError;

  const porIp = await consumirRateLimit(
    `registro:ip:${ipDeLaPeticion(request)}`,
    MAX_POR_IP,
    VENTANA_SEGUNDOS,
  );
  if (!porIp.permitido) return respuestaRateLimit(porIp.reintentarEn);

  // Se consume ANTES de bcrypt y de tocar la base: si el tope global ya está
  // agotado, la petición no debe costar ni un hash ni una transacción.
  const global = await consumirRateLimit("registro:global", MAX_GLOBAL, VENTANA_SEGUNDOS);
  if (!global.permitido) return respuestaRateLimit(global.reintentarEn);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const parsed = registroSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Revisa los datos del formulario" }, { status: 400 });
  }

  const { nombreCompleto, telefono, edad, password } = parsed.data;
  const correo = parsed.data.correo.toLowerCase();
  const tipoAsesoria = TIPO_ASESORIA_POR_ID[parsed.data.tipoAsesoria]!;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let usuarioId: string;
  try {
    // Usuario y Cliente en la misma transacción: un Usuario CLIENTE sin su fila
    // de Cliente no puede usar ninguna pantalla del área privada.
    const usuario = await prisma.$transaction(async (tx) => {
      const creado = await tx.usuario.create({
        data: { nombre: nombreCompleto, correo, passwordHash, rol: Rol.CLIENTE },
      });
      await tx.cliente.create({
        data: { usuarioId: creado.id, nombreCompleto, telefono, edad, tipoAsesoria },
      });
      return creado;
    });
    usuarioId = usuario.id;
  } catch (error) {
    if (esCorreoDuplicado(error)) {
      // Mensaje genérico a propósito: confirmar "ese correo ya existe" convierte
      // el registro en un oráculo de enumeración de cuentas, igual que pasaría en
      // login si distinguiera correo inexistente de contraseña incorrecta.
      return Response.json(
        { error: "No se pudo completar el registro con estos datos" },
        { status: 409 },
      );
    }
    console.error("[registro] alta fallida:", error);
    return Response.json({ error: "No se pudo completar el registro" }, { status: 500 });
  }

  // Rotación de sesión, igual que en login: si el navegador traía una sesión
  // previa, se revoca en Redis antes de emitir la nueva.
  await destroySession();
  await createSession({ usuarioId, rol: Rol.CLIENTE, empresaId: null });

  return Response.json(
    { usuario: { id: usuarioId, nombre: nombreCompleto, rol: Rol.CLIENTE } },
    { status: 201 },
  );
}
