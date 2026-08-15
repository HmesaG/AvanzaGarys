import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import { CACHE_KEYS, invalidateCache } from "@/lib/server/cache";
import {
  ClienteError,
  clienteErrorResponse,
  clienteIdDeSesion,
  fechaDesdeIso,
  inicioDeHoyUtc,
  listarCitas,
  puedeAgendar,
} from "@/lib/server/cliente-queries";
import { HORARIOS_DISPONIBLES } from "@/lib/mock-data";
import { Modalidad, Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

/** Ventana que ofrece el selector de fechas de `/agenda`. */
const DIAS_AGENDABLES = 14;

const citaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string(),
  modalidad: z.enum(["Virtual", "Presencial"]),
});

export async function GET() {
  try {
    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);

    // La agenda se lee aunque todavía no se pueda agendar: la pantalla necesita
    // saber si hay citas para decidir qué mostrar.
    return Response.json({
      citas: await listarCitas(clienteId),
      puedeAgendar: await puedeAgendar(clienteId),
    });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const parsed = citaSchema.safeParse(body);
    if (!parsed.success || !HORARIOS_DISPONIBLES.includes(parsed.data.hora)) {
      return Response.json({ error: "Fecha, hora o modalidad inválida" }, { status: 400 });
    }

    // Consentimiento + pago se revalidan contra la base: que la UI haya mostrado
    // el botón no prueba nada, el POST puede llegar directo.
    if (!(await puedeAgendar(clienteId))) {
      throw new ClienteError(409, "Todavía no puedes agendar sesiones");
    }

    const fecha = fechaDesdeIso(parsed.data.fecha);
    // La ventana se compara en UTC pero el navegador propone días en hora local:
    // en RD (UTC-4) el "hoy" del cliente ya es "mañana" en UTC después de las
    // 20:00. Se tolera un día en cada borde para no rechazar fechas legítimas.
    const desde = inicioDeHoyUtc();
    desde.setUTCDate(desde.getUTCDate() - 1);
    const hasta = new Date(desde);
    hasta.setUTCDate(hasta.getUTCDate() + DIAS_AGENDABLES + 2);
    if (Number.isNaN(fecha.getTime()) || fecha < desde || fecha >= hasta) {
      return Response.json({ error: "La fecha está fuera del rango disponible" }, { status: 400 });
    }

    // Una sesión próxima a la vez, igual que el mock (que guardaba una sola
    // `sesion`): para mover la cita hay que cancelar la actual primero.
    const yaAgendada = await prisma.cita.count({
      where: { clienteId, fecha: { gte: desde } },
    });
    if (yaAgendada > 0) {
      throw new ClienteError(409, "Ya tienes una sesión agendada");
    }

    const cita = await prisma.cita.create({
      data: {
        clienteId,
        fecha,
        hora: parsed.data.hora,
        modalidad:
          parsed.data.modalidad === "Virtual" ? Modalidad.VIRTUAL : Modalidad.PRESENCIAL,
      },
    });

    await Promise.all([
      invalidateCache(CACHE_KEYS.citasPattern),
      invalidateCache(CACHE_KEYS.dashboardPattern),
    ]);

    return Response.json(
      {
        cita: {
          id: cita.id,
          fecha: parsed.data.fecha,
          hora: cita.hora,
          modalidad: parsed.data.modalidad,
          estado: cita.estado === "CONFIRMADA" ? "confirmada" : "pendiente",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
