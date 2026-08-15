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

export type LineaAsesoriaAdmin = "Personal" | "Corporativo" | "Deportivo";

export type ClienteAdmin = {
  id: string;
  nombre: string;
  iniciales: string;
  linea: LineaAsesoriaAdmin;
  telefono: string;
  correo: string;
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

export const CLIENTES_MOCK: ClienteAdmin[] = [
  {
    id: "cl1",
    nombre: "María Fernández",
    iniciales: "MF",
    linea: "Personal",
    telefono: "809-555-1234",
    correo: "maria.fernandez@correo.com",
  },
  {
    id: "cl2",
    nombre: "Luis Ortega",
    iniciales: "LO",
    linea: "Corporativo",
    telefono: "809-555-2211",
    correo: "luis.ortega@correo.com",
  },
  {
    id: "cl3",
    nombre: "Carla Núñez",
    iniciales: "CN",
    linea: "Deportivo",
    telefono: "809-555-7890",
    correo: "carla.nunez@correo.com",
  },
  {
    id: "cl4",
    nombre: "Roberto Peña",
    iniciales: "RP",
    linea: "Personal",
    telefono: "809-555-4432",
    correo: "roberto.pena@correo.com",
  },
  {
    id: "cl5",
    nombre: "Ana Vargas",
    iniciales: "AV",
    linea: "Corporativo",
    telefono: "809-555-6690",
    correo: "ana.vargas@correo.com",
  },
  {
    id: "cl6",
    nombre: "Miguel Castillo",
    iniciales: "MC",
    linea: "Deportivo",
    telefono: "809-555-3345",
    correo: "miguel.castillo@correo.com",
  },
];

export const TODAS_CITAS_MOCK: CitaAdmin[] = [
  ...PROXIMAS_CITAS_MOCK,
  {
    id: "c5",
    clienteId: "cl5",
    clienteNombre: "Ana Vargas",
    clienteIniciales: "AV",
    hora: "10:00 AM",
    modalidad: "Virtual",
    estado: "confirmada",
  },
  {
    id: "c6",
    clienteId: "cl6",
    clienteNombre: "Miguel Castillo",
    clienteIniciales: "MC",
    hora: "05:30 PM",
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
