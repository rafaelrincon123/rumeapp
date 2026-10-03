"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useFincaActiva } from "@/lib/useFincaActiva";
import {
  loginWithEmail,
  sendPasswordReset,
  resendSignupEmail,
  updatePassword,
  logout,
} from "@/lib/auth";
import { IconLock, IconUser } from "./icons";
import OnboardingWizard from "./OnboardingWizard";
import LandingPage, { RUTAS_LANDING } from "./LandingPage";
import CodigoConfirmacion from "./CodigoConfirmacion";
import { trackPixel } from "@/lib/pixel";
import SignupWizard, {
  PENDING_SIGNUP_KEY,
  PendingSignup,
  completarCreacionFinca,
} from "./SignupWizard";
import PasswordInput from "./PasswordInput";

function readPendingSignup(): PendingSignup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSignup;
  } catch {
    return null;
  }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { hasSession, user, ready, authEmail, recoveryMode, clearRecovery } =
    useAuth();
  const { ready: fincaReady, activa, refresh: refreshFinca } = useFincaActiva();
  const pathname = usePathname();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);

  // Si el user completó el wizard, requirió confirmación de email, y ahora
  // vuelve con sesión pero sin finca → completar automáticamente aquí.
  useEffect(() => {
    if (!ready || !fincaReady) return;
    if (!hasSession) return;
    if (activa) return;
    const pending = readPendingSignup();
    if (!pending) return;
    if (autoCreating) return;
    setAutoCreating(true);
    setAutoError(null);
    completarCreacionFinca(pending)
      .then(() => void refreshFinca())
      .catch((err: unknown) => {
        setAutoError((err as Error).message ?? "No pudimos crear tu finca.");
        try { window.localStorage.removeItem(PENDING_SIGNUP_KEY); } catch {}
      })
      .finally(() => setAutoCreating(false));
  }, [ready, fincaReady, hasSession, activa, autoCreating, refreshFinca]);

  // Páginas legales: públicas siempre, sin spinner ni redirect a login,
  // sin importar si hay sesión o no.
  if (pathname === "/terminos" || pathname === "/privacidad") {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Cargando…
      </div>
    );
  }

  // Prioridad máxima: si Supabase avisó que estamos en recuperación, mostrar
  // el formulario de nueva clave (aunque haya sesión válida).
  if (recoveryMode) {
    return <SetNewPasswordScreen email={authEmail} onDone={clearRecovery} />;
  }

  // Páginas públicas de la landing (/, /funciones, /precios, /preguntas).
  const seccion = RUTAS_LANDING[pathname];

  if (!hasSession) {
    if (showSignup) {
      return <SignupWizard onBack={() => setShowSignup(false)} />;
    }
    // Sin sesión en una página pública → landing (marketing). En cualquier
    // otra ruta protegida saltamos directo al login.
    if (seccion && !showLogin) {
      return (
        <LandingPage
          seccion={seccion}
          onLogin={() => setShowLogin(true)}
          onSignup={() => {
            trackPixel("Lead");
            setShowSignup(true);
          }}
        />
      );
    }
    const canGoBack = !!seccion;
    return (
      <LoginScreen
        onBackToLanding={canGoBack ? () => setShowLogin(false) : undefined}
        onGoSignup={() => {
          trackPixel("Lead");
          setShowSignup(true);
        }}
      />
    );
  }

  // Con sesión, las páginas informativas se siguen viendo; sus botones de
  // ingresar/empezar llevan a la app.
  if (seccion && seccion !== "inicio") {
    const irALaApp = () => window.location.assign("/");
    return <LandingPage seccion={seccion} onLogin={irALaApp} onSignup={irALaApp} />;
  }

  // Con sesión pero aún no sabemos si tiene finca: esperar.
  if (!fincaReady || autoCreating) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        {autoCreating ? "Terminando de armar tu finca…" : "Cargando tu finca…"}
      </div>
    );
  }

  // Sesión sin finca → wizard de onboarding (crear la primera finca).
  if (!activa) {
    return <OnboardingWizard email={authEmail} initialError={autoError} />;
  }

  // Sesión con finca pero el usuario no está vinculado como propietario.
  // Puede pasar si el usuario fue invitado por un admin pero aún no se
  // creó su fila en `propietarios`. Mostramos aviso claro.
  if (!user) {
    return <NoPropietarioScreen email={authEmail} fincaNombre={activa.nombre} />;
  }

  return <>{children}</>;
}

type Mode = "login" | "reset";

function LoginScreen({
  onBackToLanding,
  onGoSignup,
}: {
  onBackToLanding?: () => void;
  onGoSignup?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Correo esperando el código de confirmación (registro sin confirmar).
  const [codigoPara, setCodigoPara] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Escribe tu email.");
      return;
    }
    if (mode !== "reset" && !password) {
      setError("Escribe tu contraseña.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await loginWithEmail(email.trim(), password);
        if (!res.ok && res.error.toLowerCase().includes("email not confirmed")) {
          // Cuenta creada pero sin confirmar: mandar código nuevo y pedirlo aquí.
          await resendSignupEmail(email.trim());
          setCodigoPara(email.trim());
        } else if (!res.ok) setError(traducirError(res.error));
      } else {
        const res = await sendPasswordReset(email.trim());
        if (!res.ok) {
          setError(traducirError(res.error));
        } else {
          setInfo(
            "Si el email existe, te llegará un enlace para crear una nueva contraseña. Revisa también spam."
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="app-bg" aria-hidden />
      <div className="app-glow-1" aria-hidden />
      <div className="app-glow-2" aria-hidden />

      {onBackToLanding && (
        <button
          type="button"
          onClick={onBackToLanding}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted hover:text-fg hover:bg-surface-2 transition"
          aria-label="Volver al inicio"
        >
          <span aria-hidden>←</span>
          <span>Inicio</span>
        </button>
      )}

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={onBackToLanding}
            disabled={!onBackToLanding}
            className="mx-auto block mb-5 transition hover:opacity-80 disabled:cursor-default"
            aria-label={onBackToLanding ? "Volver al inicio" : "RumeApp"}
          >
            <Image
              src="/logo.png"
              alt="RumeApp"
              width={160}
              height={160}
              priority
              sizes="160px"
              className="w-40 h-40 object-contain"
            />
          </button>
          <h1 className="display-lg tracking-tight font-serif">RumeApp</h1>
          <div className="text-[0.68rem] font-mono uppercase tracking-[0.14em] text-accent mt-1">
            Gestión ganadera
          </div>
          <p className="text-sm text-muted mt-3">
            {mode === "login"
              ? "Entra a tu finca"
              : "Te enviamos un enlace para restablecer tu contraseña"}
          </p>
        </div>

        <div className="card">
          {codigoPara ? (
            <div className="flex flex-col gap-3">
              <CodigoConfirmacion email={codigoPara} />
              <button
                type="button"
                className="text-[0.72rem] text-subtle hover:text-fg underline underline-offset-4 self-center"
                onClick={() => setCodigoPara(null)}
              >
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow flex items-center gap-1.5">
                <IconUser size={11} />
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoFocus
                autoComplete="email"
              />
            </div>

            {mode !== "reset" && (
              <div className="flex flex-col gap-1">
                <span className="eyebrow flex items-center gap-1.5">
                  <IconLock size={11} />
                  Contraseña
                </span>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            {info && (
              <div className="text-sm text-fg bg-primary-soft/40 px-3 py-2 rounded-lg">
                {info}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary justify-center"
              disabled={loading}
            >
              <IconUser size={14} />
              {loading
                ? mode === "login" ? "Entrando…" : "Enviando…"
                : mode === "login" ? "Entrar" : "Enviar enlace"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                className="text-[0.72rem] text-subtle hover:text-fg underline underline-offset-4 self-center"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setMode("reset");
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            <button
              type="button"
              className="btn btn-ghost justify-center"
              onClick={() => {
                setError(null);
                setInfo(null);
                if (mode === "login" && onGoSignup) onGoSignup();
                else setMode("login");
              }}
            >
              {mode === "login"
                ? "¿No tienes cuenta? Regístrate"
                : "Volver a iniciar sesión"}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SetNewPasswordScreen({
  email,
  onDone,
}: {
  email: string | null;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await updatePassword(password);
      if (!res.ok) {
        setError(traducirError(res.error));
        return;
      }
      setInfo("Contraseña actualizada. Ya puedes usar la app.");
      // Salir del modo recovery y dejar que AuthGate vuelva a renderizar
      // con la sesión ya activa (updateUser mantiene la sesión).
      setTimeout(onDone, 900);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="app-bg" aria-hidden />
      <div className="app-glow-1" aria-hidden />
      <div className="app-glow-2" aria-hidden />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="display-lg tracking-tight font-serif">Nueva contraseña</h1>
          <p className="text-sm text-muted mt-3">
            Elige una contraseña nueva para {email ?? "tu cuenta"}.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow flex items-center gap-1.5">
                <IconLock size={11} />
                Nueva contraseña
              </span>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Al menos 8 caracteres"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="eyebrow flex items-center gap-1.5">
                <IconLock size={11} />
                Confirma
              </span>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            {info && (
              <div className="text-sm text-fg bg-primary-soft/40 px-3 py-2 rounded-lg">
                {info}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary justify-center"
              disabled={loading}
            >
              <IconLock size={14} />
              {loading ? "Guardando…" : "Guardar contraseña"}
            </button>

            <button
              type="button"
              className="btn btn-ghost justify-center"
              onClick={() => void logout()}
            >
              Cancelar y cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function NoPropietarioScreen({
  email,
  fincaNombre,
}: {
  email: string | null;
  fincaNombre: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center card">
        <h2 className="display-lg font-serif mb-2">Cuenta sin vincular</h2>
        <p className="text-sm text-muted mb-4">
          Iniciaste sesión con <strong>{email ?? "?"}</strong> y perteneces a la finca{" "}
          <strong>{fincaNombre}</strong>, pero todavía no tienes un perfil de propietario.
          Pídele al owner de la finca que te agregue en la sección de socios, o cierra sesión.
        </p>
        <button className="btn" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "El email todavía no está confirmado.";
  if (m.includes("already registered") || m.includes("already exists"))
    return "Ese email ya está registrado. Inicia sesión.";
  if (m.includes("password")) return msg; // deja el mensaje de Supabase (limitaciones de fuerza)
  return msg;
}
