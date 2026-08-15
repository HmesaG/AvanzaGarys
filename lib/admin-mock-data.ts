// Datos mock — Panel administrativo (Fase 1, sin backend).
// Los tipos están modelados para mapear 1:1 a futuras tablas MariaDB
// (clientes, citas) cuando llegue la integración real. Por ahora es
// 100% estático — no hay conexión a base de datos.

export type EstadoCita = "confirmada" | "pendiente";

export type CitaAdmin = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteIniciales: string;
  hora: string;
  modalidad: "Virtual" | "Presencial";
  estado: EstadoCita;
};

export type DashboardStats = {
  clientesActivos: number;
  citasHoy: number;
  pendientes: number;
  ingresosMes: number;
};

export const ADMIN_MOCK = {
  nombre: "Héctor",
  rol: "Administrador",
};

export const DASHBOARD_STATS_MOCK: DashboardStats = {
  clientesActivos: 24,
  citasHoy: 5,
  pendientes: 3,
  ingresosMes: 48500,
};

export const PROXIMAS_CITAS_MOCK: CitaAdmin[] = [
  {
    id: "c1",
    clienteId: "cl1",
    clienteNombre: "María Fernández",
    clienteIniciales: "MF",
    hora: "09:00 AM",
    modalidad: "Presencial",
    estado: "confirmada",
  },
  {
    id: "c2",
    clienteId: "cl2",
    clienteNombre: "Luis Ortega",
    clienteIniciales: "LO",
    hora: "11:00 AM",
    modalidad: "Virtual",
    estado: "confirmada",
  },
  {
    id: "c3",
    clienteId: "cl3",
    clienteNombre: "Carla Núñez",
    clienteIniciales: "CN",
    hora: "02:30 PM",
    modalidad: "Virtual",
    estado: "pendiente",
  },
  {
    id: "c4",
    clienteId: "cl4",
    clienteNombre: "Roberto Peña",
    clienteIniciales: "RP",
    hora: "04:00 PM",
    modalidad: "Presencial",
    estado: "pendiente",
  },
];

export function formatIngresos(valor: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0,
  }).format(valor);
}
