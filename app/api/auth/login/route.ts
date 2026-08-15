import { z } from "zod";
import { login } from "@/lib/server/auth";
import { createSession, destroySession } from "@/lib/server/session";
import { csrfErrorResponse } from "@/lib/server/csrf";
import {
  consumirRateLimit,
  ipDeLaPeticion,
  limpiarRateLimit,
  respuestaRateLimit,
} from "@/lib/server/rate-limit";

// ioredis y bcrypt requieren runtime Node.js (no corren en Edge).
export const runtime = "nodejs";

const loginSchema = z.object({
  correo: z.string().trim().email(),
  password: z.string().min(1),
});

// Dos límites complementarios: por IP (frena barridos de muchos correos desde un
// origen) y por correo (frena fuerza bruta distribuida contra una cuenta).
const MAX_POR_IP = 20;
const MAX_POR_CORREO = 5;
const VENTANA_SEGUNDOS = 15 * 60;

export async function POST(request: Request) {
  const csrfError = csrfErrorResponse(request);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Correo o contraseña con formato inválido" }, { status: 400 });
  }

  const correo = parsed.data.correo.toLowerCase();
  const claveIp = `login:ip:${ipDeLaPeticion(request)}`;
  const claveCorreo = `login:correo:${correo}`;

  // Se consume el límite ANTES de tocar bcrypt: comparar un hash es caro a
  // propósito, así que dejarlo sin límite es también un vector de DoS.
  const porIp = await consumirRateLimit(claveIp, MAX_POR_IP, VENTANA_SEGUNDOS);
  if (!porIp.permitido) return respuestaRateLimit(porIp.reintentarEn);

  const porCorreo = await consumirRateLimit(claveCorreo, MAX_POR_CORREO, VENTANA_SEGUNDOS);
  if (!porCorreo.permitido) return respuestaRateLimit(porCorreo.reintentarEn);

  const usuario = await login(correo, parsed.data.password);
  if (!usuario) {
    return Response.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  await limpiarRateLimit(claveCorreo);

  // Rotación de sesión: si el navegador ya traía una sesión, se revoca en Redis
  // antes de emitir la nueva. Evita dejar sesiones huérfanas vivas 7 días y
  // cierra cualquier escenario de reutilización del id anterior.
  await destroySession();

  await createSession({
    usuarioId: usuario.id,
    rol: usuario.rol,
    empresaId: usuario.empresaId,
  });

  return Response.json({
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
  });
}
