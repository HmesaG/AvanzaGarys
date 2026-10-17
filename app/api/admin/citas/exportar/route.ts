import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { manejarError } from "@/lib/http";
import { Rol } from "@/generated/prisma/client";

function escaparCsv(valor: string | null | undefined): string {
  if (!valor) return '""';
  const texto = String(valor).replace(/"/g, '""').replace(/\r?\n/g, " ");
  return `"${texto}"`;
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const searchParams = request.nextUrl.searchParams;

    const filtroCoachId = usuario.rol === Rol.COACH ? usuario.id : searchParams.get("coachId") || undefined;

    const citas = await db.cita.findMany({
      where: {
        ...(filtroCoachId ? { coachId: filtroCoachId } : {}),
      },
      orderBy: { fecha: "desc" },
      include: {
        cliente: {
          include: {
            usuario: { select: { nombre: true, email: true } },
          },
        },
        coach: { select: { id: true, nombre: true, email: true } },
      },
    });

    const encabezados = [
      "ID Cita",
      "Fecha Sesión",
      "Hora Inicio",
      "Nombre del Coachee",
      "Email Coachee",
      "Teléfono Coachee",
      "Línea de Coaching",
      "Coach Asignado",
      "Modalidad",
      "Enlace de Reunión / Sala",
      "Estado de la Cita",
      "Horas Computadas (ICF)",
      "Bitácora y Observaciones",
    ];

    const filas = citas.map((cita) => {
      const fecha = new Date(cita.fecha);
      const fechaFormateada = fecha.toLocaleDateString("es-DO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const horaFormateada = fecha.toLocaleTimeString("es-DO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const enlace =
        cita.enlaceReunion ||
        (cita.modalidad === "Virtual"
          ? `https://meet.jit.si/Avanza-Coaching-${cita.id}`
          : "Oficinas AvanzA");

      return [
        escaparCsv(cita.id),
        escaparCsv(fechaFormateada),
        escaparCsv(horaFormateada),
        escaparCsv(cita.cliente.usuario.nombre),
        escaparCsv(cita.cliente.usuario.email),
        escaparCsv(cita.cliente.telefono || "N/A"),
        escaparCsv(cita.cliente.linea),
        escaparCsv(cita.coach?.nombre || "No asignado"),
        escaparCsv(cita.modalidad),
        escaparCsv(enlace),
        escaparCsv(cita.estado),
        escaparCsv("1.0"),
        escaparCsv(cita.notas || "Sin notas registradas"),
      ].join(",");
    });

    const csvConBom = "\uFEFF" + [encabezados.join(","), ...filas].join("\r\n");
    const fechaActual = new Date().toISOString().split("T")[0];

    return new Response(csvConBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="coaching-log-icf-${fechaActual}.csv"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return manejarError(error);
  }
}
