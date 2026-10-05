export type Sexo = "hembra" | "macho";
export type EstadoAnimal = "activo" | "vendido" | "muerto" | "descartado";
export type CategoriaAnimal =
  | "ternero"
  | "ternera"
  | "novillo"
  | "novilla"
  | "vaca"
  | "toro";

export interface Animal {
  id: string;
  nroIdentificacion: string;
  nombre?: string;
  sexo: Sexo;
  raza: string;
  fechaNacimiento: string; // ISO date
  fechaNacimientoAprox?: boolean;
  madreId?: string;
  padreId?: string;
  madreNombre?: string; // texto libre para padres fuera del hato
  padreNombre?: string;
  categoria: CategoriaAnimal;
  estado: EstadoAnimal;
  potreroId?: string;
  propietarioId?: string;
  fotoUrl?: string;
  notas?: string;
  createdAt: string;
}

export interface Potrero {
  id: string;
  nombre: string;
  areaHectareas: number;
  capacidad: number;
  notas?: string;
  createdAt: string;
}

export type TipoSanidad =
  | "vacuna"
  | "tratamiento"
  | "desparasitacion"
  | "revision";

export interface SanidadEvento {
  id: string;
  animalId: string;
  tipo: TipoSanidad;
  producto: string;
  dosis?: string;
  fecha: string;
  proximoEventoFecha?: string;
  veterinario?: string;
  costo?: number;
  notas?: string;
  completada?: boolean;
  completadaFecha?: string;
  createdAt: string;
}

export type TipoServicio = "monta_natural" | "inseminacion";
export type ResultadoServicio = "pendiente" | "prenada" | "vacia";

export interface ServicioReproductivo {
  id: string;
  completada?: boolean;
  completadaFecha?: string;
  hembraId: string;
  machoIdOReferencia: string;
  tipo: TipoServicio;
  fechaServicio: string;
  fechaDiagnostico?: string;
  resultado: ResultadoServicio;
  fechaProbableParto?: string;
  notas?: string;
  createdAt: string;
}

export interface Parto {
  id: string;
  madreId: string;
  fecha: string;
  terneroId?: string; // referencia al animal creado
  pesoTerneroKg?: number;
  sexoTernero?: Sexo;
  complicaciones?: string;
  notas?: string;
  createdAt: string;
}

export type TipoPesaje = "nacimiento" | "destete" | "periodico" | "venta";

export interface Pesaje {
  id: string;
  animalId: string;
  fecha: string;
  pesoKg: number;
  tipo: TipoPesaje;
  notas?: string;
  createdAt: string;
}

export interface ProduccionLeche {
  id: string;
  animalId: string;
  fecha: string;
  litrosManana: number;
  litrosTarde: number;
  notas?: string;
  createdAt: string;
}

export type CategoriaGasto =
  | "alimentacion"
  | "sanidad"
  | "mano_de_obra"
  | "infraestructura"
  | "servicios"
  | "otros";

export type RepartoGasto = "socios" | "cabezas";

export interface Gasto {
  id: string;
  fecha: string;
  categoria: CategoriaGasto;
  concepto: string;
  monto: number;
  proveedor?: string;
  /** Quién adelantó la plata al proveedor. */
  pagadoPor?: string;
  /** Socios que participan del gasto (comparten el costo). */
  participantes?: string[];
  /**
   * IDs de participantes que ya pagaron/reembolsaron su parte a quien puso la
   * plata. El `pagadoPor` cuenta como pagado por defecto si es participante.
   */
  pagadoPorIds?: string[];
  /**
   * Modo de reparto. "socios" (default): partes iguales entre participantes.
   * "cabezas": el gasto se divide entre los propietarios de animalIds
   * proporcional a cuántas cabezas suyas están en la lista.
   */
  repartoPor?: RepartoGasto;
  /** Animales involucrados (usado cuando repartoPor === "cabezas"). */
  animalIds?: string[];
  animalId?: string;
  potreroId?: string;
  notas?: string;
  createdAt: string;
}

export type TipoIngreso = "venta_animal" | "venta_leche" | "otros";

export interface Ingreso {
  id: string;
  fecha: string;
  tipo: TipoIngreso;
  concepto: string;
  monto: number;
  comprador?: string;
  animalId?: string;
  /** Propietario que registró el ingreso (para atribución cuando no hay animalId). */
  registradoPor?: string;
  notas?: string;
  createdAt: string;
}

export interface Propietario {
  id: string;
  nombre: string;
  email: string;
  participacionPct: number;
  authUserId?: string;
}

export type PlanFinca = "ranchero" | "ganadero" | "hacienda";

export interface Finca {
  id: string;
  nombre: string;
  ownerUserId: string;
  plan: PlanFinca;
  timezone: string;
  createdAt: string;
  /** Fin de la prueba gratis de 30 días (null = sin prueba activa/nunca tuvo). */
  trialEndsAt: string | null;
  /** true cuando Rafael confirmó un pago real (manual, hasta que exista Stripe/Wompi/PayU). */
  planPagado: boolean;
  /** Hasta cuándo dura el plan pagado en línea (Bold). null = sin vencimiento (pagos manuales). */
  planPagadoHasta: string | null;
}

export type RolFinca = "owner" | "admin" | "operario" | "viewer";

export interface FincaMiembro {
  id: string;
  fincaId: string;
  userId: string;
  rol: RolFinca;
  activo: boolean;
  invitadoPor?: string;
  createdAt: string;
}

export type PrioridadTarea = "alta" | "media" | "baja";
export type CategoriaTarea =
  | "sanidad"
  | "alimentacion"
  | "manejo"
  | "reproduccion"
  | "infraestructura"
  | "otros";

export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  prioridad: PrioridadTarea;
  categoria: CategoriaTarea;
  completada: boolean;
  completadaFecha?: string;
  /** @deprecated usar animalIds */
  animalId?: string;
  animalIds?: string[];
  potreroId?: string;
  /** @deprecated usar asignadoAIds */
  asignadoAId?: string;
  asignadoAIds?: string[];
  createdAt: string;
}

export type UnidadInsumo =
  | "kg"
  | "g"
  | "lt"
  | "ml"
  | "un"
  | "dosis"
  | "bulto"
  | "rollo";

export type CategoriaInsumo =
  | "alimentacion"
  | "sanidad"
  | "infraestructura"
  | "aseo"
  | "otros";

export interface Insumo {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: UnidadInsumo;
  stock: number;
  minimo: number;
  costoUnitario?: number;
  proveedor?: string;
  notas?: string;
  createdAt: string;
}

export type TipoMovimientoInsumo = "entrada" | "salida" | "ajuste";

export interface MovimientoInsumo {
  id: string;
  insumoId: string;
  fecha: string;
  tipo: TipoMovimientoInsumo;
  cantidad: number;
  costoTotal?: number;
  motivo?: string;
  animalId?: string;
  potreroId?: string;
  hechoPorId?: string;
  createdAt: string;
}

export interface DBState {
  animales: Animal[];
  potreros: Potrero[];
  sanidad: SanidadEvento[];
  servicios: ServicioReproductivo[];
  partos: Parto[];
  pesajes: Pesaje[];
  leche: ProduccionLeche[];
  gastos: Gasto[];
  ingresos: Ingreso[];
  propietarios: Propietario[];
  tareas: Tarea[];
  insumos: Insumo[];
  movimientosInsumo: MovimientoInsumo[];
}

export const CATEGORIAS_GASTO: { value: CategoriaGasto; label: string }[] = [
  { value: "alimentacion", label: "Alimentación" },
  { value: "sanidad", label: "Sanidad" },
  { value: "mano_de_obra", label: "Mano de obra" },
  { value: "infraestructura", label: "Infraestructura" },
  { value: "servicios", label: "Servicios" },
  { value: "otros", label: "Otros" },
];

export const CATEGORIAS_ANIMAL: { value: CategoriaAnimal; label: string }[] = [
  { value: "ternero", label: "Ternero" },
  { value: "ternera", label: "Ternera" },
  { value: "novillo", label: "Novillo" },
  { value: "novilla", label: "Novilla" },
  { value: "vaca", label: "Vaca" },
  { value: "toro", label: "Toro" },
];

export const TIPOS_SANIDAD: { value: TipoSanidad; label: string }[] = [
  { value: "vacuna", label: "Vacuna" },
  { value: "tratamiento", label: "Tratamiento" },
  { value: "desparasitacion", label: "Desparasitación" },
  { value: "revision", label: "Revisión" },
];

export const CATEGORIAS_TAREA: { value: CategoriaTarea; label: string }[] = [
  { value: "sanidad", label: "Sanidad" },
  { value: "alimentacion", label: "Alimentación" },
  { value: "manejo", label: "Manejo" },
  { value: "reproduccion", label: "Reproducción" },
  { value: "infraestructura", label: "Infraestructura" },
  { value: "otros", label: "Otros" },
];

export const PRIORIDADES_TAREA: { value: PrioridadTarea; label: string }[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

export const CATEGORIAS_INSUMO: { value: CategoriaInsumo; label: string }[] = [
  { value: "alimentacion", label: "Alimentación" },
  { value: "sanidad", label: "Sanidad" },
  { value: "infraestructura", label: "Infraestructura" },
  { value: "aseo", label: "Aseo" },
  { value: "otros", label: "Otros" },
];

export const UNIDADES_INSUMO: { value: UnidadInsumo; label: string }[] = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lt", label: "L" },
  { value: "ml", label: "ml" },
  { value: "un", label: "un" },
  { value: "dosis", label: "dosis" },
  { value: "bulto", label: "bulto" },
  { value: "rollo", label: "rollo" },
];
