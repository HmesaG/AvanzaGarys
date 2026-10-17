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
    await requireRole(Rol.ADMINISTRADOR, Rol.SECRETARIA);

    const pagos = await db.pago.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        cliente: {
          include: {
            usuario: { select: { nombre: true, email: true } },
          },
        },
      },
    });

    const encabezados = [
      "ID Pago",
      "Fecha Creación",
      "Fecha Pago",
      "Cliente",
      "Email Cliente",
      "Teléfono",
      "Concepto",
      "Método",
      "Monto (RD$)",
      "Estado",
      "Comprobante Adjunto",
    ];

    const filas = pagos.map((pago) => {
      const fechaCreacion = new Date(pago.createdAt).toLocaleDateString("es-DO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const fechaPago = pago.fechaPago
        ? new Date(pago.fechaPago).toLocaleDateString("es-DO", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        : "Pendiente";

      return [
        escaparCsv(pago.id),
        escaparCsv(fechaCreacion),
        escaparCsv(fechaPago),
        escaparCsv(pago.cliente.usuario.nombre),
        escaparCsv(pago.cliente.usuario.email),
        escaparCsv(pago.cliente.telefono || "N/A"),
        escaparCsv(pago.concepto || "Programa de Coaching AvanzA"),
        escaparCsv(pago.metodo || "No especificado"),
        escaparCsv(pago.monto.toString()),
        escaparCsv(pago.estado),
        escaparCsv(pago.comprobanteUrl || "Sin comprobante"),
      ].join(",");
    });

    const csvConBom = "\uFEFF" + [encabezados.join(","), ...filas].join("\r\n");
    const fechaActual = new Date().toISOString().split("T")[0];

    return new Response(csvConBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte-pagos-avanza-${fechaActual}.csv"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return manejarError(error);
  }
}
