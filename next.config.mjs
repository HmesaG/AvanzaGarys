/** @type {import('next').NextConfig} */

// Cabeceras de seguridad aplicadas a TODA respuesta (páginas y API).
//
// La CSP permite `unsafe-inline`/`unsafe-eval` en scripts porque Next.js inyecta
// el payload de hidratación inline y en desarrollo usa eval para el HMR;
// endurecerla con nonces exige un middleware con runtime Node.js, que hoy no es
// viable en este proyecto (ver la nota de runtime en `middleware.ts`).
// Aun así bloquea el vector principal: cargar scripts de dominios de terceros.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  // No filtrar la versión del framework en cada respuesta.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
