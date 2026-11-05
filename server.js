// Punto de entrada HTTP para Hostinger Web/Cloud Hosting (hPanel - Aplicación Node.js)
// En hPanel > Sitios Web > Node.js: configurar "server.js" como Archivo de entrada (Entry file)
const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, hostname, () => {
      console.log(`> AvanzA ejecutándose en http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("[server] Error al iniciar la aplicación Next.js:", err);
    process.exit(1);
  });
