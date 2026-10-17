import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  const inicio = performance.now();
  const checks: Record<string, { estado: "ok" | "error"; latenciaMs?: number; error?: string }> = {};

  // 1. Healthcheck MariaDB
  const t0Db = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.baseDatos = {
      estado: "ok",
      latenciaMs: Math.round(performance.now() - t0Db),
    };
  } catch (err: unknown) {
    checks.baseDatos = {
      estado: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 2. Healthcheck Redis
  const t0Redis = performance.now();
  try {
    const pong = await redis.ping();
    checks.redis = {
      estado: pong === "PONG" ? "ok" : "error",
      latenciaMs: Math.round(performance.now() - t0Redis),
    };
  } catch (err: unknown) {
    checks.redis = {
      estado: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const todoOk = Object.values(checks).every((c) => c.estado === "ok");
  const latenciaTotal = Math.round(performance.now() - inicio);

  const respuesta = {
    estado: todoOk ? "saludable" : "degradado",
    entorno: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptimeSegundos: Math.round(process.uptime()),
    latenciaTotalMs: latenciaTotal,
    memoriaMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    servicios: checks,
  };

  return NextResponse.json(respuesta, { status: todoOk ? 200 : 503 });
}
