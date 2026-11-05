// Singleton de Redis con soporte dual:
// 1. ioredis (cuando REDIS_URL apunta a un servidor Redis real, ej. Docker / VPS).
// 2. Almacén en memoria con TTL en globalThis (cuando REDIS_URL="memory" o no está
//    definida, ej. Hostinger Web/Cloud Hosting hPanel o fase de compilación `next build`).
import Redis from "ioredis";

export interface ClienteRedisCompatible {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: "EX",
    durationSeconds?: number,
  ): Promise<"OK" | null>;
  del(...keys: string[]): Promise<number>;
  eval(
    script: string,
    numKeys: number,
    key: string,
    ventanaSegundos: number | string,
  ): Promise<[number, number]>;
  ping(): Promise<string>;
}

type EntradaMemoria = {
  valor: string;
  expiraEn: number | null;
};

const globalForRedis = globalThis as unknown as {
  redis: ClienteRedisCompatible | undefined;
  redisMemoryStore: Map<string, EntradaMemoria> | undefined;
};

function obtenerStoreMemoria(): Map<string, EntradaMemoria> {
  if (!globalForRedis.redisMemoryStore) {
    globalForRedis.redisMemoryStore = new Map<string, EntradaMemoria>();
  }
  return globalForRedis.redisMemoryStore;
}

class RedisEnMemoria implements ClienteRedisCompatible {
  private get store(): Map<string, EntradaMemoria> {
    return obtenerStoreMemoria();
  }

  async get(key: string): Promise<string | null> {
    const entrada = this.store.get(key);
    if (!entrada) return null;
    if (entrada.expiraEn !== null && Date.now() >= entrada.expiraEn) {
      this.store.delete(key);
      return null;
    }
    return entrada.valor;
  }

  async set(
    key: string,
    value: string,
    mode?: "EX",
    durationSeconds?: number,
  ): Promise<"OK" | null> {
    const expiraEn =
      mode === "EX" && durationSeconds
        ? Date.now() + Number(durationSeconds) * 1000
        : null;
    this.store.set(key, { valor: value, expiraEn });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let eliminadas = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        eliminadas += 1;
      }
    }
    return eliminadas;
  }

  async eval(
    _script: string,
    _numKeys: number,
    key: string,
    ventanaSegundos: number | string,
  ): Promise<[number, number]> {
    const ahora = Date.now();
    const ventanaMs = Number(ventanaSegundos) * 1000;
    const actual = this.store.get(key);

    let conteo: number;
    let expiraEn: number;

    if (!actual || (actual.expiraEn !== null && ahora >= actual.expiraEn)) {
      conteo = 1;
      expiraEn = ahora + ventanaMs;
    } else {
      conteo = (Number(actual.valor) || 0) + 1;
      expiraEn = actual.expiraEn ?? ahora + ventanaMs;
    }

    this.store.set(key, { valor: String(conteo), expiraEn });
    const ttl = Math.max(1, Math.ceil((expiraEn - ahora) / 1000));
    return [conteo, ttl];
  }

  async ping(): Promise<string> {
    return "PONG";
  }
}

function crearCliente(): ClienteRedisCompatible {
  const url = process.env.REDIS_URL?.trim();

  if (
    !url ||
    url === "memory" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return new RedisEnMemoria();
  }

  const cliente = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  // ioredis emite 'error' de forma asíncrona; sin listener Node tumba el proceso.
  cliente.on("error", (error) => {
    console.error("[redis] error de conexión:", error.message);
  });

  return cliente as unknown as ClienteRedisCompatible;
}

export const redis: ClienteRedisCompatible =
  globalForRedis.redis ?? crearCliente();

globalForRedis.redis = redis;

