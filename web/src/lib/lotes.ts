import { parseDateLocal, todayISO, ymdLocal } from "./format";
import type { EspecieLote, Lote, RegistroLote, SistemaLote, TipoRegistroLote } from "./types";

// Lotes: aves y cerdos de levante/ceba se llevan por grupo. Cada sistema
// productivo tiene sus registros del día y sus indicadores:
//   ponedoras      → huevos, % de postura, mortalidad, alimento por ave
//   engorde        → peso promedio, conversión, mortalidad, días de ciclo
//   campo          → huevos y aves (gallinas criollas / doble propósito)
//   levante_ceba   → peso promedio, ganancia diaria, conversión
// Las cuentas son las que usa cualquier técnico; no reemplazan su asesoría.

export interface InfoSistema {
  value: SistemaLote;
  especie: EspecieLote;
  nombre: string;
  /** "gallinas", "pollos", "cerdos" para frases. */
  animales: string;
  emoji: string;
  descripcion: string;
  /** Registros que tienen sentido en este sistema, en el orden de los botones. */
  registros: TipoRegistroLote[];
  razas: string[];
  /** Duración típica del ciclo (engorde/ceba), para mostrar "día X de Y". */
  cicloDias?: number;
  /** Peso de salida típico (kg), solo como referencia. */
  pesoSalidaKg?: number;
  edadUnidad: "dias" | "semanas";
}

export const SISTEMAS: InfoSistema[] = [
  {
    value: "ponedoras",
    especie: "aviar",
    nombre: "Gallinas ponedoras",
    animales: "gallinas",
    emoji: "🥚",
    descripcion: "Producción de huevo: postura diaria, alimento y mortalidad.",
    registros: ["huevos", "mortalidad", "alimento", "venta_huevos", "venta", "peso", "otro"],
    razas: ["Hy-Line Brown", "Lohmann Brown", "ISA Brown", "Babcock", "Hy-Line W-36", "Criolla"],
    edadUnidad: "semanas",
  },
  {
    value: "engorde",
    especie: "aviar",
    nombre: "Pollo de engorde",
    animales: "pollos",
    emoji: "🐥",
    descripcion: "Ciclo corto: peso semanal, conversión alimenticia y mortalidad.",
    registros: ["peso", "mortalidad", "alimento", "venta", "otro"],
    razas: ["Ross 308", "Cobb 500", "Hubbard", "Campesino mejorado"],
    cicloDias: 42,
    pesoSalidaKg: 2.6,
    edadUnidad: "dias",
  },
  {
    value: "campo",
    especie: "aviar",
    nombre: "Gallinas de campo",
    animales: "aves",
    emoji: "🐔",
    descripcion: "Criollas o doble propósito: huevos, aves y ventas.",
    registros: ["huevos", "mortalidad", "alimento", "venta_huevos", "venta", "otro"],
    razas: ["Criolla", "Rhode Island Red", "Plymouth Rock", "Isa Brown campesina", "Cuello desnudo"],
    edadUnidad: "semanas",
  },
  {
    value: "levante_ceba",
    especie: "porcino",
    nombre: "Cerdos de levante y ceba",
    animales: "cerdos",
    emoji: "🐖",
    descripcion: "Desde el destete hasta la venta: peso, ganancia diaria y conversión.",
    registros: ["peso", "alimento", "mortalidad", "venta", "otro"],
    razas: ["PIC", "Landrace × Large White", "Duroc cruce", "Pietrain cruce", "Criollo"],
    cicloDias: 150,
    pesoSalidaKg: 105,
    edadUnidad: "dias",
  },
];

export function infoSistema(s: SistemaLote): InfoSistema {
  return SISTEMAS.find((x) => x.value === s) ?? SISTEMAS[0];
}

export const TIPOS_REGISTRO: Record<
  TipoRegistroLote,
  { boton: string; emoji: string; cantidad: string; unidad: string; pideValor: boolean; valorLabel?: string }
> = {
  huevos: { boton: "Huevos de hoy", emoji: "🥚", cantidad: "Huevos recogidos", unidad: "huevos", pideValor: false },
  mortalidad: { boton: "Murieron", emoji: "✝️", cantidad: "¿Cuántos murieron?", unidad: "animales", pideValor: false },
  alimento: { boton: "Alimento", emoji: "🌽", cantidad: "Kilos de alimento", unidad: "kg", pideValor: true, valorLabel: "Costo del alimento (opcional)" },
  peso: { boton: "Peso promedio", emoji: "⚖️", cantidad: "Peso promedio (kg por animal)", unidad: "kg", pideValor: false },
  venta: { boton: "Vendí animales", emoji: "💰", cantidad: "¿Cuántos vendió?", unidad: "animales", pideValor: true, valorLabel: "Valor total de la venta" },
  venta_huevos: { boton: "Vendí huevos", emoji: "🧺", cantidad: "Huevos vendidos", unidad: "huevos", pideValor: true, valorLabel: "Valor total de la venta" },
  otro: { boton: "Otra nota", emoji: "📝", cantidad: "Cantidad (si aplica)", unidad: "", pideValor: false },
};

function diasEntre(desde: string, hasta: string): number {
  const a = parseDateLocal(desde);
  const b = parseDateLocal(hasta);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function suma(regs: RegistroLote[], tipo: TipoRegistroLote): number {
  return regs.filter((r) => r.tipo === tipo).reduce((s, r) => s + (Number(r.cantidad) || 0), 0);
}

export interface Indicadores {
  vivos: number;
  muertos: number;
  vendidos: number;
  /** % de mortalidad sobre los que entraron. */
  mortalidadPct: number;
  edadDias: number;
  diasEnLote: number;
  huevosHoy: number | null;
  huevosSemana: number;
  /** Promedio de los últimos 7 días con registro / aves vivas, en %. */
  posturaPct: number | null;
  alimentoKg: number;
  /** Gramos de alimento por animal por día, últimos 7 días. */
  alimentoGrDia: number | null;
  pesoPromKg: number | null;
  pesoFecha: string | null;
  /** Ganancia diaria de peso (gramos/día) desde el ingreso. */
  gananciaGrDia: number | null;
  /** Kg de alimento por kg de carne producida. */
  conversion: number | null;
  ventas: number;
  costoAlimento: number;
}

export function indicadores(lote: Lote, todos: RegistroLote[], hoy = todayISO()): Indicadores {
  const regs = todos.filter((r) => r.loteId === lote.id);
  const fin = lote.estado === "cerrado" && lote.fechaCierre ? lote.fechaCierre : hoy;
  const muertos = suma(regs, "mortalidad");
  const vendidos = suma(regs, "venta");
  const vivos = Math.max(0, lote.cantidadInicial - muertos - vendidos);
  const diasEnLote = Math.max(0, diasEntre(lote.fechaIngreso, fin));

  const hace7 = (() => {
    const d = parseDateLocal(fin) ?? new Date();
    d.setDate(d.getDate() - 6);
    return ymdLocal(d);
  })();
  const ultimos7 = regs.filter((r) => r.fecha >= hace7 && r.fecha <= fin);

  const huevosRegs = regs.filter((r) => r.tipo === "huevos");
  const huevosHoy = huevosRegs.some((r) => r.fecha === hoy)
    ? huevosRegs.filter((r) => r.fecha === hoy).reduce((s, r) => s + Number(r.cantidad), 0)
    : null;
  const huevos7 = ultimos7.filter((r) => r.tipo === "huevos");
  const diasConHuevos = new Set(huevos7.map((r) => r.fecha)).size;
  const huevosSemana = huevos7.reduce((s, r) => s + Number(r.cantidad), 0);
  const posturaPct = diasConHuevos && vivos ? (huevosSemana / diasConHuevos / vivos) * 100 : null;

  const alimentoKg = suma(regs, "alimento");
  const alim7 = ultimos7.filter((r) => r.tipo === "alimento").reduce((s, r) => s + Number(r.cantidad), 0);
  const alimentoGrDia = alim7 && vivos ? (alim7 * 1000) / 7 / vivos : null;

  const pesos = regs.filter((r) => r.tipo === "peso").sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const ultimoPeso = pesos[pesos.length - 1];
  const pesoPromKg = ultimoPeso ? Number(ultimoPeso.cantidad) : null;
  const pesoFecha = ultimoPeso?.fecha ?? null;

  let gananciaGrDia: number | null = null;
  if (ultimoPeso && lote.pesoIngresoKg != null) {
    const d = diasEntre(lote.fechaIngreso, ultimoPeso.fecha);
    if (d > 0) gananciaGrDia = ((Number(ultimoPeso.cantidad) - lote.pesoIngresoKg) * 1000) / d;
  }

  // Conversión: alimento total / carne producida (lo vivo de hoy más lo que
  // ya se vendió, menos lo que pesaban al entrar). Solo con peso registrado.
  let conversion: number | null = null;
  if (pesoPromKg && alimentoKg > 0) {
    const carne = pesoPromKg * (vivos + vendidos) - (lote.pesoIngresoKg ?? 0) * lote.cantidadInicial;
    if (carne > 0) conversion = alimentoKg / carne;
  }

  const ventas = regs
    .filter((r) => r.tipo === "venta" || r.tipo === "venta_huevos")
    .reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const costoAlimento = regs.filter((r) => r.tipo === "alimento").reduce((s, r) => s + (Number(r.valor) || 0), 0);

  return {
    vivos,
    muertos,
    vendidos,
    mortalidadPct: lote.cantidadInicial ? (muertos / lote.cantidadInicial) * 100 : 0,
    edadDias: lote.edadIngresoDias + diasEnLote,
    diasEnLote,
    huevosHoy,
    huevosSemana,
    posturaPct,
    alimentoKg,
    alimentoGrDia,
    pesoPromKg,
    pesoFecha,
    gananciaGrDia,
    conversion,
    ventas,
    costoAlimento,
  };
}

/** "18 semanas" o "35 días", según cómo se cuenta en ese sistema. */
export function edadTextoLote(dias: number, sistema: SistemaLote): string {
  if (infoSistema(sistema).edadUnidad === "semanas") {
    const s = Math.floor(dias / 7);
    return `${s} semana${s === 1 ? "" : "s"}`;
  }
  return `${dias} día${dias === 1 ? "" : "s"}`;
}

export function fmtNum(n: number, dec = 0): string {
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
}
