"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";

// Módulo "Mi cuenta": datos personales (user_profiles), foto, contraseña y
// correo del usuario que tiene la sesión abierta.

export interface MiPerfil {
  nombre: string;
  telefono: string;
  departamento: string;
  ciudad: string;
  avatar: string | null;
}

export interface MiReferido {
  codigo: string;
  pagados: number;
  diasGanados: number;
  creditos: Array<{
    plan: string;
    periodo: string;
    dias: number;
    creado: string;
  }>;
}

const PERFIL_EVENT = "perfil:changed";

const VACIO: MiPerfil = { nombre: "", telefono: "", departamento: "", ciudad: "", avatar: null };

export async function cargarMiPerfil(): Promise<MiPerfil> {
  const sb = getSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return VACIO;
  const { data, error } = await sb
    .from("user_profiles")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return VACIO;
  return {
    nombre: data.nombre ?? "",
    telefono: data.telefono ?? "",
    departamento: data.departamento ?? "",
    ciudad: data.ciudad ?? "",
    avatar: data.avatar ?? null,
  };
}

export async function guardarMiPerfil(p: MiPerfil): Promise<void> {
  const sb = getSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("No hay sesión iniciada");
  const { error } = await sb.from("user_profiles").upsert({
    user_id: auth.user.id,
    nombre: p.nombre.trim() || null,
    telefono: p.telefono.trim() || null,
    departamento: p.departamento || null,
    ciudad: p.ciudad.trim() || null,
    avatar: p.avatar,
  });
  if (error) throw new Error(error.message);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PERFIL_EVENT));
}

/**
 * Datos del programa de referidos del usuario actual:
 *  - su código y los créditos que ya ha ganado.
 * Los nombres de los referidos no se exponen (privacidad); se muestra plan,
 * período y fecha de cada crédito otorgado.
 */
export async function cargarMiReferido(): Promise<MiReferido | null> {
  const sb = getSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data: perfil } = await sb
    .from("user_profiles")
    .select("codigo_referido")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!perfil?.codigo_referido) return null;

  const { data: creditos } = await sb
    .from("creditos_referido")
    .select("plan, periodo, dias, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  const filas = creditos ?? [];
  const diasGanados = filas.reduce((t, c) => t + (c.dias ?? 0), 0);
  return {
    codigo: perfil.codigo_referido,
    pagados: filas.length,
    diasGanados,
    creditos: filas.map((c) => ({
      plan: c.plan,
      periodo: c.periodo,
      dias: c.dias,
      creado: c.created_at,
    })),
  };
}

/** ¿Recibe el correo diario "Hoy toca"? Sin fila de perfil = sí (default de la columna). */
export async function cargarRecordatorios(): Promise<boolean> {
  const sb = getSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return true;
  const { data } = await sb
    .from("user_profiles")
    .select("recordatorios_correo")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data?.recordatorios_correo ?? true;
}

export async function guardarRecordatorios(activo: boolean): Promise<void> {
  const sb = getSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("No hay sesión iniciada");
  const { error } = await sb
    .from("user_profiles")
    .upsert({ user_id: auth.user.id, recordatorios_correo: activo }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/** Perfil del usuario actual, se actualiza solo cuando se guarda desde /cuenta. */
export function useMiPerfil(): MiPerfil | null {
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const load = useCallback(() => {
    cargarMiPerfil().then(setPerfil, () => setPerfil(null));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(PERFIL_EVENT, load);
    return () => window.removeEventListener(PERFIL_EVENT, load);
  }, [load]);
  return perfil;
}

// Supabase responde en inglés; estos son los mensajes que el usuario puede ver aquí.
function traducir(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "La contraseña actual no es correcta.";
  if (/should be different/i.test(msg)) return "La contraseña nueva debe ser distinta a la actual.";
  if (/at least \d+ characters/i.test(msg)) return "La contraseña debe tener al menos 8 caracteres.";
  if (/already been registered|already registered|already exists/i.test(msg))
    return "Ese correo ya está registrado en otra cuenta.";
  if (/invalid.*email|email.*invalid/i.test(msg)) return "Ese correo no es válido.";
  if (/rate limit|too many/i.test(msg))
    return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  return msg;
}

/**
 * Cambia la contraseña pidiendo la actual: así, si alguien encuentra el
 * celular con la sesión abierta, no puede cambiarla y dejar fuera al dueño.
 */
export async function cambiarMiPassword(actual: string, nueva: string): Promise<void> {
  const sb = getSupabase();
  const { data: auth } = await sb.auth.getUser();
  const email = auth.user?.email;
  if (!email) throw new Error("No hay sesión iniciada");
  const check = await sb.auth.signInWithPassword({ email, password: actual });
  if (check.error) throw new Error(traducir(check.error.message));
  const { error } = await sb.auth.updateUser({ password: nueva });
  if (error) throw new Error(traducir(error.message));
}

/** Pide el cambio de correo; Supabase manda un link de confirmación al correo nuevo. */
export async function cambiarMiEmail(nuevo: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.auth.updateUser(
    { email: nuevo.trim() },
    { emailRedirectTo: `${window.location.origin}/cuenta` }
  );
  if (error) throw new Error(traducir(error.message));
}
