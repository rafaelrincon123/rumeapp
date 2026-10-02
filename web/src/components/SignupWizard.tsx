"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signupWithEmail } from "@/lib/auth";
import CodigoConfirmacion from "./CodigoConfirmacion";
import { crearFinca } from "@/lib/useFincaActiva";
import { PLAN_LIMITS, fmtPrecio, CURSO_REGALO } from "@/lib/plans";
import type { PlanFinca } from "@/lib/types";
import { IconUser, IconLock } from "./icons";
import PasswordInput from "./PasswordInput";
import { DEPARTAMENTOS_CO } from "@/lib/colombia";

const PLAN_ORDER: PlanFinca[] = ["ranchero", "ganadero", "hacienda"];

function planRecomendado(n: number | null): PlanFinca {
  if (n === null || n <= 0) return "ranchero";
  if (n > PLAN_LIMITS.ganadero.maxAnimales!) return "hacienda";
  if (n > PLAN_LIMITS.ranchero.maxAnimales!) return "ganadero";
  return "ranchero";
}

const TZS = [
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Mexico_City", label: "México (CDMX)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
];

const REFERIDO_OPTS = [
  { value: "", label: "Prefiero no decir" },
  { value: "referido", label: "Un ganadero me lo recomendó" },
  { value: "google", label: "Búsqueda en Google" },
  { value: "instagram", label: "Instagram / redes sociales" },
  { value: "youtube", label: "YouTube" },
  { value: "whatsapp", label: "Un grupo de WhatsApp" },
  { value: "otro", label: "Otro" },
];

// Cuando el signup requiere confirmación por email, guardamos los datos
// del wizard para completar la creación de la finca cuando el user haga
// login por primera vez. El AuthGate lee esta clave.
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Paso 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  // Paso 2
  const [telefono, setTelefono] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [referidoVia, setReferidoVia] = useState("");
  // Paso 3
  const [nombreFinca, setNombreFinca] = useState("");
  const [tamanoAprox, setTamanoAprox] = useState<string>("");
  const [timezone, setTimezone] = useState("America/Bogota");
  const [plan, setPlan] = useState<PlanFinca>("ranchero");
  const [planTocadoAMano, setPlanTocadoAMano] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function goNext() {
    setError(null);
    if (step === 1) {
      if (!email.trim() || !password || !nombre.trim()) {
        setError("Completa tu email, contraseña y nombre.");
        return;
      }
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Contacto es opcional pero recomendamos teléfono
      setStep(3);
    }
  }

  function goBack() {
    setError(null);
    if (step === 1) onBack();
    else setStep((s) => (s - 1) as 1 | 2);
  }

  async function handleFinish() {
    setError(null);
    setInfo(null);
    if (!nombreFinca.trim()) {
      setError("Ponle un nombre a tu finca.");
      return;
    }
    const tamanoNum = tamanoAprox.trim() ? Number(tamanoAprox) : null;
    if (tamanoNum !== null && (Number.isNaN(tamanoNum) || tamanoNum < 0)) {
      setError("El tamaño debe ser un número.");
      return;
    }

    setLoading(true);
    try {
      const signup = await signupWithEmail(email.trim(), password, {
        nombre: nombre.trim(),
        whatsapp: telefono.trim(),
        departamento,
      });
      if (!signup.ok) {
        setError(traducirError(signup.error));
        return;
      }

      const pending: PendingSignup = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        departamento,
        ciudad: ciudad.trim(),
        referidoVia,
        nombreFinca: nombreFinca.trim(),
        tamanoAprox: tamanoNum,
        timezone,
        planElegido: plan,
      };

      if (signup.needsConfirmation) {
        // Guarda para completar cuando el user confirme e inicie sesión.
        try {
          localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));
        } catch {
          /* ignore */
        }
        setInfo(
          "Te enviamos un código al correo"
        );
        return;
      }

      // Sesión activa (auto-confirm ON en Supabase) → crear la finca ya
      await completarCreacionFinca(pending);
      // AuthGate re-renderea solo al detectar la finca
    } catch (err) {
      setError((err as Error).message ?? "Algo salió mal, intenta de nuevo.");
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
        onClick={goBack}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted hover:text-fg hover:bg-surface-2 transition"
        aria-label={step === 1 ? "Volver" : "Paso anterior"}
      >
        <span aria-hidden>←</span>
        <span>{step === 1 ? "Volver" : "Atrás"}</span>
      </button>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <Image
            src="/logo.png"
            alt="RumeApp"
            width={96}
            height={96}
            priority
            sizes="96px"
            className="mx-auto mb-3 w-24 h-24 object-contain"
          />
          <h1 className="display-md tracking-tight font-serif">Crea tu cuenta</h1>
          <div className="mt-3 flex items-center justify-center gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  n === step ? "w-8 bg-primary" : n < step ? "w-8 bg-primary/50" : "w-6 bg-rule"
                }`}
                aria-label={`Paso ${n} de 3`}
              />
            ))}
          </div>
          <p className="text-[0.7rem] font-mono uppercase tracking-[0.14em] text-subtle mt-3">
            Paso {step} de 3 · {step === 1 ? "Cuenta" : step === 2 ? "Contacto" : "Tu finca"}
          </p>
        </div>

        <div className="card">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="eyebrow flex items-center gap-1.5">
                  <IconUser size={11} />
                  Nombre completo
                </span>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Cómo apareces en tu finca"
                  autoFocus
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
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
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Teléfono / WhatsApp</span>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+57 300 123 4567"
                  autoComplete="tel"
                  autoFocus
                />
                <span className="text-[0.68rem] text-subtle">
                  Para ayudarte si el código no te llega o algo falla, y para alertas por WhatsApp (planes pagos).
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Departamento</span>
                <select
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  autoComplete="address-level1"
                >
                  <option value="">— Selecciona —</option>
                  {DEPARTAMENTOS_CO.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Ciudad o municipio (opcional)</span>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Dónde está la finca"
                  autoComplete="address-level2"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">¿Cómo te enteraste de RumeApp?</span>
                <select
                  value={referidoVia}
                  onChange={(e) => setReferidoVia(e.target.value)}
                >
                  {REFERIDO_OPTS.map((o) => (
                    <option key={o.label} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Nombre de la finca</span>
                <input
                  type="text"
                  value={nombreFinca}
                  onChange={(e) => setNombreFinca(e.target.value)}
                  placeholder="Ej. Hacienda El Palmar"
                  maxLength={80}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">¿Cuántos animales tienes aproximadamente?</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={tamanoAprox}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTamanoAprox(v);
                    if (!planTocadoAMano) {
                      setPlan(planRecomendado(v.trim() ? Number(v) : null));
                    }
                  }}
                  placeholder="Ej. 25"
                  min={0}
                  max={100000}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">¿Qué plan quiere?</span>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {PLAN_ORDER.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPlan(p);
                        setPlanTocadoAMano(true);
                      }}
                      className="rounded-xl border p-3 text-left transition"
                      style={{
                        borderColor: plan === p ? "var(--forest)" : "var(--rule)",
                        borderWidth: plan === p ? 2 : 1,
                        background: plan === p ? "var(--primary-soft)" : "transparent",
                      }}
                    >
                      <div className="text-sm font-bold" style={{ color: "var(--forest)" }}>
                        {PLAN_LIMITS[p].nombre}
                      </div>
                      <div className="text-[0.68rem] text-muted mt-0.5">{fmtPrecio(p)}</div>
                      <div className="text-[0.62rem] text-subtle mt-1">
                        {PLAN_LIMITS[p].maxAnimales ?? "∞"} animales
                      </div>
                    </button>
                  ))}
                </div>
                <span className="text-[0.68rem] text-subtle mt-1">
                  {plan === "ranchero"
                    ? "El plan Ranchero es gratis para siempre — sin límite de tiempo."
                    : `Su finca arranca gratis en Ranchero. Al terminar lo llevamos a activar ${PLAN_LIMITS[plan].nombre}, y al confirmar su pago le enviamos de regalo el ${CURSO_REGALO}.`}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Zona horaria</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {TZS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          {info && (
            <div className="mt-4 text-fg bg-primary-soft/40 px-3 py-3 rounded-lg">
              <CodigoConfirmacion email={email.trim()} />
            </div>
          )}

          <div className={`mt-6 flex gap-2 ${info ? "hidden" : ""}`}>
            {step < 3 ? (
              <button
                type="button"
                className="btn btn-primary justify-center flex-1"
                onClick={goNext}
                disabled={loading}
              >
                Siguiente
                <span aria-hidden>→</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary justify-center flex-1"
                onClick={handleFinish}
                disabled={loading || !!info}
              >
                <IconUser size={14} />
                {loading ? "Creando…" : info ? "Revisa tu correo" : "Crear mi cuenta"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[0.7rem] text-subtle mt-4">
          Al continuar aceptas nuestros{" "}
          <Link href="/terminos" target="_blank" className="underline">
            términos
          </Link>{" "}
          y{" "}
          <Link href="/privacidad" target="_blank" className="underline">
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/**
 * Completa la creación de la finca usando los datos del wizard.
 * Idempotente: si ya existe una finca del user, no hace nada.
 * Llamado desde el wizard (auto-confirm ON) y desde AuthGate (post-confirm).
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
  // Toda finca nueva arranca en Ranchero (ya no hay prueba gratis). Si eligió
  // un plan pago, lo llevamos directo a activarlo.
  const plan = p.planElegido ?? "ranchero";
  if (plan !== "ranchero" && typeof window !== "undefined") {
    window.location.assign(`/plan?activar=${plan}`);
  }
}

function traducirError(e: string): string {
  const lc = e.toLowerCase();
  if (lc.includes("already registered") || lc.includes("user already"))
    return "Ese email ya tiene cuenta. Inicia sesión.";
  if (lc.includes("invalid email") || lc.includes("valid email"))
    return "El email no es válido.";
  if (lc.includes("password"))
    return "Contraseña inválida (mínimo 8 caracteres).";
  return e;
}
