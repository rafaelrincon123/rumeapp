import { todayISO, ymdLocal, parseDateLocal } from "./format";
import { especieDe, categoriaDe, infoEspecie } from "./especies";
import { participantesGasto, cuotasPorPropietario } from "./gastos";
import { TIPOS_REGISTRO, infoSistema } from "./lotes";
import { leerOrigen } from "./planSanitario";
import {
  CATEGORIAS_GASTO,
  CATEGORIAS_TAREA,
  TIPOS_SANIDAD,
  type Animal,
  type DBState,
} from "./types";

// "Mi operación": todo lo que pasa en la finca en una sola línea de tiempo.
// Cada registro de cada módulo (sanidad, reproducción, peso, leche, gastos,
// ingresos, actividades, inventario, lotes y animales nuevos) se vuelve un
// Movimiento con lo mismo: fecha, proceso, subtipo, animales, responsables,
// plata y estado. Así se filtra todo igual.

export type Proceso =
  | "sanidad"
  | "reproduccion"
  | "peso"
  | "leche"
  | "gasto"
  | "ingreso"
  | "tarea"
  | "inventario"
  | "lote"
  | "animal";

export type EstadoMov = "hecho" | "pendiente" | "vencido";

export interface Movimiento {
  id: string;
  fecha: string; // YYYY-MM-DD
  proceso: Proceso;
  /** Valor del subtipo (tipo de sanidad, categoría de gasto…) para filtrar. */
  subtipo?: string;
  subtipoLabel?: string;
  titulo: string;
  detalle?: string;
  animalIds: string[];
  loteId?: string;
  especies: string[]; // Especie o "aviar"
  /** Socios (propietarios) relacionados: dueños de los animales, quien pagó, asignados. */
  responsables: string[];
  /** + ingreso, − gasto (en pesos). */
  monto?: number;
  estado: EstadoMov;
  href: string;
}

export const PROCESOS: { value: Proceso; label: string; emoji: string; color: string }[] = [
  { value: "sanidad", label: "Sanidad", emoji: "💉", color: "#E48A82" },
  { value: "reproduccion", label: "Reproducción", emoji: "🍼", color: "#B48CC0" },
  { value: "peso", label: "Peso", emoji: "⚖️", color: "#CDB78A" },
  { value: "leche", label: "Leche", emoji: "🥛", color: "#7DA9D6" },
  { value: "gasto", label: "Gastos", emoji: "💸", color: "#E4A46A" },
  { value: "ingreso", label: "Ingresos", emoji: "💰", color: "#89C57B" },
  { value: "tarea", label: "Actividades", emoji: "✅", color: "#A9C177" },
  { value: "inventario", label: "Inventario", emoji: "📦", color: "#B99A7A" },
  { value: "lote", label: "Aves y lotes", emoji: "🐔", color: "#DFC85E" },
  { value: "animal", label: "Animales nuevos", emoji: "🐄", color: "#7EBFA9" },
];

export function infoProceso(p: Proceso) {
  return PROCESOS.find((x) => x.value === p)!;
}

/** Subtipos que se pueden filtrar dentro de cada proceso. */
export const SUBTIPOS: Partial<Record<Proceso, { value: string; label: string }[]>> = {
  sanidad: TIPOS_SANIDAD,
  gasto: CATEGORIAS_GASTO,
  tarea: CATEGORIAS_TAREA,
  ingreso: [
    { value: "venta_animal", label: "Venta de animales" },
    { value: "venta_leche", label: "Venta de leche" },
    { value: "otros", label: "Otros" },
  ],
  reproduccion: [
    { value: "servicio", label: "Servicios" },
    { value: "parto_probable", label: "Partos probables" },
    { value: "parto", label: "Partos" },
  ],
  lote: [
    ...(Object.keys(TIPOS_REGISTRO) as (keyof typeof TIPOS_REGISTRO)[]).map((k) => ({
      value: k as string,
      label: TIPOS_REGISTRO[k].boton.replace(" de hoy", ""),
    })),
    { value: "nuevo", label: "Lote nuevo" },
  ],
  inventario: [
    { value: "entrada", label: "Entradas" },
    { value: "salida", label: "Salidas" },
    { value: "ajuste", label: "Ajustes" },
  ],
};

const label = (lista: { value: string; label: string }[] | undefined, v?: string): string =>
  lista?.find((x) => x.value === v)?.label ?? v ?? "";

function dia(iso?: string): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = parseDateLocal(iso);
  return d ? ymdLocal(d) : iso.slice(0, 10);
}

function estadoDe(fecha: string, hecho: boolean, hoy: string): EstadoMov {
  if (hecho) return "hecho";
  return fecha < hoy ? "vencido" : "pendiente";
}

function nombreAnimal(a?: Animal): string {
  if (!a) return "animal";
  return a.nombre ? `${a.nombre} #${a.nroIdentificacion}` : `#${a.nroIdentificacion}`;
}

/** Junta todos los registros de la finca en una lista de movimientos (sin ordenar). */
export function construirMovimientos(db: DBState, hoy = todayISO()): Movimiento[] {
  const animales = new Map(db.animales.map((a) => [a.id, a]));
  const dueno = (ids: string[]) =>
    [...new Set(ids.map((id) => animales.get(id)?.propietarioId).filter(Boolean) as string[])];
  const esp = (ids: string[]) => [...new Set(ids.map((id) => animales.get(id)).filter(Boolean).map((a) => especieDe(a!)))];
  const out: Movimiento[] = [];

  for (const s of db.sanidad) {
    const a = animales.get(s.animalId);
    const tipo = label(TIPOS_SANIDAD, s.tipo);
    const f = dia(s.fecha);
    out.push({
      id: "san:" + s.id,
      fecha: f,
      proceso: "sanidad",
      subtipo: s.tipo,
      subtipoLabel: tipo,
      titulo: `${s.producto || tipo} · ${nombreAnimal(a)}`,
      detalle: [tipo, s.dosis, s.veterinario].filter(Boolean).join(" · "),
      animalIds: [s.animalId],
      especies: esp([s.animalId]),
      responsables: dueno([s.animalId]),
      monto: s.costo ? -s.costo : undefined,
      // Igual que en Sanidad: lo que no se marcó como realizado sigue pendiente.
      estado: estadoDe(f, !!s.completada, hoy),
      href: "/sanidad",
    });
    if (s.proximoEventoFecha) {
      const pf = dia(s.proximoEventoFecha);
      out.push({
        id: "sanp:" + s.id,
        fecha: pf,
        proceso: "sanidad",
        subtipo: s.tipo,
        subtipoLabel: tipo,
        titulo: `Próximo: ${s.producto || tipo} · ${nombreAnimal(a)}`,
        detalle: `Programado desde el ${tipo.toLowerCase()} del ${f}`,
        animalIds: [s.animalId],
        especies: esp([s.animalId]),
        responsables: dueno([s.animalId]),
        estado: estadoDe(pf, false, hoy),
        href: "/sanidad",
      });
    }
  }

  const partosPorMadre = new Map<string, string[]>();
  for (const p of db.partos) {
    partosPorMadre.set(p.madreId, [...(partosPorMadre.get(p.madreId) ?? []), dia(p.fecha)]);
    const madre = animales.get(p.madreId);
    const camada = p.nacidosVivos !== undefined ? ` · ${p.nacidosVivos} vivas${p.nacidosMuertos ? `, ${p.nacidosMuertos} muertas` : ""}` : "";
    out.push({
      id: "par:" + p.id,
      fecha: dia(p.fecha),
      proceso: "reproduccion",
      subtipo: "parto",
      subtipoLabel: "Parto",
      titulo: `Parto · ${nombreAnimal(madre)}`,
      detalle: [p.sexoTernero ? (p.sexoTernero === "hembra" ? "Hembra" : "Macho") : "", p.pesoTerneroKg ? `${p.pesoTerneroKg} kg` : "", camada.replace(/^ · /, ""), p.complicaciones].filter(Boolean).join(" · "),
      animalIds: [p.madreId, ...(p.terneroId ? [p.terneroId] : [])],
      especies: esp([p.madreId]),
      responsables: dueno([p.madreId]),
      estado: "hecho",
      href: "/reproduccion",
    });
  }

  for (const s of db.servicios) {
    const h = animales.get(s.hembraId);
    const f = dia(s.fechaServicio);
    out.push({
      id: "ser:" + s.id,
      fecha: f,
      proceso: "reproduccion",
      subtipo: "servicio",
      subtipoLabel: "Servicio",
      titulo: `${s.tipo === "inseminacion" ? "Inseminación" : "Monta"} · ${nombreAnimal(h)}`,
      detalle: [s.machoIdOReferencia && `con ${animales.get(s.machoIdOReferencia)?.nombre ?? s.machoIdOReferencia}`, s.resultado === "prenada" ? "Preñada" : s.resultado === "vacia" ? "Vacía" : "Diagnóstico pendiente"].filter(Boolean).join(" · "),
      animalIds: [s.hembraId],
      especies: esp([s.hembraId]),
      responsables: dueno([s.hembraId]),
      estado: "hecho",
      href: "/reproduccion",
    });
    if (s.fechaProbableParto && (s.resultado === "prenada" || s.resultado === "pendiente")) {
      const pf = dia(s.fechaProbableParto);
      // Ya parió después del servicio: el parto probable queda hecho.
      const yaPario = (partosPorMadre.get(s.hembraId) ?? []).some((fp) => fp >= f);
      out.push({
        id: "serp:" + s.id,
        fecha: pf,
        proceso: "reproduccion",
        subtipo: "parto_probable",
        subtipoLabel: "Parto probable",
        titulo: `Parto probable · ${nombreAnimal(h)}`,
        detalle: `Servicio del ${f}`,
        animalIds: [s.hembraId],
        especies: esp([s.hembraId]),
        responsables: dueno([s.hembraId]),
        estado: yaPario ? "hecho" : estadoDe(pf, false, hoy),
        href: "/reproduccion",
      });
    }
  }

  for (const p of db.pesajes) {
    const a = animales.get(p.animalId);
    out.push({
      id: "pes:" + p.id,
      fecha: dia(p.fecha),
      proceso: "peso",
      subtipo: p.tipo,
      titulo: `Pesaje · ${nombreAnimal(a)}`,
      detalle: `${p.pesoKg} kg`,
      animalIds: [p.animalId],
      especies: esp([p.animalId]),
      responsables: dueno([p.animalId]),
      estado: "hecho",
      href: "/peso",
    });
  }

  for (const l of db.leche) {
    const a = animales.get(l.animalId);
    const total = (l.litrosManana || 0) + (l.litrosTarde || 0);
    out.push({
      id: "lec:" + l.id,
      fecha: dia(l.fecha),
      proceso: "leche",
      titulo: `Ordeño · ${nombreAnimal(a)}`,
      detalle: `${total} L (${l.litrosManana || 0} mañana · ${l.litrosTarde || 0} tarde)`,
      animalIds: [l.animalId],
      especies: esp([l.animalId]),
      responsables: dueno([l.animalId]),
      estado: "hecho",
      href: "/produccion",
    });
  }

  for (const g of db.gastos) {
    const ids = g.animalIds?.length ? g.animalIds : g.animalId ? [g.animalId] : [];
    const parts = participantesGasto(g, db.animales);
    out.push({
      id: "gas:" + g.id,
      fecha: dia(g.fecha),
      proceso: "gasto",
      subtipo: g.categoria,
      subtipoLabel: label(CATEGORIAS_GASTO, g.categoria),
      titulo: g.concepto,
      detalle: [label(CATEGORIAS_GASTO, g.categoria), g.proveedor].filter(Boolean).join(" · "),
      animalIds: ids,
      especies: esp(ids),
      responsables: [...new Set([...(g.pagadoPor ? [g.pagadoPor] : []), ...parts])],
      monto: -g.monto,
      estado: "hecho",
      href: "/gastos",
    });
  }

  for (const i of db.ingresos) {
    const ids = i.animalId ? [i.animalId] : [];
    out.push({
      id: "ing:" + i.id,
      fecha: dia(i.fecha),
      proceso: "ingreso",
      subtipo: i.tipo,
      subtipoLabel: label(SUBTIPOS.ingreso, i.tipo),
      titulo: i.concepto,
      detalle: [label(SUBTIPOS.ingreso, i.tipo), i.comprador].filter(Boolean).join(" · "),
      animalIds: ids,
      especies: esp(ids),
      responsables: [...new Set([...(i.registradoPor ? [i.registradoPor] : []), ...dueno(ids)])],
      monto: i.monto,
      estado: "hecho",
      href: "/gastos",
    });
  }

  for (const t of db.tareas) {
    const ids = t.animalIds?.length ? t.animalIds : t.animalId ? [t.animalId] : [];
    const asignados = t.asignadoAIds?.length ? t.asignadoAIds : t.asignadoAId ? [t.asignadoAId] : [];
    const plan = leerOrigen(t.origen);
    const f = dia(t.fecha);
    out.push({
      id: "tar:" + t.id,
      fecha: f,
      proceso: "tarea",
      subtipo: t.categoria,
      subtipoLabel: label(CATEGORIAS_TAREA, t.categoria),
      titulo: t.titulo,
      detalle: [plan ? "Plan sanitario" : label(CATEGORIAS_TAREA, t.categoria), t.prioridad === "alta" ? "Prioridad alta" : ""].filter(Boolean).join(" · "),
      animalIds: ids,
      especies: plan ? [plan.especie] : esp(ids),
      responsables: [...new Set([...asignados, ...dueno(ids)])],
      estado: estadoDe(f, t.completada, hoy),
      href: "/tareas",
    });
  }

  const insumos = new Map(db.insumos.map((i) => [i.id, i]));
  for (const m of db.movimientosInsumo) {
    const ins = insumos.get(m.insumoId);
    const ids = m.animalId ? [m.animalId] : [];
    out.push({
      id: "inv:" + m.id,
      fecha: dia(m.fecha),
      proceso: "inventario",
      subtipo: m.tipo,
      subtipoLabel: label(SUBTIPOS.inventario, m.tipo),
      titulo: `${m.tipo === "entrada" ? "Entrada" : m.tipo === "salida" ? "Salida" : "Ajuste"} · ${ins?.nombre ?? "insumo"}`,
      detalle: [`${m.cantidad} ${ins?.unidad ?? ""}`.trim(), m.motivo].filter(Boolean).join(" · "),
      animalIds: ids,
      especies: esp(ids),
      responsables: [...new Set([...(m.hechoPorId ? [m.hechoPorId] : []), ...dueno(ids)])],
      monto: m.costoTotal && m.tipo === "entrada" ? -m.costoTotal : undefined,
      estado: "hecho",
      href: "/inventario",
    });
  }

  const lotes = new Map(db.lotes.map((l) => [l.id, l]));
  for (const l of db.lotes) {
    const s = infoSistema(l.sistema);
    out.push({
      id: "lot:" + l.id,
      fecha: dia(l.fechaIngreso),
      proceso: "lote",
      subtipo: "nuevo",
      subtipoLabel: "Lote nuevo",
      titulo: `${s.emoji} Entró el lote ${l.nombre}`,
      detalle: `${l.cantidadInicial} ${s.animales} · ${s.nombre}`,
      animalIds: [],
      loteId: l.id,
      especies: [l.especie],
      responsables: [],
      estado: "hecho",
      href: "/lotes",
    });
  }
  for (const r of db.registrosLote) {
    const l = lotes.get(r.loteId);
    const t = TIPOS_REGISTRO[r.tipo];
    const s = l ? infoSistema(l.sistema) : null;
    const unidad = r.tipo === "mortalidad" || r.tipo === "venta" ? s?.animales ?? "" : t.unidad;
    out.push({
      id: "reg:" + r.id,
      fecha: dia(r.fecha),
      proceso: "lote",
      subtipo: r.tipo,
      subtipoLabel: t.boton.replace(" de hoy", ""),
      titulo: `${t.emoji} ${r.tipo === "venta" ? `Venta de ${s?.animales ?? "animales"}` : t.boton.replace(" de hoy", "")} · ${l?.nombre ?? "lote"}`,
      detalle: [r.cantidad ? `${r.cantidad} ${unidad}`.trim() : "", r.notas].filter(Boolean).join(" · "),
      animalIds: [],
      loteId: r.loteId,
      especies: l ? [l.especie] : [],
      responsables: [],
      monto: r.valor ? (r.tipo === "alimento" ? -r.valor : r.tipo === "venta" || r.tipo === "venta_huevos" ? r.valor : undefined) : undefined,
      estado: "hecho",
      href: "/lotes",
    });
  }

  for (const a of db.animales) {
    if (!a.createdAt) continue;
    const info = infoEspecie(especieDe(a));
    out.push({
      id: "ani:" + a.id,
      fecha: dia(a.createdAt),
      proceso: "animal",
      subtipo: especieDe(a),
      titulo: `${info.emoji} Se registró ${nombreAnimal(a)}`,
      detalle: [categoriaDe(a), a.raza].filter(Boolean).join(" · "),
      animalIds: [a.id],
      especies: [especieDe(a)],
      responsables: a.propietarioId ? [a.propietarioId] : [],
      estado: "hecho",
      href: "/animales",
    });
  }

  return out;
}

export interface Filtros {
  desde: string;
  hasta: string;
  /** "mio": solo lo que está a cargo del usuario (sus animales, sus gastos, sus tareas). */
  alcance: "finca" | "mio";
  procesos: Proceso[]; // vacío = todos
  subtipo: string; // "" = todos (aplica si hay un solo proceso escogido)
  animalId: string;
  especie: string; // Especie | "aviar" | ""
  loteId: string;
  responsableId: string;
  estado: "" | EstadoMov | "por_hacer"; // por_hacer = pendiente o vencido
  texto: string;
}

export const FILTROS_VACIOS: Filtros = {
  desde: "",
  hasta: "",
  alcance: "finca",
  procesos: [],
  subtipo: "",
  animalId: "",
  especie: "",
  loteId: "",
  responsableId: "",
  estado: "",
  texto: "",
};

function sinTildes(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filtrar(movs: Movimiento[], f: Filtros, miId: string | null): Movimiento[] {
  const q = sinTildes(f.texto.trim());
  return movs.filter((m) => {
    if (f.desde && m.fecha < f.desde) return false;
    if (f.hasta && m.fecha > f.hasta) return false;
    if (f.alcance === "mio" && (!miId || !m.responsables.includes(miId))) return false;
    if (f.procesos.length && !f.procesos.includes(m.proceso)) return false;
    if (f.subtipo && f.procesos.length === 1 && m.subtipo !== f.subtipo) return false;
    if (f.animalId && !m.animalIds.includes(f.animalId)) return false;
    if (f.especie && !m.especies.includes(f.especie)) return false;
    if (f.loteId && m.loteId !== f.loteId) return false;
    if (f.responsableId && !m.responsables.includes(f.responsableId)) return false;
    if (f.estado === "por_hacer" && m.estado === "hecho") return false;
    if (f.estado && f.estado !== "por_hacer" && m.estado !== f.estado) return false;
    if (q && !sinTildes(`${m.titulo} ${m.detalle ?? ""} ${m.subtipoLabel ?? ""}`).includes(q)) return false;
    return true;
  });
}

/** Lo que toca al usuario de un gasto: su cuota si participa, si no lo que puso. */
export function miParteGasto(db: DBState, gastoId: string, miId: string): number | null {
  const g = db.gastos.find((x) => x.id === gastoId);
  if (!g) return null;
  const cuota = cuotasPorPropietario(g, db.animales)[miId] ?? 0;
  if (cuota > 0) return cuota;
  return g.pagadoPor === miId ? g.monto : 0;
}

export interface Resumen {
  total: number;
  gastos: number;
  ingresos: number;
  pendientes: number;
  vencidos: number;
  porProceso: { proceso: Proceso; n: number }[];
  gastosPorCategoria: { label: string; monto: number }[];
}

export function resumir(movs: Movimiento[], db: DBState, alcance: Filtros["alcance"], miId: string | null): Resumen {
  let gastos = 0;
  let ingresos = 0;
  let pendientes = 0;
  let vencidos = 0;
  const porProc = new Map<Proceso, number>();
  const porCat = new Map<string, number>();
  for (const m of movs) {
    porProc.set(m.proceso, (porProc.get(m.proceso) ?? 0) + 1);
    if (m.estado === "pendiente") pendientes++;
    if (m.estado === "vencido") vencidos++;
    // La plata se cuenta solo de Gastos e Ingresos (las cuentas de la finca).
    // Los costos de sanidad, inventario y lotes se ven en la línea, pero no se
    // suman: una venta de lote ya se anota también en Ingresos y se duplicaría.
    if (m.monto === undefined || m.estado !== "hecho") continue;
    if (m.proceso !== "gasto" && m.proceso !== "ingreso") continue;
    let monto = m.monto;
    // En "lo mío" los gastos cuentan solo la parte del usuario.
    if (alcance === "mio" && miId && m.proceso === "gasto") {
      monto = -(miParteGasto(db, m.id.slice(4), miId) ?? 0);
    }
    if (monto < 0) {
      gastos += -monto;
      const cat = m.subtipoLabel ?? "Otros";
      porCat.set(cat, (porCat.get(cat) ?? 0) + -monto);
    } else ingresos += monto;
  }
  return {
    total: movs.length,
    gastos,
    ingresos,
    pendientes,
    vencidos,
    porProceso: [...porProc.entries()].map(([proceso, n]) => ({ proceso, n })).sort((a, b) => b.n - a.n),
    gastosPorCategoria: [...porCat.entries()].map(([l, monto]) => ({ label: l, monto })).sort((a, b) => b.monto - a.monto),
  };
}

/** Atajos de fecha. */
export function rangoAtajo(atajo: string, hoy = new Date()): { desde: string; hasta: string } {
  const h = ymdLocal(hoy);
  const menos = (n: number) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - n);
    return ymdLocal(d);
  };
  switch (atajo) {
    case "hoy":
      return { desde: h, hasta: h };
    case "7":
      return { desde: menos(6), hasta: h };
    case "30":
      return { desde: menos(29), hasta: h };
    case "mes":
      return { desde: ymdLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: h };
    case "anio":
      return { desde: `${hoy.getFullYear()}-01-01`, hasta: h };
    case "proximos": {
      const d = new Date(hoy);
      d.setDate(d.getDate() + 30);
      return { desde: h, hasta: ymdLocal(d) };
    }
    default:
      return { desde: "", hasta: "" };
  }
}
