import { db } from "./prisma";
import { EstadoPago, EstadoPlanGrow, EstadoCompromiso } from "../generated/prisma/client";

export type AlertaItem = {
  id: string;
  tipo: "EVALUACION_ATRASADA" | "COMPROMISO_GROW_VENCIDO" | "CLIENTE_INACTIVO" | "PAGO_PENDIENTE";
  titulo: string;
  descripcion: string;
  severidad: "urgente" | "atencion" | "informativa";
  enlace: string;
  clienteId?: string;
  clienteNombre?: string;
  fechaReferencia: string;
};

export type ResumenAlertas = {
  total: number;
  urgentes: number;
  atencion: number;
  items: AlertaItem[];
};

export async function obtenerAlertasSistema(coachId?: string): Promise<ResumenAlertas> {
  const ahora = new Date();
  const hace24Horas = new Date(ahora.getTime() - 24 * 3600 * 1000);
  const hace14Dias = new Date(ahora.getTime() - 14 * 24 * 3600 * 1000);
  const hace3Dias = new Date(ahora.getTime() - 3 * 24 * 3600 * 1000);

  const items: AlertaItem[] = [];

  // 1. Evaluaciones pendientes atrasadas (> 24h)
  const evAtrasadas = await db.evaluacion.findMany({
    where: {
      revisadaPorId: null,
      createdAt: { lte: hace24Horas },
    },
    include: { cliente: { include: { usuario: true } } },
    orderBy: { createdAt: "asc" },
  });

  for (const ev of evAtrasadas) {
    items.push({
      id: `ev-${ev.id}`,
      tipo: "EVALUACION_ATRASADA",
      titulo: "Evaluación pendiente de revisión",
      descripcion: `${ev.cliente.usuario.nombre} envió su evaluación hace más de 24 horas y espera asignación de programa.`,
      severidad: "urgente",
      enlace: `/admin`,
      clienteId: ev.clienteId,
      clienteNombre: ev.cliente.usuario.nombre,
      fechaReferencia: ev.createdAt.toISOString(),
    });
  }

  // 2. Compromisos GROW vencidos
  const compromisosVencidos = await db.compromisoGrow.findMany({
    where: {
      estado: EstadoCompromiso.PENDIENTE,
      fechaPrevista: { lt: ahora },
      sesion: {
        plan: {
          estado: { in: [EstadoPlanGrow.ACTIVO, EstadoPlanGrow.EN_SEGUIMIENTO] },
          ...(coachId ? { cliente: { coachId } } : {}),
        },
      },
    },
    include: {
      sesion: {
        include: {
          plan: {
            include: {
              cliente: { include: { usuario: true } },
            },
          },
        },
      },
    },
  });

  for (const comp of compromisosVencidos) {
    const cliente = comp.sesion.plan.cliente;
    items.push({
      id: `grow-${comp.id}`,
      tipo: "COMPROMISO_GROW_VENCIDO",
      titulo: "Compromiso GROW vencido sin reportar",
      descripcion: `${cliente.usuario.nombre}: "${comp.accion.slice(0, 50)}..." tenía fecha límite vencida.`,
      severidad: "atencion",
      enlace: `/admin/planes-grow`,
      clienteId: cliente.id,
      clienteNombre: cliente.usuario.nombre,
      fechaReferencia: comp.fechaPrevista.toISOString(),
    });
  }

  // 3. Clientes con programa activo sin citas programadas
  const clientesActivos = await db.cliente.findMany({
    where: {
      programas: { some: { activo: true, consentimientoAceptado: true } },
      pagos: { some: { estado: EstadoPago.PAGADO } },
      ...(coachId ? { coachId } : {}),
    },
    include: {
      usuario: true,
      citas: {
        where: { fecha: { gte: ahora }, estado: { not: "CANCELADA" } },
      },
    },
  });

  for (const c of clientesActivos) {
    if (c.citas.length === 0) {
      items.push({
        id: `inactivo-${c.id}`,
        tipo: "CLIENTE_INACTIVO",
        titulo: "Cliente activo sin próxima sesión agendada",
        descripcion: `${c.usuario.nombre} tiene su programa activo pero aún no ha reservado su próxima sesión.`,
        severidad: "atencion",
        enlace: `/admin/clientes`,
        clienteId: c.id,
        clienteNombre: c.usuario.nombre,
        fechaReferencia: ahora.toISOString(),
      });
    }
  }

  // 4. Pagos pendientes de más de 3 días
  const pagosViejos = await db.pago.findMany({
    where: {
      estado: EstadoPago.PENDIENTE,
      createdAt: { lte: hace3Dias },
      ...(coachId ? { cliente: { coachId } } : {}),
    },
    include: { cliente: { include: { usuario: true } } },
  });

  for (const p of pagosViejos) {
    items.push({
      id: `pago-${p.id}`,
      tipo: "PAGO_PENDIENTE",
      titulo: "Pago pendiente de regularizar",
      descripcion: `${p.cliente.usuario.nombre} tiene un pago pendiente por RD$ ${p.monto}.`,
      severidad: "informativa",
      enlace: `/admin/clientes`,
      clienteId: p.clienteId,
      clienteNombre: p.cliente.usuario.nombre,
      fechaReferencia: p.createdAt.toISOString(),
    });
  }

  const urgentes = items.filter((i) => i.severidad === "urgente").length;
  const atencion = items.filter((i) => i.severidad === "atencion").length;

  return {
    total: items.length,
    urgentes,
    atencion,
    items,
  };
}
