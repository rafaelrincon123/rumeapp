"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { getSupabase } from "./supabase";
import { AUTH_EVENT_NAME } from "./auth";
import { setActiveFincaId, initDB } from "./db";
import type { Finca, PlanFinca } from "./types";

const STORAGE_KEY = "rumeapp:activaId";
const CHANGED_EVENT = "finca:changed";

interface RowFinca {
  id: string;
  nombre: string;
  owner_user_id: string;
  plan: PlanFinca;
  timezone: string;
  created_at: string;
  trial_ends_at: string | null;
  plan_pagado: boolean;
}

function fromRow(row: RowFinca): Finca {
  return {
    id: row.id,
    nombre: row.nombre,
    ownerUserId: row.owner_user_id,
    plan: row.plan,
    timezone: row.timezone,
    createdAt: row.created_at,
    trialEndsAt: row.trial_ends_at,
    planPagado: row.plan_pagado,
  };
}

interface State {
  ready: boolean;
  fincas: Finca[];
  activa: Finca | null;
}

async function fetchFincas(): Promise<Finca[]> {
  const sb = getSupabase();
  // Esperar a que la sesión esté cargada desde storage antes de pedir fincas.
  // Sin sesión, RLS devuelve [] y el AuthGate creería que el usuario no
  // tiene finca (mandándolo al onboarding wizard). Sin sesión: cortar aquí.
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return [];
  const { data, error } = await sb
    .from("fincas")
    .select("id, nombre, owner_user_id, plan, timezone, created_at, trial_ends_at, plan_pagado")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[useFincaActiva] fetch fincas", error);
    return [];
  }
  return (data ?? []).map((r) => fromRow(r as RowFinca));
}

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function useFincaActiva(): State & {
  setActiva: (id: string) => void;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<State>({
    ready: false,
    fincas: [],
    activa: null,
  });

  async function refresh() {
    const fincas = await fetchFincas();
    const storedId = readStoredId();
    const activa =
      fincas.find((f) => f.id === storedId) ?? fincas[0] ?? null;
    if (activa && activa.id !== storedId) writeStoredId(activa.id);
    if (!activa) writeStoredId(null);
    setActiveFincaId(activa?.id ?? null);
    setState({ ready: true, fincas, activa });
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const fincas = await fetchFincas();
      if (!mounted) return;
      const storedId = readStoredId();
      const activa =
        fincas.find((f) => f.id === storedId) ?? fincas[0] ?? null;
      if (activa && activa.id !== storedId) writeStoredId(activa.id);
      if (!activa) writeStoredId(null);
      setActiveFincaId(activa?.id ?? null);
      setState({ ready: true, fincas, activa });
    })();

    const onAuth = () => void refresh();
    const onChanged = () => void refresh();
    window.addEventListener(AUTH_EVENT_NAME, onAuth);
    window.addEventListener(CHANGED_EVENT, onChanged);
    // Suscripción directa a Supabase: si la sesión aparece (INITIAL_SESSION
    // al hidratar desde storage, SIGNED_IN, TOKEN_REFRESHED), refrescamos.
    const sb = getSupabase();
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_OUT"
      ) {
        if (event === "SIGNED_OUT" || !session) {
          setState({ ready: true, fincas: [], activa: null });
          return;
        }
        void refresh();
      }
    });
    return () => {
      mounted = false;
      window.removeEventListener(AUTH_EVENT_NAME, onAuth);
      window.removeEventListener(CHANGED_EVENT, onChanged);
      sub.subscription.unsubscribe();
    };
  }, []);

  function setActiva(id: string) {
    writeStoredId(id);
    setActiveFincaId(id);
    setState((s) => {
      const activa = s.fincas.find((f) => f.id === id) ?? s.activa;
      return { ...s, activa };
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
    }
  }

  return { ...state, setActiva, refresh };
}

/** Llamable desde código no-hook (por ejemplo `crearFinca`) para forzar refresh. */
export function emitFincaChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }
}

/**
 * Activa la prueba de 15 días del plan Ganadero (RPC iniciar_prueba_ganadero:
 * solo el dueño, una vez por finca). Refresca la finca activa al terminar.
 */
export async function iniciarPruebaGanadero(fincaId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  const { error } = await sb.rpc("iniciar_prueba_ganadero", { p_finca_id: fincaId });
  if (error) return { ok: false, error: error.message };
  try { track("PruebaIniciada", { plan: "ganadero" }); } catch { /* ignore */ }
  emitFincaChanged();
  return { ok: true };
}

/**
 * RPC del servidor: crea una finca + su propietario inicial atómicamente.
 * Devuelve la finca creada.
 */
export async function crearFinca(opts: {
  nombre: string;
  timezone?: string;
  nombrePropietario?: string;
  tamanoAprox?: number | null;
  telefono?: string | null;
  departamento?: string | null;
  ciudad?: string | null;
  referidoVia?: string | null;
  /** Plan que el usuario quiere (la finca igual arranca en Ranchero hasta que pague). */
  planElegido?: PlanFinca;
}): Promise<Finca> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("crear_finca", {
    p_nombre: opts.nombre,
    p_timezone: opts.timezone ?? "America/Bogota",
    p_nombre_propietario: opts.nombrePropietario ?? null,
    p_tamano_aprox: opts.tamanoAprox ?? null,
    p_telefono: opts.telefono ?? null,
    p_departamento: opts.departamento ?? null,
    p_ciudad: opts.ciudad ?? null,
    p_referido_via: opts.referidoVia ?? null,
    p_plan_elegido: opts.planElegido ?? "ranchero",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("La finca no fue creada");
  const row = Array.isArray(data) ? data[0] : data;
  const finca = fromRow(row as RowFinca);
  writeStoredId(finca.id);
  try {
    track("FincaCreada", { plan: opts.planElegido ?? "ranchero" });
  } catch {
    /* ignore */
  }

  // Activar la finca YA (no esperar al próximo refresh de useFincaActiva)
  // y esperar a que el cache local recargue — en particular `propietarios`,
  // que es justo lo que `useAuth` necesita para vincular la sesión con el
  // propietario recién creado por el RPC. Sin este await, `useAuth.user`
  // queda pegado en `null` (calculado antes de que existiera el
  // propietario) y la app muestra "Cuenta sin vincular" aunque todo esté
  // bien en el servidor.
  setActiveFincaId(finca.id);
  try {
    await initDB();
  } catch (e) {
    console.error("[crearFinca] initDB tras crear finca", e);
  }

  emitFincaChanged();
  // Fuerza a useAuth a recalcular `user` contra el cache ya actualizado.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME));
  }
  return finca;
}
