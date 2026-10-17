// Suite de pruebas E2E automatizadas para AvanzA
// Ejecuta verificaciones completas de todos los subsistemas en caliente.

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3005";

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 INICIANDO SUITE DE PRUEBAS E2E (AvanzA Platform)`);
  console.log(`📍 URL Base: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let pasadas = 0;
  let fallidas = 0;

  async function test(nombre, fn) {
    process.stdout.write(`🔹 [TEST] ${nombre}... `);
    try {
      await fn();
      console.log(`✅ PASÓ`);
      pasadas++;
    } catch (err) {
      console.log(`❌ FALLÓ`);
      console.error(`   Error: ${err.message}\n`);
      fallidas++;
    }
  }

  // 1. Healthcheck
  await test("1. Healthcheck (/api/health) con MariaDB y Redis", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.estado !== "saludable") throw new Error(`Estado no saludable: ${JSON.stringify(data)}`);
    if (data.servicios.baseDatos.estado !== "ok") throw new Error("MariaDB reportó error");
    if (data.servicios.redis.estado !== "ok") throw new Error("Redis reportó error");
  });

  // 2. Login Administrador
  let adminCookie = "";
  await test("2. Autenticación Administrador (/api/auth/login)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: BASE_URL },
      body: JSON.stringify({ correo: "admin@avanza.dev", password: "Avanza2026!" }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie || !setCookie.includes("avanza_session=")) {
      throw new Error("No se emitió la cookie avanza_session");
    }
    adminCookie = setCookie.split(";")[0];
    const data = await res.json();
    if (data.usuario?.rol !== "ADMINISTRADOR") throw new Error(`Rol inesperado: ${data.usuario?.rol}`);
  });

  // 3. Acceso a Panel Admin protegido
  await test("3. Acceso y Render del Panel de Control (/admin)", async () => {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminCookie },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    if (!html.includes("Panel de Control") && !html.includes("Avanza")) {
      throw new Error("HTML no contiene el título del panel de administración");
    }
  });

  // 4. Centro de Alertas Prioritarias
  await test("4. Centro de Alertas Prioritarias (/api/admin/alertas)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/alertas`, {
      headers: { Cookie: adminCookie },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.alertas || !Array.isArray(data.alertas.items)) {
      throw new Error("Respuesta no incluye objeto de alertas con items");
    }
  });

  // 5. Login Cliente
  let clienteCookie = "";
  await test("5. Autenticación Cliente (/api/auth/login)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: BASE_URL },
      body: JSON.stringify({ correo: "luis@avanza.local", password: "Avanza2026!" }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    clienteCookie = setCookie.split(";")[0];
    const data = await res.json();
    if (data.usuario?.rol !== "CLIENTE") throw new Error(`Rol inesperado: ${data.usuario?.rol}`);
  });

  // 6. Estado del Cliente
  await test("6. Estado y Programa del Cliente (/api/cliente/estado)", async () => {
    const res = await fetch(`${BASE_URL}/api/cliente/estado`, {
      headers: { Cookie: clienteCookie },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.estado?.linea) throw new Error("No devolvió la línea de coaching en estado");
  });

  // 7. Copiloto IA en Mensajes
  await test("7. Copiloto IA de Coaching (/api/cliente/mensajes/ia-copiloto)", async () => {
    const res = await fetch(`${BASE_URL}/api/cliente/mensajes/ia-copiloto`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: clienteCookie },
      body: JSON.stringify({
        mensajesRecientes: [
          { remitente: "Coach", texto: "¿Cómo te fue con tu meta de productividad esta semana?" },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.sugerencia || data.sugerencia.length < 10) {
      throw new Error(`Sugerencia de IA inválida: ${JSON.stringify(data)}`);
    }
  });

  // 8. Cron de Recordatorios y Notificaciones por Correo
  await test("8. Motor Cron de Recordatorios (/api/cron/recordatorios)", async () => {
    const res = await fetch(`${BASE_URL}/api/cron/recordatorios`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.exito || !data.resumen) throw new Error("Respuesta cron inválida");
  });

  console.log(`\n======================================================`);
  console.log(`📊 RESULTADOS: ${pasadas} Pasadas | ${fallidas} Fallidas`);
  console.log(`======================================================\n`);

  if (fallidas > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fallo general:", err);
  process.exit(1);
});
