import { ymdLocal, parseDateLocal, todayISO } from "./format";
import { uid, nowISO, updateCollection } from "./storage";
import { especieDe, infoEspecie } from "./especies";
import type { Animal, DBState, Especie, SanidadEvento, Tarea, TipoSanidad } from "./types";

// Plan sanitario automático: por cada especie del hato, una lista corta de
// cuidados que se repiten (purga, baños, vacunación, cascos…). Cada cuidado
// activo es UNA actividad pendiente en /tareas con origen
// "plan:<especie>:<item>"; al marcarla hecha se programa la siguiente. Así
// salen en el calendario y en el correo diario "Hoy toca" sin nada extra.
//
// Sin productos, marcas ni dosis: eso lo decide el veterinario.

export interface ItemPlan {
  id: string;
  titulo: string;
  /** Por qué importa, en una frase. */
  detalle: string;
  tipo: TipoSanidad;
  /** Cada cuántos días se repite. */
  cadaDias?: number;
  /** O en meses fijos del año (1-12), como los ciclos oficiales. */
  meses?: number[];
  /** Solo hembras jóvenes y adultas (revisión reproductiva). */
  soloHembras?: boolean;
  /** Si no hay registro anterior, en cuántos días se programa la primera. */
  primeraEnDias: number;
}

const PURGA = (cadaDias: number): ItemPlan => ({
  id: "purga",
  titulo: "Purga (desparasitación)",
  detalle: "Los parásitos le quitan peso y leche sin que se note.",
  tipo: "desparasitacion",
  cadaDias,
  primeraEnDias: 7,
});

const VACUNA_ANUAL: ItemPlan = {
  id: "vacuna-anual",
  titulo: "Vacunación anual",
  detalle: "La que le indique su veterinario para su zona.",
  tipo: "vacuna",
  cadaDias: 365,
  primeraEnDias: 14,
};

const PLAN_RUMIANTE_GRANDE: ItemPlan[] = [
  {
    id: "ciclo-oficial",
    titulo: "Vacunación del ciclo oficial (ICA)",
    detalle: "Dos ciclos al año. Confirme las fechas de su zona con el ICA o su comité.",
    tipo: "vacuna",
    meses: [5, 11],
    primeraEnDias: 0,
  },
  PURGA(120),
  {
    id: "banos",
    titulo: "Baño contra garrapata y mosca",
    detalle: "Cada mes, o según lo que vea en el potrero.",
    tipo: "tratamiento",
    cadaDias: 30,
    primeraEnDias: 7,
  },
  {
    id: "palpacion",
    titulo: "Revisión reproductiva de las hembras",
    detalle: "Saber a tiempo cuál está preñada y cuál está vacía.",
    tipo: "revision",
    cadaDias: 180,
    soloHembras: true,
    primeraEnDias: 30,
  },
];

const PLAN_PEQUENO: ItemPlan[] = [
  PURGA(90),
  {
    id: "pezunas",
    titulo: "Recorte y revisión de pezuñas",
    detalle: "Evita cojeras y pietín.",
    tipo: "revision",
    cadaDias: 90,
    primeraEnDias: 14,
  },
  VACUNA_ANUAL,
];

export const PLANES: Record<Especie, ItemPlan[]> = {
  bovino: PLAN_RUMIANTE_GRANDE,
  bufalino: PLAN_RUMIANTE_GRANDE,
  caprino: PLAN_PEQUENO,
  ovino: PLAN_PEQUENO,
  equino: [
    PURGA(90),
    {
      id: "cascos",
      titulo: "Herraje o recorte de cascos",
      detalle: "Cada 6 a 8 semanas, según el trabajo del animal.",
      tipo: "revision",
      cadaDias: 60,
      primeraEnDias: 14,
    },
    {
      id: "dientes",
      titulo: "Revisión de dientes",
      detalle: "Un diente mal gastado hace que coma menos.",
      tipo: "revision",
      cadaDias: 365,
      primeraEnDias: 30,
    },
    VACUNA_ANUAL,
  ],
};

export function origenPlan(especie: Especie, item: string): string {
  return `plan:${especie}:${item}`;
}

export function leerOrigen(origen?: string): { especie: Especie; item: ItemPlan } | null {
  const m = origen?.match(/^plan:([a-z]+):(.+)$/);
  if (!m) return null;
  const especie = m[1] as Especie;
  const item = PLANES[especie]?.find((i) => i.id === m[2]);
  return item ? { especie, item } : null;
}

function sumarDias(ymd: string, dias: number): string {
  const d = parseDateLocal(ymd) ?? new Date();
  d.setDate(d.getDate() + dias);
  return ymdLocal(d);
}

/** Próximo día 1 de uno de los meses del ciclo, a partir de `desde` (incluido). */
function proximoMesCiclo(meses: number[], desde: string): string {
  const d = parseDateLocal(desde) ?? new Date();
  for (let i = 0; i < 24; i++) {
    const c = new Date(d.getFullYear(), d.getMonth() + i, 1);
    if (!meses.includes(c.getMonth() + 1)) continue;
    // El mes en curso cuenta si el ciclo aún está corriendo (se pone hoy).
    if (i === 0) return desde;
    return ymdLocal(c);
  }
  return desde;
}

/** Animales activos a los que aplica un cuidado. */
export function animalesDelItem(db: DBState, especie: Especie, item: ItemPlan): Animal[] {
  return db.animales.filter(
    (a) =>
      a.estado === "activo" &&
      especieDe(a) === especie &&
      (!item.soloHembras || (a.sexo === "hembra" && (a.categoria === "vaca" || a.categoria === "novilla")))
  );
}

/**
 * Fecha de la primera actividad al activar el plan. Si ya hay un registro de
 * ese tipo de cuidado para esa especie, cuenta desde ahí (y si ya pasó, hoy).
 */
export function primeraFecha(db: DBState, especie: Especie, item: ItemPlan): string {
  const hoy = todayISO();
  if (item.meses) return proximoMesCiclo(item.meses, hoy);
  const ids = new Set(animalesDelItem(db, especie, item).map((a) => a.id));
  const ultima = db.sanidad
    .filter((s) => ids.has(s.animalId) && s.tipo === item.tipo && s.completada !== false && s.fecha <= hoy)
    .map((s) => s.fecha.slice(0, 10))
    .sort()
    .pop();
  if (ultima && item.cadaDias) {
    const siguiente = sumarDias(ultima, item.cadaDias);
    return siguiente < hoy ? hoy : siguiente;
  }
  return sumarDias(hoy, item.primeraEnDias);
}

/** Fecha de la siguiente vez, contando desde el día en que se hizo. */
export function siguienteFecha(item: ItemPlan, hecha: string): string {
  if (item.meses) {
    // El siguiente ciclo, nunca el mismo mes en que se hizo.
    const d = parseDateLocal(hecha) ?? new Date();
    const mesSiguiente = ymdLocal(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    return proximoMesCiclo(item.meses, mesSiguiente);
  }
  return sumarDias(hecha, item.cadaDias ?? 365);
}

export function nuevaTareaPlan(especie: Especie, item: ItemPlan, fecha: string): Tarea {
  const e = infoEspecie(especie);
  return {
    id: uid(),
    titulo: `${e.emoji} ${item.titulo} · ${e.plural.toLowerCase()}`,
    descripcion: `${item.detalle} Plan sanitario de RumeApp: el producto y la dosis los decide su veterinario.`,
    fecha,
    prioridad: "media",
    categoria: "sanidad",
    completada: false,
    origen: origenPlan(especie, item.id),
    createdAt: nowISO(),
  };
}

/** Actividad pendiente de un cuidado (si está activo). */
export function pendienteDe(db: DBState, especie: Especie, itemId: string): Tarea | undefined {
  const o = origenPlan(especie, itemId);
  return db.tareas.find((t) => t.origen === o && !t.completada);
}

export function planActivo(db: DBState, especie: Especie): boolean {
  return PLANES[especie].some((i) => !!pendienteDe(db, especie, i.id));
}

/** Activa los cuidados escogidos de una especie (los que ya estén activos se dejan). */
export function activarPlan(db: DBState, especie: Especie, itemIds: string[]): void {
  const nuevas = PLANES[especie]
    .filter((i) => itemIds.includes(i.id) && !pendienteDe(db, especie, i.id))
    .map((i) => nuevaTareaPlan(especie, i, primeraFecha(db, especie, i)));
  if (nuevas.length) updateCollection("tareas", (list) => [...list, ...nuevas]);
}

/** Quita un cuidado del plan: borra su actividad pendiente. */
export function quitarItem(db: DBState, especie: Especie, itemId: string): void {
  const t = pendienteDe(db, especie, itemId);
  if (t) updateCollection("tareas", (list) => list.filter((x) => x.id !== t.id));
}

/**
 * Marca hecha una actividad del plan y programa la siguiente. Con
 * `registrarEn`, además deja el cuidado en la hoja de vida de esos animales.
 * Devuelve la fecha de la siguiente vez (o null si la tarea no es del plan).
 */
export function completarTareaPlan(t: Tarea, registrarEn?: Animal[]): string | null {
  const o = leerOrigen(t.origen);
  if (!o) return null;
  const hoy = todayISO();
  const siguiente = nuevaTareaPlan(o.especie, o.item, siguienteFecha(o.item, hoy));
  updateCollection("tareas", (list) => [
    ...list.map((x) => (x.id === t.id ? { ...x, completada: true, completadaFecha: nowISO() } : x)),
    // Si ya hay otra pendiente del mismo cuidado (otra pestaña), no se duplica.
    ...(list.some((x) => x.id !== t.id && x.origen === t.origen && !x.completada) ? [] : [siguiente]),
  ]);
  if (registrarEn?.length) {
    const eventos: SanidadEvento[] = registrarEn.map((a) => ({
      id: uid(),
      animalId: a.id,
      tipo: o.item.tipo,
      producto: o.item.titulo,
      fecha: hoy,
      notas: "Registrado desde el plan sanitario",
      completada: true,
      completadaFecha: nowISO(),
      createdAt: nowISO(),
    }));
    updateCollection("sanidad", (list) => [...list, ...eventos]);
  }
  return siguiente.fecha;
}
