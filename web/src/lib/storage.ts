"use client";

// Este archivo es un shim de compatibilidad. Toda la lógica real vive en `db.ts`,
// que habla con Supabase. Se conserva la API que usan los componentes:
//   - loadDB(): DBState        → retorna el snapshot en memoria (o vacío)
//   - updateCollection(...)    → aplica cambio optimista y sincroniza a Supabase
//   - resetDB()                → re-carga desde Supabase
//   - uid(), nowISO()          → utilidades

import { DBState } from "./types";
import {
  getCachedDB,
  updateCollection as _updateCollection,
  refreshDB,
  uid as _uid,
  nowISO as _nowISO,
} from "./db";

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

export function loadDB(): DBState {
  return getCachedDB() ?? emptyDB();
}

export function saveDB(): void {
  console.warn("[storage] saveDB() ya no aplica — cambios se sincronizan vía updateCollection");
}

export function resetDB(): DBState {
  void refreshDB();
  return getCachedDB() ?? emptyDB();
}

export const updateCollection = _updateCollection;
export const uid = _uid;
export const nowISO = _nowISO;
