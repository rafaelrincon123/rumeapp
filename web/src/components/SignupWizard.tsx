"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { signupWithEmail } from "@/lib/auth";
import CodigoConfirmacion from "./CodigoConfirmacion";
import { crearFinca } from "@/lib/useFincaActiva";
import type { PlanFinca } from "@/lib/types";
import { IconUser, IconLock } from "./icons";
import PasswordInput from "./PasswordInput";

// Registro en UNA pantalla: nombre, WhatsApp, correo y contraseña. Lo demás
// (nombre de la finca) se pide adentro, ya con la cuenta creada, en el
// OnboardingWizard. Antes eran 3 pasos y 11 campos con precios y zona
// horaria, y la gente que llegaba de la pauta abandonaba a mitad de camino.

// Registros viejos (del wizard de 3 pasos) que quedaron esperando el código:
// el AuthGate lee esta clave y termina de crear su finca con esos datos.
export const PENDING_SIGNUP_KEY = "rumeapp:pending_signup";

export interface PendingSignup {
  nombre: string;
  telefono: string;
  departamento: string;
  ciudad: string;
  referidoVia: string;
  nombreFinca: string;
  tamanoAprox: number | null;
  timezone: string;
  planElegido: PlanFinca;
}

interface Props {
  onBack: () => void;
}

export default function SignupWizard({ onBack }: Props) {
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoPara, setCodigoPara] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !email.trim() || !password) {
      setError("Escriba su nombre, su correo y una contraseña.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (whatsapp.trim() && whatsapp.replace(/\D/g, "").length < 10) {
      setError("Revise el WhatsApp: debe tener al menos 10 números.");
      return;
    }
    setLoading(true);
    try {
      const res = await signupWithEmail(email.trim(), password, {
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
      });
      if (!res.ok) {
        const msg = traducirError(res.error);
        setError(msg);
        try { track("RegistroError", { motivo: msg.slice(0, 60) }); } catch { /* ignore */ }
        return;
      }
      // Con confirmación por correo → pedir el código aquí mismo. Sin ella
      // (auto-confirm) ya hay sesión y el AuthGate pasa solo al onboarding.
      if (res.needsConfirmation) setCodigoPara(email.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <div className="app-bg" aria-hidden />
      <div className="app-glow-1" aria-hidden />
      <div className="app-glow-2" aria-hidden />

      <button
        type="button"
        onClick={codigoPara ? () => setCodigoPara(null) : onBack}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted hover:text-fg hover:bg-surface-2 transition"
      >
        <span aria-hidden>←</span>
        <span>{codigoPara ? "Usar otro correo" : "Volver"}</span>
      </button>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <Image
            src="/logo.png"
            alt="RumeApp"
            width={80}
            height={80}
            priority
            sizes="80px"
            className="mx-auto mb-3 w-20 h-20 object-contain"
          />
          <h1 className="display-md tracking-tight font-serif">
            {codigoPara ? "Revise su correo" : "Cree su cuenta gratis"}
          </h1>
          {!codigoPara && (
            <p className="text-sm text-muted mt-2">
              Gratis hasta 5 animales. Sin tarjeta.
            </p>
          )}
        </div>

        <div className="card">
          {codigoPara ? (
            <CodigoConfirmacion email={codigoPara} />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="eyebrow flex items-center gap-1.5">
                  <IconUser size={11} />
                  Su nombre
                </span>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Jorge Hernández"
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">
                  WhatsApp <span className="normal-case tracking-normal opacity-70">(opcional)</span>
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="300 123 4567"
                  autoComplete="tel"
                />
                <span className="text-[0.68rem] text-subtle">
                  Para ayudarle si el código no le llega o algo falla.
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Correo</span>
                <input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usted@correo.com"
                  autoComplete="email"
                  autoCapitalize="none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow flex items-center gap-1.5">
                  <IconLock size={11} />
                  Contraseña
                </span>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Al menos 8 caracteres"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>
              )}

              <button type="submit" className="btn btn-primary justify-center" disabled={loading}>
                <IconUser size={14} />
                {loading ? "Creando…" : "Crear mi cuenta gratis"}
              </button>
            </form>
          )}
        </div>

        {!codigoPara && (
          <p className="text-center text-[0.7rem] text-subtle mt-4">
            Al crear su cuenta acepta los{" "}
            <Link href="/terminos" target="_blank" className="underline">
              términos
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" target="_blank" className="underline">
              política de privacidad
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Completa la creación de la finca con los datos de un registro viejo
 * (wizard de 3 pasos). Idempotente vía crearFinca. Llamado desde AuthGate.
 */
export async function completarCreacionFinca(p: PendingSignup): Promise<void> {
  await crearFinca({
    nombre: p.nombreFinca,
    timezone: p.timezone,
    nombrePropietario: p.nombre,
    tamanoAprox: p.tamanoAprox,
    telefono: p.telefono || null,
    departamento: p.departamento || null,
    ciudad: p.ciudad || null,
    referidoVia: p.referidoVia || null,
    planElegido: p.planElegido ?? "ranchero",
  });
  try {
    localStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    /* ignore */
  }
  const plan = p.planElegido ?? "ranchero";
  if (plan !== "ranchero" && typeof window !== "undefined") {
    window.location.assign(`/plan?activar=${plan}`);
  }
}

function traducirError(e: string): string {
  const lc = e.toLowerCase();
  if (lc.includes("already registered") || lc.includes("user already"))
    return "Ese correo ya tiene cuenta. Toque «Volver» e ingrese.";
  if (lc.includes("invalid email") || lc.includes("valid email"))
    return "El correo no es válido. Revíselo.";
  if (lc.includes("password"))
    return "Contraseña inválida (mínimo 8 caracteres).";
  if (lc.includes("rate limit") || lc.includes("security purposes"))
    return "Demasiados intentos. Espere un minuto y vuelva a intentar.";
  return e;
}
