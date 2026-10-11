import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { db } from "@/lib/prisma";
import { tareasGenericasParaCrear } from "@/lib/cliente-queries";
import { montoValido, textoOpcional, textoRequerido } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

/** Monto por defecto cuando el coach no especifica uno al aprobar. */
const MONTO_PROGRAMA_DEFAULT = 5000;

/**
 * Aprueba una evaluación de la bandeja global: la marca como revisada, toma al
 * cliente en la cartera de quien aprueba y le crea el primer programa. Es el
 * paso que mueve al cliente de la bandeja 1 (global) a la bandeja 2 (mis
 * clientes) — ver ADR 007.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH);
    const { id } = await params;

    const cuerpo = await leerJson(request).catch(() => ({}) as Record<string, unknown>);
    const descripcionPrograma = textoOpcional(cuerpo.descripcionPrograma, "descripcionPrograma", {
      max: 2000,
    });
    const monto =
      cuerpo.monto === undefined ? MONTO_PROGRAMA_DEFAULT : montoValido(cuerpo.monto, "monto");

    const resultado = await db.$transaction(async (tx) => {
      const evaluacion = await tx.evaluacion.findUnique({
        where: { id },
        select: {
          id: true,
          clienteId: true,
          objetivoPrincipal: true,
          revisadaPorId: true,
          cliente: { select: { coachId: true } },
        },
      });

      if (!evaluacion) {
        throw new ApiError(404, "La evaluación no existe", "no_encontrado");
      }
      if (evaluacion.revisadaPorId) {
        throw new ApiError(409, "La evaluación ya fue revisada", "ya_revisada");
      }

      const nombrePrograma =
        typeof cuerpo.nombrePrograma === "string" && cuerpo.nombrePrograma.trim()
          ? textoRequerido(cuerpo.nombrePrograma, "nombrePrograma", { min: 3, max: 120 })
          : `Programa — ${evaluacion.objetivoPrincipal}`.slice(0, 120);

      await tx.evaluacion.update({
        where: { id: evaluacion.id },
        data: { revisadaPorId: usuario.id, revisadaAt: new Date() },
      });

      // Sólo se asigna coach si el cliente todavía no tiene uno. Si ya lo tiene,
      // aprobar una evaluación posterior no le roba el cliente a su coach.
      if (!evaluacion.cliente.coachId) {
        await tx.cliente.update({
          where: { id: evaluacion.clienteId },
          data: { coachId: usuario.id },
        });
      }

      const programa = await tx.programa.create({
        data: {
          clienteId: evaluacion.clienteId,
          nombre: nombrePrograma,
          descripcion: descripcionPrograma ?? evaluacion.objetivoPrincipal,
        },
        select: { id: true, nombre: true, descripcion: true, progreso: true, activo: true },
      });

      // Pago pendiente a la espera de que el cliente lo registre desde
      // /programa, y 3 tareas genéricas de arranque — ambos en la misma
      // transacción que el programa, mismo criterio que el resto del gate
      // evaluación→programa→consentimiento→pago.
      const pago = await tx.pago.create({
        data: {
          clienteId: evaluacion.clienteId,
          monto,
          concepto: nombrePrograma,
        },
        select: { id: true, monto: true, estado: true },
      });

      await tx.tarea.createMany({ data: tareasGenericasParaCrear(evaluacion.clienteId) });

      return {
        evaluacionId: evaluacion.id,
        clienteId: evaluacion.clienteId,
        coachId: evaluacion.cliente.coachId ?? usuario.id,
        programa,
        pago: { ...pago, monto: Number(pago.monto) },
      };
    });

    return jsonOk(resultado, 201);
  } catch (error) {
    return manejarError(error);
  }
}
