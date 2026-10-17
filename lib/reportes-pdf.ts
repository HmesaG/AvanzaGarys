// Utilidad para exportación y descarga de Informes Ejecutivos en PDF
//
// Genera un documento imprimible estilizado, optimizado para guardar como PDF
// en cualquier navegador con formato membretado oficial, sin barras de navegación ni ruido.

export type DatosInformeCliente = {
  nombreCliente: string;
  emailCliente: string;
  programaNombre: string;
  progresoPorcentaje: number;
  totalTareas: number;
  tareasCompletadas: number;
  fechaGeneracion: string;
  lineaCoaching?: string;
  tareas: Array<{ label: string; completada: boolean }>;
  compromisosGrow?: Array<{ accion: string; fechaPrevista: string; estado: string }>;
};

export type DatosInformeEmpresa = {
  empresaNombre: string;
  ruc?: string | null;
  telefono?: string | null;
  totalClientes: number;
  clientesActivos: number;
  promedioProgreso: number;
  fechaGeneracion: string;
  diagnostico?: {
    climaLaboral: string;
    principalDesafio: string;
    nivelComunicacion: string;
    objetivoEmpresa: string;
  } | null;
  colaboradores: Array<{
    nombre: string;
    email: string;
    programa: string;
    progreso: number;
  }>;
};

export function exportarInformeClientePDF(datos: DatosInformeCliente) {
  const contenido = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe de Progreso - ${datos.nombreCliente}</title>
      <style>
        @page { size: A4 portrait; margin: 20mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .logo-title {
          font-size: 24px;
          font-weight: 800;
          color: #0284c7;
          margin: 0;
        }
        .logo-sub {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        .meta-date {
          text-align: right;
          font-size: 12px;
          color: #64748b;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin: 24px 0 12px 0;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
        }
        .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .kpi-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          font-size: 13px;
        }
        th {
          background: #f1f5f9;
          text-align: left;
          padding: 10px;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #cbd5e1;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-done { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="logo-title">AvanzA Coaching</h1>
          <div class="logo-sub">Informe Oficial de Progreso y Desempeño</div>
        </div>
        <div class="meta-date">
          <div><strong>Fecha:</strong> ${datos.fechaGeneracion}</div>
          <div><strong>Línea:</strong> ${datos.lineaCoaching || "Personal / Ejecutivo"}</div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 20px; margin: 0 0 4px 0;">${datos.nombreCliente}</h2>
        <div style="font-size: 13px; color: #64748b;">${datos.emailCliente} · Programa: <strong>${datos.programaNombre}</strong></div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Progreso Global</div>
          <div class="kpi-value">${datos.progresoPorcentaje}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Tareas Completadas</div>
          <div class="kpi-value">${datos.tareasCompletadas} / ${datos.totalTareas}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Efectividad de Ejecución</div>
          <div class="kpi-value">${datos.totalTareas > 0 ? Math.round((datos.tareasCompletadas / datos.totalTareas) * 100) : 0}%</div>
        </div>
      </div>

      <div class="section-title">Registro de Hitos y Tareas</div>
      <table>
        <thead>
          <tr>
            <th>Hito / Acción Clave</th>
            <th style="width: 120px; text-align: center;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${datos.tareas
            .map(
              (t) => `
            <tr>
              <td>${t.label}</td>
              <td style="text-align: center;">
                <span class="badge ${t.completada ? "badge-done" : "badge-pending"}">
                  ${t.completada ? "Completado" : "En proceso"}
                </span>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      ${
        datos.compromisosGrow && datos.compromisosGrow.length > 0
          ? `
        <div class="section-title">Compromisos Acordados (Metodología GROW)</div>
        <table>
          <thead>
            <tr>
              <th>Acción SMART</th>
              <th style="width: 140px;">Fecha Prevista</th>
              <th style="width: 100px; text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${datos.compromisosGrow
              .map(
                (c) => `
              <tr>
                <td>${c.accion}</td>
                <td>${c.fechaPrevista}</td>
                <td style="text-align: center;">
                  <span class="badge ${c.estado === "CUMPLIDO" ? "badge-done" : "badge-pending"}">
                    ${c.estado}
                  </span>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `
          : ""
      }

      <div class="footer">
        Documento generado automáticamente por AvanzA Coaching Platform · www.avanzacoaching.dev
      </div>
    </body>
    </html>
  `;

  abrirVentanaImpresion(contenido);
}

export function exportarInformeEmpresaPDF(datos: DatosInformeEmpresa) {
  const contenido = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe Organizacional - ${datos.empresaNombre}</title>
      <style>
        @page { size: A4 landscape; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .logo-title { font-size: 24px; font-weight: 800; color: #0284c7; margin: 0; }
        .logo-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
        .meta-date { text-align: right; font-size: 12px; color: #64748b; }
        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          margin: 20px 0 10px 0;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
        }
        .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .kpi-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        th {
          background: #f1f5f9;
          text-align: left;
          padding: 9px 12px;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #cbd5e1;
        }
        td {
          padding: 9px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .progress-bar-bg {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 4px;
        }
        .progress-bar-fill {
          height: 100%;
          background: #0284c7;
        }
        .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="logo-title">AvanzA Coaching Corporativo</h1>
          <div class="logo-sub">Informe Ejecutivo de Desempeño y Cartera de Colaboradores</div>
        </div>
        <div class="meta-date">
          <div><strong>Fecha:</strong> ${datos.fechaGeneracion}</div>
          <div><strong>RUC/NIT:</strong> ${datos.ruc || "N/A"}</div>
        </div>
      </div>

      <h2 style="font-size: 18px; margin: 0 0 16px 0;">Empresa: ${datos.empresaNombre}</h2>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Colaboradores en Proceso</div>
          <div class="kpi-value">${datos.totalClientes}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Programas Activos</div>
          <div class="kpi-value">${datos.clientesActivos}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Progreso Promedio</div>
          <div class="kpi-value">${datos.promedioProgreso}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Índice de Retención</div>
          <div class="kpi-value">100%</div>
        </div>
      </div>

      ${
        datos.diagnostico
          ? `
        <div class="section-title">Diagnóstico de Clima y Objetivos Organizacionales</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px;">
          <div><strong>Clima Laboral:</strong> ${datos.diagnostico.climaLaboral}</div>
          <div><strong>Nivel de Comunicación:</strong> ${datos.diagnostico.nivelComunicacion}</div>
          <div><strong>Principal Desafío:</strong> ${datos.diagnostico.principalDesafio}</div>
          <div><strong>Objetivo Corporativo:</strong> ${datos.diagnostico.objetivoEmpresa}</div>
        </div>
      `
          : ""
      }

      <div class="section-title">Detalle de Colaboradores</div>
      <table>
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Correo Electrónico</th>
            <th>Programa Asignado</th>
            <th style="width: 160px;">Avance</th>
          </tr>
        </thead>
        <tbody>
          ${datos.colaboradores
            .map(
              (c) => `
            <tr>
              <td><strong>${c.nombre}</strong></td>
              <td>${c.email}</td>
              <td>${c.programa}</td>
              <td>
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600;">
                  <span>${c.progreso}%</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${c.progreso}%;"></div>
                </div>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div class="footer">
        Informe confidencial generado para ${datos.empresaNombre} por AvanzA Coaching Platform
      </div>
    </body>
    </html>
  `;

  abrirVentanaImpresion(contenido);
}

function abrirVentanaImpresion(html: string) {
  const ventana = window.open("", "_blank");
  if (!ventana) {
    alert("Permite las ventanas emergentes para descargar el informe en PDF.");
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => {
    ventana.print();
  }, 350);
}
