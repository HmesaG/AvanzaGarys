import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, jsonOk, leerJson, manejarError, verificarOrigen } from "@/lib/http";
import { crearCitaCliente, listarCitasCliente } from "@/lib/cliente-queries";
import { enviarEmail } from "@/lib/email";
import { fechaValida } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

const MODALIDADES = ["Virtual", "Presencial"] as const;

export async function GET() {
  try {
    const usuario = await requireRole(Rol.CLIENTE);
    const citas = await listarCitasCliente(usuario.clienteId!);
    return jsonOk({ citas });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    verificarOrigen(request);
    const usuario = await requireRole(Rol.CLIENTE);
    const cuerpo = await leerJson(request);

    const fecha = fechaValida(cuerpo.fecha, "fecha");
    const modalidad = cuerpo.modalidad === undefined ? "Virtual" : cuerpo.modalidad;
    if (!MODALIDADES.includes(modalidad as (typeof MODALIDADES)[number])) {
      throw new ApiError(400, "La modalidad debe ser Virtual o Presencial", "campo_invalido");
    }

    const cita = await crearCitaCliente(usuario.clienteId!, { fecha, modalidad: modalidad as string });

    // Enviar confirmación por correo (sin bloquear respuesta si falla)
    const enlaceVirtual = modalidad === "Virtual" ? `https://meet.jit.si/Avanza-Coaching-${cita.id}` : "";
    enviarEmail({
      destinatario: usuario.email,
      nombreDestinatario: usuario.nombre,
      asunto: `Confirmación de cita de coaching (${modalidad})`,
      plantilla: "CONFIRMACION_CITA",
      datos: {
        fecha: new Date(cita.fecha).toLocaleString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        modalidad: cita.modalidad,
        coach: "Coach AvanzA",
        enlaceVirtual,
      },
    }).catch((err) => console.error("[citas] Error enviando email de confirmación:", err));

    return jsonOk({ cita }, 201);
  } catch (error) {
    return manejarError(error);
  }
}
