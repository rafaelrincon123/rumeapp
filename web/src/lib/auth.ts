"use client";

import { Propietario } from "./types";
import { getSupabase } from "./supabase";
import { getCachedDB } from "./db";
import { trackPixel } from "./pixel";

const AUTH_EVENT = "auth:changed";
export const AUTH_EVENT_NAME = AUTH_EVENT;

function emit(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  emit();
  return { ok: true };
}

/**
 * Registra un usuario nuevo. Si el proyecto de Supabase tiene "Confirm email"
 * activo, la respuesta incluye `needsConfirmation: true` y NO se inicia sesión
 * hasta que el usuario haga clic en el enlace. En proyectos sin confirmación,
 * Supabase inicia sesión inmediatamente.
 */
export async function signupWithEmail(
  email: string,
  password: string
): Promise<
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; error: string }
> {
  const sb = getSupabase();
  // Volver al mismo origen del registro: el wizard guarda la finca pendiente
  // en localStorage, que es por origen; si el link de confirmación cae en
  // otro dominio (la Site URL de Supabase), la finca no se autocrea.
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  if (error) return { ok: false, error: error.message };
  emit();
  trackPixel("CompleteRegistration");
  const needsConfirmation = !data.session;
  return { ok: true, needsConfirmation };
}

/**
 * Confirma el registro con el código de 6 dígitos del correo ({{ .Token }}
 * en la plantilla "Confirm sign up" de Supabase). Si sale bien, la sesión
 * queda abierta en esta misma pestaña.
 */
export async function verifySignupCode(
  email: string,
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  const { error } = await sb.auth.verifyOtp({ email, token, type: "signup" });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("expired") || m.includes("invalid")) {
      return { ok: false, error: "El código no es válido o ya venció. Pida uno nuevo abajo." };
    }
    if (m.includes("rate") || m.includes("security purposes")) {
      return { ok: false, error: "Demasiados intentos. Espere un minuto e intente de nuevo." };
    }
    return { ok: false, error: error.message };
  }
  emit();
  return { ok: true };
}

/** Reenvía el correo de confirmación de registro (trae código y enlace). */
export async function resendSignupEmail(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
  const { error } = await sb.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function logout(): Promise<void> {
  const sb = getSupabase();
  await sb.auth.signOut();
  emit();
}

/**
 * Envía un correo con link de recuperación. El link vuelve al origen actual
 * y dispara el evento PASSWORD_RECOVERY en Supabase, que el AuthGate escucha
 * para mostrar el formulario de nueva clave.
 *
 * Importante: en Supabase Dashboard → Authentication → URL Configuration,
 * agregar los orígenes permitidos (localhost:3000 en dev, y la URL de Vercel
 * en producción) a la lista de Redirect URLs.
 */
export async function sendPasswordReset(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Cambia la contraseña del usuario actualmente autenticado. */
export async function updatePassword(
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  emit();
  return { ok: true };
}

/** Busca el propietario correspondiente al usuario autenticado. */
export function findPropietarioForAuthUser(
  authUserId: string,
  email: string | undefined
): Propietario | null {
  const db = getCachedDB();
  if (!db) return null;
  const byAuth = db.propietarios.find((p) => p.authUserId === authUserId);
  if (byAuth) return byAuth;
  if (email) {
    const emailLc = email.toLowerCase();
    const byEmail = db.propietarios.find(
      (p) => p.email?.toLowerCase() === emailLc
    );
    if (byEmail) return byEmail;
  }
  return null;
}
