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
  let clienteIdGlobal = "";
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
    clienteIdGlobal = data.usuario?.clienteId || "";
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

  // 9. Directorio y Balance de Carga de Coaches
  let coachIdTest = null;
  let clienteIdTest = null;
  await test("9. Gestión y Asignación de Coaches (/api/admin/coaches)", async () => {
    // GET coaches
    const res = await fetch(`${BASE_URL}/api/admin/coaches`, {
      headers: { Cookie: adminCookie },
    });
    if (!res.ok) throw new Error(`Status GET ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.coaches)) throw new Error("Respuesta no incluye lista de coaches");
    if (data.coaches.length > 0) {
      coachIdTest = data.coaches[0].id;
      if (data.coaches[0].clientes.length > 0) {
        clienteIdTest = data.coaches[0].clientes[0].id;
      }
    }
    if (!clienteIdTest && data.sinAsignar?.length > 0) {
      clienteIdTest = data.sinAsignar[0].id;
    }

    // PATCH con cliente inexistente -> 404
    const res404 = await fetch(`${BASE_URL}/api/admin/coaches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie, origin: BASE_URL },
      body: JSON.stringify({ clienteId: "inexistente_12345", coachId: coachIdTest }),
    });
    if (res404.status !== 404) throw new Error(`Esperado 404 para cliente inexistente, recibido ${res404.status}`);

    // PATCH reasignación exitosa si hay cliente y coach
    if (clienteIdTest && coachIdTest) {
      const resPatch = await fetch(`${BASE_URL}/api/admin/coaches`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: adminCookie, origin: BASE_URL },
        body: JSON.stringify({ clienteId: clienteIdTest, coachId: coachIdTest }),
      });
      if (!resPatch.ok) throw new Error(`Status PATCH reasignar ${resPatch.status}`);
    }
  });

  // 10. Bitácora Confidencial de Citas (ICF)
  await test("10. Bitácora Confidencial de Sesión (/api/admin/citas/[id]/notas)", async () => {
    // Obtener lista de citas
    const resCitas = await fetch(`${BASE_URL}/api/admin/citas`, {
      headers: { Cookie: adminCookie },
    });
    if (!resCitas.ok) throw new Error(`Status GET citas ${resCitas.status}`);
    const dataCitas = await resCitas.json();
    const citaTest = dataCitas.citas?.[0];

    // PATCH cita inexistente -> 404
    const res404 = await fetch(`${BASE_URL}/api/admin/citas/cita_fantasma/notas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie, origin: BASE_URL },
      body: JSON.stringify({ notas: "Nota de prueba" }),
    });
    if (res404.status !== 404) throw new Error(`Esperado 404 para cita fantasma, recibido ${res404.status}`);

    // Si hay cita existente, actualizar bitácora
    if (citaTest) {
      const notaPrueba = `Observación ICF de auditoría: ${new Date().toISOString()}`;
      const resPatch = await fetch(`${BASE_URL}/api/admin/citas/${citaTest.id}/notas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: adminCookie, origin: BASE_URL },
        body: JSON.stringify({ notas: notaPrueba }),
      });
      if (!resPatch.ok) throw new Error(`Status PATCH notas ${resPatch.status}`);
      const dataPatch = await resPatch.json();
      if (dataPatch.cita.notas !== notaPrueba) {
        throw new Error("La nota guardada no coincide con la nota enviada");
      }
    }
  });

  // 11. Chat Bidireccional Coachee <-> Coach/Admin
  await test("11. Chat en Vivo Bidireccional (/api/admin/clientes/[id]/mensajes)", async () => {
    // 1. Cliente envía mensaje
    const textoCliente = `Mensaje de prueba coachee: ${Date.now()}`;
    const resMsgCli = await fetch(`${BASE_URL}/api/cliente/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: clienteCookie, origin: BASE_URL },
      body: JSON.stringify({ texto: textoCliente }),
    });
    if (!resMsgCli.ok) throw new Error(`Status envío mensaje cliente ${resMsgCli.status}`);

    const clienteIdChat = clienteIdGlobal || clienteIdTest;
    if (!clienteIdChat) throw new Error("No se pudo obtener el ID del cliente para el chat");

    // 3. Coach lee la conversación del cliente
    const resGetCoach = await fetch(`${BASE_URL}/api/admin/clientes/${clienteIdChat}/mensajes`, {
      headers: { Cookie: adminCookie },
    });
    if (!resGetCoach.ok) throw new Error(`Status lectura chat por coach ${resGetCoach.status}`);
    const dataChat = await resGetCoach.json();
    const mensajeEncontrado = dataChat.mensajes?.find((m) => m.texto === textoCliente);
    if (!mensajeEncontrado) throw new Error("El mensaje del cliente no apareció en el panel del coach");

    // 4. Coach responde al cliente
    const textoCoach = `Respuesta del Coach: Excelente progreso, nos vemos en sesión. ${Date.now()}`;
    const resMsgCoach = await fetch(`${BASE_URL}/api/admin/clientes/${clienteIdChat}/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie, origin: BASE_URL },
      body: JSON.stringify({ texto: textoCoach }),
    });
    if (!resMsgCoach.ok) throw new Error(`Status respuesta coach ${resMsgCoach.status}`);

    // 5. Cliente verifica que recibió la respuesta del coach
    const resCliVerif = await fetch(`${BASE_URL}/api/cliente/mensajes`, {
      headers: { Cookie: clienteCookie },
    });
    const dataCliVerif = await resCliVerif.json();
    const respuestaEncontrada = dataCliVerif.mensajes?.find((m) => m.texto === textoCoach);
    if (!respuestaEncontrada) throw new Error("La respuesta del coach no llegó a la bandeja del cliente");
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
