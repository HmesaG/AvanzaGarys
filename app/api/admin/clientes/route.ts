import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { listarClientes } from "@/lib/admin-queries";
import { lineaValida } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

/**
 * Lista de clientes. Por defecto devuelve todos (el staff necesita ver la
 * operación completa). `?mios=1` es la bandeja 2, "mis clientes": filtra por el
 * coach autenticado. La bandeja global de evaluaciones es otro endpoint y no
 * usa este filtro — ADR 007.
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const params = request.nextUrl.searchParams;

    const soloMios = params.get("mios") === "1";
    const lineaParam = params.get("linea");
    const busqueda = params.get("q")?.trim();

    const clientes = await listarClientes({
      coachId: soloMios ? usuario.id : undefined,
      linea: lineaParam ? lineaValida(lineaParam) : undefined,
      busqueda: busqueda || undefined,
    });

    return jsonOk({ clientes });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);
    const cuerpo = await request.json();

    const { emailValido, passwordValida, textoRequerido, textoOpcional, lineaValida } = await import("@/lib/validacion");
    const { hashearPassword } = await import("@/lib/auth");
    const { db } = await import("@/lib/prisma");
    const { ApiError } = await import("@/lib/http");

    const nombre = textoRequerido(cuerpo.nombre, "nombre", { min: 3, max: 120 });
    const email = emailValido(cuerpo.email);
    const linea = lineaValida(cuerpo.linea || "PERSONAL");
    const telefono = textoOpcional(cuerpo.telefono, "telefono", { max: 40 });
    const coachId = textoOpcional(cuerpo.coachId, "coachId", { max: 40 });
    const password = cuerpo.password ? passwordValida(cuerpo.password) : "Avanza2026!";

    const passwordHash = await hashearPassword(password);

    const creado = await db.$transaction(async (tx) => {
      const existente = await tx.usuario.findUnique({ where: { email }, select: { id: true } });
      if (existente) {
        throw new ApiError(409, "Ya existe una cuenta con ese correo", "email_en_uso");
      }

      if (coachId) {
        const coach = await tx.usuario.findUnique({ where: { id: coachId }, select: { id: true, rol: true } });
        if (!coach || coach.rol !== Rol.COACH) {
          throw new ApiError(400, "El coach seleccionado no es válido", "coach_invalido");
        }
      }

      const usuario = await tx.usuario.create({
        data: {
          email,
          nombre,
          passwordHash,
          rol: Rol.CLIENTE,
        },
      });

      const cliente = await tx.cliente.create({
        data: {
          usuarioId: usuario.id,
          linea,
          telefono,
          coachId,
        },
        include: {
          usuario: { select: { id: true, nombre: true, email: true } },
          coach: { select: { id: true, nombre: true } },
        },
      });

      return cliente;
    });

    return jsonOk({ cliente: creado }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
