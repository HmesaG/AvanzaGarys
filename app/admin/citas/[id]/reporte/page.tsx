import { notFound } from "next/navigation";
import { requireSesionPagina } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { formatFechaLarga, formatHora, LINEA_LABEL } from "@/lib/admin-formato";
import { Rol } from "@/generated/prisma/client";
import { Printer, ArrowLeft, ShieldCheck, Award } from "lucide-react";
import Link from "next/link";
import BotonImprimir from "./BotonImprimir";

export default async function ReporteCitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireSesionPagina(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
  const { id } = await params;

  const cita = await db.cita.findUnique({
    where: { id },
    include: {
      cliente: {
        include: {
          usuario: { select: { nombre: true, email: true } },
          empresa: { select: { nombre: true } },
        },
      },
      coach: { select: { id: true, nombre: true, email: true } },
    },
  });

  if (!cita) {
    notFound();
  }

  // Si es coach, verificar que sea su cita
  if (usuario.rol === Rol.COACH && cita.coachId !== usuario.id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 print:bg-white print:p-0">
      {/* Barra superior no imprimible */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <Link
          href="/admin/citas"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Citas
        </Link>

        <BotonImprimir />
      </div>

      {/* Documento / Hoja membretada oficial */}
      <article className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 sm:p-12 shadow-md print:border-none print:shadow-none print:p-6 print:rounded-none">
        {/* Cabecera Membretada */}
        <header className="border-b-2 border-emerald-600 pb-6 mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-avanza-green text-white font-black text-xl">
                A
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900">
                  AvanzA <span className="text-avanza-green">Coaching</span>
                </h1>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Sistema de Desarrollo Humano & Modelo GROW
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Estándar Ético ICF
            </div>
            <p className="mt-1 text-xs text-gray-500">
              ID Registro: <span className="font-mono">{cita.id.slice(-8).toUpperCase()}</span>
            </p>
          </div>
        </header>

        {/* Título del Reporte */}
        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Bitácora Confidencial de Sesión de Coaching
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Registro formal de acuerdos, observaciones clave y compromisos de acción
          </p>
        </section>

        {/* Ficha de Información de la Sesión */}
        <section className="mb-8 grid grid-cols-2 gap-4 rounded-2xl bg-gray-50 p-4 border border-gray-100 text-xs">
          <div>
            <p className="font-semibold text-gray-400 uppercase text-[10px]">Coachee (Cliente):</p>
            <p className="font-bold text-gray-900 text-sm mt-0.5">{cita.cliente.usuario.nombre}</p>
            <p className="text-gray-500">{cita.cliente.usuario.email}</p>
            {cita.cliente.empresa && (
              <p className="text-gray-500 mt-0.5">Empresa: {cita.cliente.empresa.nombre}</p>
            )}
          </div>

          <div>
            <p className="font-semibold text-gray-400 uppercase text-[10px]">Coach a Cargo:</p>
            <p className="font-bold text-gray-900 text-sm mt-0.5">
              {cita.coach ? cita.coach.nombre : "Sin coach asignado"}
            </p>
            {cita.coach && <p className="text-gray-500">{cita.coach.email}</p>}
            <p className="text-emerald-700 font-medium mt-0.5">Línea {LINEA_LABEL[cita.cliente.linea]}</p>
          </div>

          <div className="border-t border-gray-200/60 pt-2">
            <p className="font-semibold text-gray-400 uppercase text-[10px]">Fecha & Hora:</p>
            <p className="font-bold text-gray-800 mt-0.5">
              {formatFechaLarga(cita.fecha)} · {formatHora(cita.fecha)}
            </p>
          </div>

          <div className="border-t border-gray-200/60 pt-2">
            <p className="font-semibold text-gray-400 uppercase text-[10px]">Modalidad & Estado:</p>
            <p className="font-bold text-gray-800 mt-0.5">
              {cita.modalidad} · {cita.estado}
            </p>
          </div>
        </section>

        {/* Contenido de la Bitácora */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2 mb-3">
            Observaciones & Acuerdos de Sesión
          </h3>
          <div className="min-h-[160px] rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {cita.notas ? (
              cita.notas
            ) : (
              <span className="italic text-gray-400">
                No se registraron notas adicionales para esta sesión.
              </span>
            )}
          </div>
        </section>

        {/* Marco de Competencias ICF */}
        <section className="mb-10 rounded-2xl bg-emerald-50/50 p-4 border border-emerald-100 text-xs text-gray-600">
          <div className="flex items-center gap-2 mb-2 font-bold text-emerald-900">
            <Award className="h-4 w-4 text-avanza-green" />
            Marco de Competencias Clave ICF
          </div>
          <p className="text-[11px] leading-relaxed">
            Esta sesión se desarrolló respetando los acuerdos de confidencialidad, presencia de coaching, escucha activa y facilitación del aprendizaje y resultados del cliente.
          </p>
        </section>

        {/* Firmas de Conformidad */}
        <footer className="mt-16 pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="mx-auto w-48 border-b border-gray-400 mb-2"></div>
            <p className="font-bold text-gray-900">{cita.coach ? cita.coach.nombre : "Coach"}</p>
            <p className="text-gray-500 text-[11px]">Coach AvanzA</p>
          </div>

          <div>
            <div className="mx-auto w-48 border-b border-gray-400 mb-2"></div>
            <p className="font-bold text-gray-900">{cita.cliente.usuario.nombre}</p>
            <p className="text-gray-500 text-[11px]">Coachee</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
