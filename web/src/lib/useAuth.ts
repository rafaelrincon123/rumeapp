"use client";

import { useCallback, useEffect, useState } from "react";
import { Propietario } from "./types";
import { getSupabase } from "./supabase";
import { initDB, clearDB, getCachedDB } from "./db";
import { findPropietarioForAuthUser, AUTH_EVENT_NAME, entrarConEnlaceDeCorreo } from "./auth";

interface State {
  hasSession: boolean;
  authEmail: string | null;
  authUserId: string | null;
  user: Propietario | null;
  ready: boolean;
  /**
   * Se pone en true cuando Supabase dispara PASSWORD_RECOVERY (usuario
   * volvió del link de recuperación). El AuthGate lo usa para mostrar el
   * formulario de nueva clave en lugar de la app.
   */
  recoveryMode: boolean;
}

export function useAuth(): State & { clearRecovery: () => void; refresh: () => Promise<void> } {
  const [state, setState] = useState<State>({
    hasSession: false,
    authEmail: null,
    authUserId: null,
    user: null,
    ready: false,
    recoveryMode: false,
  });

  // Extraído a useCallback (en vez de vivir dentro del useEffect) para poder
  // exponerlo: quien acaba de crear el propietario (p.ej. AuthGate tras el
  // signup wizard) necesita forzar un recálculo de `user` una vez el cache
  // local ya tiene la fila nueva — si no, `user` queda pegado al valor
  // (null) calculado antes de que existiera el propietario.
  const refresh = useCallback(async () => {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    const session = data.session;
    if (!session) {
      // Solo limpiar cache si había datos cargados (para evitar loops con db:changed)
      if (getCachedDB() !== null) clearDB();
      setState((s) => ({
        hasSession: false,
        authEmail: null,
        authUserId: null,
        user: null,
        ready: true,
        // Salir de recovery cuando ya no hay sesión
        recoveryMode: false && s.recoveryMode,
      }));
      return;
    }
    // Con sesión: aseguramos datos cargados
    try {
      await initDB();
    } catch (e) {
      console.error("[useAuth] initDB error", e);
    }
    const user = findPropietarioForAuthUser(
      session.user.id,
      session.user.email ?? undefined
    );
    setState((s) => ({
      hasSession: true,
      authEmail: session.user.email ?? null,
      authUserId: session.user.id,
      user,
      ready: true,
      recoveryMode: s.recoveryMode,
    }));
  }, []);

  useEffect(() => {
    let mounted = true;
    const sb = getSupabase();

    // Si llegó desde el botón de un correo, abrir la sesión antes del primer
    // refresh (para no mostrar la landing un instante).
    void entrarConEnlaceDeCorreo().finally(() => {
      if (mounted) void refresh();
    });

    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setState((s) => ({ ...s, recoveryMode: true, ready: true }));
        return;
      }
      if (mounted) void refresh();
    });

    const onLocalAuth = () => {
      if (mounted) void refresh();
    };
    // Ojo: NO nos suscribimos a "db:changed" aquí porque `refresh()` puede
    // dispararlo (via clearDB/initDB), creando un loop infinito.

    window.addEventListener(AUTH_EVENT_NAME, onLocalAuth);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener(AUTH_EVENT_NAME, onLocalAuth);
    };
  }, [refresh]);

  function clearRecovery() {
    setState((s) => ({ ...s, recoveryMode: false }));
  }

  return { ...state, clearRecovery, refresh };
}
