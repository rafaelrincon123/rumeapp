"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { DBState } from "./types";
import { getSupabase } from "./supabase";

// ---------------------------------------------------------------------------
//  Camel ↔ snake mapping por tabla
// ---------------------------------------------------------------------------

type FieldMap = Record<string, string>; // camelCase (TS) → snake_case (DB)

interface TableDef {
  table: string;
  map: FieldMap;
}

const TABLE_DEFS: Record<keyof DBState, TableDef> = {
  propietarios: {
    table: "propietarios",
    map: {
      id: "id",
      nombre: "nombre",
      email: "email",
      participacionPct: "participacion_pct",
      authUserId: "auth_user_id",
    },
  },
  potreros: {
    table: "potreros",
    map: {
      id: "id",
      nombre: "nombre",
      areaHectareas: "area_hectareas",
      capacidad: "capacidad",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  animales: {
    table: "animales",
    map: {
      id: "id",
      especie: "especie",
      nroIdentificacion: "nro_identificacion",
      nombre: "nombre",
      sexo: "sexo",
      raza: "raza",
      fechaNacimiento: "fecha_nacimiento",
      fechaNacimientoAprox: "fecha_nacimiento_aprox",
      madreId: "madre_id",
      padreId: "padre_id",
      madreNombre: "madre_nombre",
      padreNombre: "padre_nombre",
      categoria: "categoria",
      estado: "estado",
      potreroId: "potrero_id",
      propietarioId: "propietario_id",
      fotoUrl: "foto_url",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  sanidad: {
    table: "sanidad",
    map: {
      id: "id",
      animalId: "animal_id",
      tipo: "tipo",
      producto: "producto",
      dosis: "dosis",
      fecha: "fecha",
      proximoEventoFecha: "proximo_evento_fecha",
      veterinario: "veterinario",
      costo: "costo",
      notas: "notas",
      completada: "completada",
      completadaFecha: "completada_fecha",
      createdAt: "created_at",
    },
  },
  servicios: {
    table: "servicios",
    map: {
      id: "id",
      hembraId: "hembra_id",
      machoIdOReferencia: "macho_id_o_referencia",
      tipo: "tipo",
      fechaServicio: "fecha_servicio",
      fechaDiagnostico: "fecha_diagnostico",
      resultado: "resultado",
      fechaProbableParto: "fecha_probable_parto",
      notas: "notas",
      completada: "completada",
      completadaFecha: "completada_fecha",
      createdAt: "created_at",
    },
  },
  partos: {
    table: "partos",
    map: {
      id: "id",
      madreId: "madre_id",
      fecha: "fecha",
      terneroId: "ternero_id",
      pesoTerneroKg: "peso_ternero_kg",
      sexoTernero: "sexo_ternero",
      nacidosVivos: "nacidos_vivos",
      nacidosMuertos: "nacidos_muertos",
      complicaciones: "complicaciones",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  pesajes: {
    table: "pesajes",
    map: {
      id: "id",
      animalId: "animal_id",
      fecha: "fecha",
      pesoKg: "peso_kg",
      tipo: "tipo",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  leche: {
    table: "produccion_leche",
    map: {
      id: "id",
      animalId: "animal_id",
      fecha: "fecha",
      litrosManana: "litros_manana",
      litrosTarde: "litros_tarde",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  gastos: {
    table: "gastos",
    map: {
      id: "id",
      fecha: "fecha",
      categoria: "categoria",
      concepto: "concepto",
      monto: "monto",
      proveedor: "proveedor",
      pagadoPor: "pagado_por",
      participantes: "participantes",
      pagadoPorIds: "pagado_por_ids",
      repartoPor: "reparto_por",
      animalIds: "animal_ids",
      animalId: "animal_id",
      potreroId: "potrero_id",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  ingresos: {
    table: "ingresos",
    map: {
      id: "id",
      fecha: "fecha",
      tipo: "tipo",
      concepto: "concepto",
      monto: "monto",
      comprador: "comprador",
      animalId: "animal_id",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  tareas: {
    table: "tareas",
    map: {
      id: "id",
      titulo: "titulo",
      descripcion: "descripcion",
      fecha: "fecha",
      prioridad: "prioridad",
      categoria: "categoria",
      completada: "completada",
      completadaFecha: "completada_fecha",
      animalId: "animal_id",
      animalIds: "animal_ids",
      potreroId: "potrero_id",
      asignadoAId: "asignado_a_id",
      asignadoAIds: "asignado_a_ids",
      origen: "origen",
      createdAt: "created_at",
    },
  },
  insumos: {
    table: "insumos",
    map: {
      id: "id",
      nombre: "nombre",
      categoria: "categoria",
      unidad: "unidad",
      stock: "stock",
      minimo: "minimo",
      costoUnitario: "costo_unitario",
      proveedor: "proveedor",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  movimientosInsumo: {
    table: "movimientos_insumo",
    map: {
      id: "id",
      insumoId: "insumo_id",
      fecha: "fecha",
      tipo: "tipo",
      cantidad: "cantidad",
      costoTotal: "costo_total",
      motivo: "motivo",
      animalId: "animal_id",
      potreroId: "potrero_id",
      hechoPorId: "hecho_por_id",
      createdAt: "created_at",
    },
  },
  lotes: {
    table: "lotes",
    map: {
      id: "id",
      especie: "especie",
      sistema: "sistema",
      nombre: "nombre",
      fechaIngreso: "fecha_ingreso",
      cantidadInicial: "cantidad_inicial",
      edadIngresoDias: "edad_ingreso_dias",
      raza: "raza",
      ubicacion: "ubicacion",
      pesoIngresoKg: "peso_ingreso_kg",
      estado: "estado",
      fechaCierre: "fecha_cierre",
      notas: "notas",
      createdAt: "created_at",
    },
  },
  registrosLote: {
    table: "registros_lote",
    map: {
      id: "id",
      loteId: "lote_id",
      fecha: "fecha",
      tipo: "tipo",
      cantidad: "cantidad",
      valor: "valor",
      notas: "notas",
      createdAt: "created_at",
    },
  },
};

// ---------------------------------------------------------------------------
//  Finca activa (multi-tenant): se inyecta como finca_id en cada upsert.
//  La setea `useFincaActiva` cuando la app arranca / cambia de finca.
// ---------------------------------------------------------------------------
let _activeFincaId: string | null = null;

export function setActiveFincaId(id: string | null): void {
  if (_activeFincaId === id) return;
  _activeFincaId = id;
  // Reiniciar cache — los datos de la finca anterior ya no aplican —
  // y volver a arrancar la carga si hay finca activa. Sin finca, dejamos
  // el cache vacío (el gate de onboarding tomará el control).
  clearDB();
  if (id) void initDB();
}

export function getActiveFincaId(): string | null {
  return _activeFincaId;
}

function toRow(obj: Record<string, unknown>, map: FieldMap): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [ts, db] of Object.entries(map)) {
    const v = obj[ts];
    if (v !== undefined) out[db] = v;
  }
  // Inyectar finca_id si no viene explícito. El trigger del server sirve de
  // red de seguridad, pero mandarlo explícito evita ambigüedad cuando el
  // usuario está en varias fincas.
  if (_activeFincaId && out["finca_id"] === undefined) {
    out["finca_id"] = _activeFincaId;
  }
  return out;
}

function fromRow(row: Record<string, unknown>, map: FieldMap): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [ts, db] of Object.entries(map)) {
    const v = row[db];
    if (v !== null && v !== undefined) out[ts] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
//  Cache + suscriptores
// ---------------------------------------------------------------------------

function emptyDB(): DBState {
  return {
    animales: [],
    potreros: [],
    sanidad: [],
    servicios: [],
    partos: [],
    pesajes: [],
    leche: [],
    gastos: [],
    ingresos: [],
    propietarios: [],
    tareas: [],
    insumos: [],
    movimientosInsumo: [],
    lotes: [],
    registrosLote: [],
  };
}

let _cache: DBState | null = null;
let _initPromise: Promise<void> | null = null;
let _channels: RealtimeChannel[] = [];
/** Tablas cuyo fetch inicial ya llegó del server. */
const _loaded = new Set<keyof DBState>();
/**
 * IDs de operaciones locales pendientes de reflejo Realtime — evita rebotes.
 * Cada marca lleva TTL: si el evento no llega en 5s, la limpiamos para que
 * cualquier reconciliación posterior desde el servidor sí se aplique.
 */
const _localOps = new Map<string, ReturnType<typeof setTimeout>>();
const LOCAL_OP_TTL_MS = 5000;

function markLocalOp(key: string): void {
  const prev = _localOps.get(key);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => { _localOps.delete(key); }, LOCAL_OP_TTL_MS);
  _localOps.set(key, t);
}

function consumeLocalOp(key: string): boolean {
  const t = _localOps.get(key);
  if (!t) return false;
  clearTimeout(t);
  _localOps.delete(key);
  return true;
}

function clearLocalOp(key: string): void {
  consumeLocalOp(key);
}

const EVENT = "db:changed";
function emit(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

export function getCachedDB(): DBState | null {
  return _cache;
}

export function isReady(): boolean {
  return _cache !== null;
}

/** ¿Ya llegó el fetch inicial de esa tabla desde el server? */
export function isTableLoaded(key: keyof DBState): boolean {
  return _loaded.has(key);
}

/** ¿Ya cargaron TODAS las tablas? (rara vez se necesita — la UI suele
 *  poder mostrarse tabla a tabla). */
export function areAllTablesLoaded(): boolean {
  return _loaded.size >= Object.keys(TABLE_DEFS).length;
}

// ---------------------------------------------------------------------------
//  Carga inicial
// ---------------------------------------------------------------------------

/**
 * Carga inicial "streaming": arranca las 13 queries en paralelo y aplica
 * cada tabla al cache conforme llega, emitiendo `db:changed` para que la
 * UI se pinte progresivamente. La promise se resuelve tan pronto como
 * `propietarios` esté cargada (lo único que `useAuth` necesita para
 * vincular la sesión), pero el resto sigue cargando en segundo plano.
 * Realtime se suscribe por tabla después de que cada una termina de
 * cargar, evitando condiciones de carrera INSERT ↔ fetch inicial.
 */
export function initDB(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const sb = getSupabase();
    // Cache no-vacío desde el arranque: los componentes pueden renderizar
    // (con listas vacías) mientras las tablas llegan.
    _cache = emptyDB();
    emit();

    const keys = Object.keys(TABLE_DEFS) as (keyof DBState)[];
    let resolveEssentials: () => void = () => {};
    const essentials = new Promise<void>((r) => { resolveEssentials = r; });

    keys.forEach((k) => {
      const def = TABLE_DEFS[k];
      void (async () => {
        try {
          let query = sb.from(def.table).select("*");
          if (_activeFincaId) {
            query = query.eq("finca_id", _activeFincaId);
          }
          const { data, error } = await query;
          if (error) {
            console.error(`[db] error cargando ${def.table}`, error);
          } else if (_cache) {
            const rows = (data ?? []) as Record<string, unknown>[];
            const list = rows.map((r) => fromRow(r, def.map));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            _cache = { ..._cache, [k]: list as any };
            _loaded.add(k);
            emit();
          }
        } finally {
          if (k === "propietarios") resolveEssentials();
          subscribeTable(k);
        }
      })();
    });

    await essentials;
  })();
  return _initPromise;
}

/** Re-carga todo desde Supabase (útil tras cambios manuales en la base). */
export async function refreshDB(): Promise<void> {
  unsubscribeRealtime();
  _initPromise = null;
  _cache = null;
  _loaded.clear();
  await initDB();
}

export function clearDB(): void {
  unsubscribeRealtime();
  _cache = null;
  _initPromise = null;
  _loaded.clear();
  emit();
}

// ---------------------------------------------------------------------------
//  Realtime: postgres_changes → cache local
// ---------------------------------------------------------------------------

const _subscribed = new Set<keyof DBState>();

function subscribeTable<K extends keyof DBState>(key: K): void {
  if (_subscribed.has(key)) return;
  _subscribed.add(key);
  const sb = getSupabase();
  const def = TABLE_DEFS[key];
  // Filtro Realtime por finca activa: aunque RLS también protege el server,
  // esto evita que la UI reciba eventos de fincas ajenas (por seguridad y
  // para no procesar payloads irrelevantes).
  const filter = _activeFincaId ? `finca_id=eq.${_activeFincaId}` : undefined;
  const channel = sb
    .channel(`db:${def.table}:${_activeFincaId ?? "any"}`)
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      { event: "*", schema: "public", table: def.table, ...(filter ? { filter } : {}) },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        applyRealtimeEvent(key, payload);
      }
    )
    .subscribe();
  _channels.push(channel);
}

function unsubscribeRealtime(): void {
  if (_channels.length === 0) return;
  const sb = getSupabase();
  for (const ch of _channels) {
    void sb.removeChannel(ch);
  }
  _channels = [];
  _subscribed.clear();
}

function applyRealtimeEvent<K extends keyof DBState>(
  key: K,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): void {
  if (!_cache) return;
  const def = TABLE_DEFS[key];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = _cache[key] as any[];

  if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
    const item = fromRow(payload.new as Record<string, unknown>, def.map);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = (item as any).id as string | undefined;
    if (!id) return;
    const opKey = `${def.table}:upsert:${id}`;
    if (consumeLocalOp(opKey)) return; // ya aplicado localmente
    const idx = list.findIndex((x) => x.id === id);
    const newList = list.slice();
    if (idx >= 0) newList[idx] = item;
    else newList.push(item);
    _cache = { ..._cache, [key]: newList as DBState[K] };
    emit();
  } else if (payload.eventType === "DELETE") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = (payload.old as any)?.id as string | undefined;
    if (!id) return;
    const opKey = `${def.table}:delete:${id}`;
    if (consumeLocalOp(opKey)) return;
    const idx = list.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const newList = list.slice();
      newList.splice(idx, 1);
      _cache = { ..._cache, [key]: newList as DBState[K] };
      emit();
    }
  }
}

// ---------------------------------------------------------------------------
//  updateCollection: mantiene la API sync usada por los componentes.
//  Actualiza el cache local optimistamente y sincroniza a Supabase en
//  segundo plano (upserts + deletes basados en diff por id).
//
//  Si la sincronización falla:
//   - por red (sin señal, timeout, 5xx): el cambio se queda en pantalla,
//     queda pendiente y se reintenta solo (al volver la conexión y cada
//     20 s). Lo pendiente vive solo en memoria, así que mientras haya algo
//     pendiente cerrar o recargar la pestaña pide confirmación.
//   - por un rechazo definitivo (permiso del rol, límite del plan, una
//     restricción de la base): se revierte al estado real del servidor.
//  En ambos casos se avisa a la UI (SyncToaster).
// ---------------------------------------------------------------------------

type WriteOp =
  | {
      kind: "upsert";
      key: keyof DBState;
      id: string;
      row: Record<string, unknown>;
      seq: number;
      fincaId: string | null;
    }
  | { kind: "delete"; key: keyof DBState; id: string; seq: number; fincaId: string | null };

/** Última operación fallida por red, por registro (`tabla:id`). */
const _pending = new Map<string, WriteOp>();
/** Secuencia de la última escritura lanzada por registro: evita que la
 *  respuesta tardía de una escritura vieja pise una edición más nueva. */
const _latestSeq = new Map<string, number>();
let _seq = 0;

export interface SyncStatus {
  pending: number;
  online: boolean;
}
export const SYNC_STATUS_EVENT = "db:sync-status";
export const SYNC_ERROR_EVENT = "db:sync-error";

export function getSyncStatus(): SyncStatus {
  return {
    pending: _pending.size,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
  };
}

function recKey(key: keyof DBState, id: string): string {
  return `${TABLE_DEFS[key].table}:${id}`;
}

function onBeforeUnload(e: BeforeUnloadEvent): void {
  e.preventDefault();
  e.returnValue = "";
}
let _unloadGuard = false;

function emitSyncStatus(): void {
  if (typeof window === "undefined") return;
  const need = _pending.size > 0;
  if (need !== _unloadGuard) {
    if (need) window.addEventListener("beforeunload", onBeforeUnload);
    else window.removeEventListener("beforeunload", onBeforeUnload);
    _unloadGuard = need;
  }
  window.dispatchEvent(new CustomEvent<SyncStatus>(SYNC_STATUS_EVENT, { detail: getSyncStatus() }));
}

function emitSyncError(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ message: string }>(SYNC_ERROR_EVENT, { detail: { message } }));
}

function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const e = err as { name?: string; message?: string } | null;
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|aborted/i.test(
    `${e?.name ?? ""} ${e?.message ?? ""}`
  );
}

function friendlyWriteError(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  switch (e?.code) {
    case "42501":
      return "No se guardó: tu rol en la finca no permite hacer este cambio.";
    case "P0001":
      // Mensajes de los triggers del server (p. ej. límites del plan), ya en español.
      return e.message
        ? `No se guardó: ${e.message.charAt(0).toLowerCase()}${e.message.slice(1)}`
        : "No se guardó: el servidor rechazó el cambio.";
    case "23505":
      return "No se guardó: ya existe un registro con esos datos.";
    case "23503":
      return "No se guardó: depende de un registro que ya no existe.";
    default:
      return "No se pudo guardar el cambio. Intenta de nuevo.";
  }
}

type WriteResult =
  | { ok: true; data: unknown }
  | { ok: false; retryable: boolean; message: string };

async function runWrite(
  fn: () => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null; status: number }>
): Promise<WriteResult> {
  try {
    const { data, error, status } = await fn();
    if (!error) return { ok: true, data };
    // status 0 = el fetch ni siquiera llegó (postgrest-js no lanza, devuelve esto).
    const retryable = status === 0 || status === 401 || status >= 500 || isNetworkError(error);
    if (!retryable) console.error("[db] escritura rechazada", error);
    return { ok: false, retryable, message: friendlyWriteError(error) };
  } catch (e) {
    return { ok: false, retryable: true, message: friendlyWriteError(e) };
  }
}

/** La escritura llegó al server: ya no está pendiente. */
function settle(op: WriteOp): void {
  const rk = recKey(op.key, op.id);
  const p = _pending.get(rk);
  if (p && p.seq <= op.seq) _pending.delete(rk);
}

/** Falló por red: queda pendiente para reintentar (salvo que haya una más nueva). */
function keepPending(op: WriteOp): void {
  clearLocalOp(`${TABLE_DEFS[op.key].table}:${op.kind}:${op.id}`);
  const rk = recKey(op.key, op.id);
  if ((_latestSeq.get(rk) ?? 0) > op.seq) return;
  _pending.set(rk, op);
}

/** Rechazo definitivo: se descarta (el cache se reconcilia con el server). */
function drop(op: WriteOp): void {
  clearLocalOp(`${TABLE_DEFS[op.key].table}:${op.kind}:${op.id}`);
  settle(op);
}

/**
 * Vuelve a leer la tabla del server y reaplica encima lo que siga pendiente
 * por red, para deshacer un cambio rechazado sin perder los demás.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reconcileTable(key: keyof DBState): Promise<any[] | null> {
  const def = TABLE_DEFS[key];
  let query = getSupabase().from(def.table).select("*");
  if (_activeFincaId) query = query.eq("finca_id", _activeFincaId);
  const { data, error } = await query;
  if (error || !_cache) return null;
  let list = ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow(r, def.map));
  _pending.forEach((op) => {
    if (op.key !== key || op.fincaId !== _activeFincaId) return;
    if (op.kind === "delete") {
      list = list.filter((x) => x.id !== op.id);
    } else {
      const item = fromRow(op.row, def.map);
      const idx = list.findIndex((x) => x.id === op.id);
      if (idx >= 0) list[idx] = item;
      else list.push(item);
    }
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _cache = { ..._cache, [key]: list as any };
  emit();
  return list;
}

async function sendOps(key: keyof DBState, ops: WriteOp[]): Promise<void> {
  const def = TABLE_DEFS[key];
  const sb = getSupabase();
  const upserts = ops.filter((o): o is Extract<WriteOp, { kind: "upsert" }> => o.kind === "upsert");
  const deletes = ops.filter((o) => o.kind === "delete");

  // Marcar como locales para que Realtime no los re-aplique
  upserts.forEach((o) => markLocalOp(`${def.table}:upsert:${o.id}`));
  deletes.forEach((o) => markLocalOp(`${def.table}:delete:${o.id}`));

  let revertMsg: string | null = null;
  let notDeleted: string[] = [];

  if (upserts.length > 0) {
    const res = await runWrite(() =>
      sb.from(def.table).upsert(upserts.map((o) => o.row), { onConflict: "id" })
    );
    if (res.ok) upserts.forEach(settle);
    else if (res.retryable) upserts.forEach(keepPending);
    else {
      upserts.forEach(drop);
      revertMsg = res.message;
    }
  }

  if (deletes.length > 0) {
    const ids = deletes.map((o) => o.id);
    const res = await runWrite(() => sb.from(def.table).delete().in("id", ids).select("id"));
    if (res.ok) {
      // RLS no da error al borrar sin permiso: simplemente no borra. Lo que
      // no volvió en la respuesta no se borró.
      const borrados = new Set(((res.data ?? []) as { id: string }[]).map((r) => r.id));
      deletes.forEach((o) => (borrados.has(o.id) ? settle(o) : drop(o)));
      notDeleted = ids.filter((id) => !borrados.has(id));
    } else if (res.retryable) deletes.forEach(keepPending);
    else {
      deletes.forEach(drop);
      revertMsg = revertMsg ?? res.message;
    }
  }

  if (revertMsg || notDeleted.length > 0) {
    const fresh = await reconcileTable(key);
    if (revertMsg) {
      emitSyncError(revertMsg);
    } else if (fresh && notDeleted.some((id) => fresh.some((x) => x.id === id))) {
      // Si ya no está en el server, otro lo borró antes: no hay nada que avisar.
      emitSyncError("No se eliminó: tu rol en la finca no permite borrar este registro.");
    }
  }

  emitSyncStatus();
  scheduleRetry();
}

let _retryTimer: ReturnType<typeof setTimeout> | null = null;
let _retrying = false;
const RETRY_MS = 20000;

function scheduleRetry(): void {
  if (_retryTimer || _pending.size === 0 || typeof window === "undefined") return;
  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    void retryPendingWrites();
  }, RETRY_MS);
}

/** Reintenta todo lo pendiente. La llama el reintento automático y el botón del aviso. */
export async function retryPendingWrites(): Promise<void> {
  if (_retrying || _pending.size === 0) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    scheduleRetry();
    return;
  }
  _retrying = true;
  try {
    const keys = Object.keys(TABLE_DEFS) as (keyof DBState)[];
    const ops = Array.from(_pending.values());
    // Al crear, padres antes que hijos (el orden de TABLE_DEFS ya lo respeta:
    // potreros → animales → sanidad…); al borrar, hijos antes que padres.
    for (const key of keys) {
      const ups = ops.filter((o) => o.key === key && o.kind === "upsert");
      if (ups.length > 0) await sendOps(key, ups);
    }
    for (const key of [...keys].reverse()) {
      const dels = ops.filter((o) => o.key === key && o.kind === "delete");
      if (dels.length > 0) await sendOps(key, dels);
    }
  } finally {
    _retrying = false;
    emitSyncStatus();
    scheduleRetry();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    emitSyncStatus();
    void retryPendingWrites();
  });
  window.addEventListener("offline", () => emitSyncStatus());
}

export function updateCollection<K extends keyof DBState>(
  key: K,
  updater: (list: DBState[K]) => DBState[K]
): DBState {
  if (!_cache) {
    console.warn("[db] updateCollection llamado sin cache — ignorado");
    return emptyDB();
  }
  const oldList = _cache[key] as DBState[K];
  const newList = updater(oldList);
  // Reemplazar la referencia raíz para que React detecte el cambio
  // (Object.is en setState hace bail-out si mutamos en sitio).
  _cache = { ..._cache, [key]: newList };
  emit();
  void syncCollection(key, oldList, newList);
  return _cache;
}

async function syncCollection<K extends keyof DBState>(
  key: K,
  oldList: DBState[K],
  newList: DBState[K]
): Promise<void> {
  const def = TABLE_DEFS[key];

  const oldById: Record<string, Record<string, unknown>> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (oldList as any[]).forEach((it) => { oldById[it.id] = it; });
  const newById: Record<string, Record<string, unknown>> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (newList as any[]).forEach((it) => { newById[it.id] = it; });

  const ops: WriteOp[] = [];
  Object.keys(newById).forEach((id) => {
    const item = newById[id];
    const prev = oldById[id];
    if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
      ops.push({ kind: "upsert", key, id, row: toRow(item, def.map), seq: ++_seq, fincaId: _activeFincaId });
    }
  });
  Object.keys(oldById)
    .filter((id) => !(id in newById))
    .forEach((id) => ops.push({ kind: "delete", key, id, seq: ++_seq, fincaId: _activeFincaId }));

  if (ops.length === 0) return;
  ops.forEach((op) => _latestSeq.set(recKey(op.key, op.id), op.seq));
  await sendOps(key, ops);
}

// ---------------------------------------------------------------------------
//  Utilidades legacy
// ---------------------------------------------------------------------------

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function nowISO(): string {
  return new Date().toISOString();
}
