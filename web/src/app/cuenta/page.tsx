"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useFincaActiva } from "@/lib/useFincaActiva";
import { logout } from "@/lib/auth";
import {
  MiPerfil,
  cargarMiPerfil,
  guardarMiPerfil,
  cambiarMiPassword,
  cambiarMiEmail,
  cargarRecordatorios,
  guardarRecordatorios,
} from "@/lib/cuenta";
import { planLabel, planEfectivo, diasDePruebaRestantes, fmtPrecio } from "@/lib/plans";
import { ROL_LABEL } from "@/lib/equipo";
import { DEPARTAMENTOS_CO } from "@/lib/colombia";
import FormRow from "@/components/FormRow";
import PasswordInput from "@/components/PasswordInput";
import { IconLogout } from "@/components/icons";

export default function CuentaPage() {
  const { authEmail } = useAuth();
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    cargarMiPerfil().then(setPerfil, (e: Error) => setErr(e.message));
  }, []);

  if (err) return <div className="card text-sm text-danger">{err}</div>;
  if (!perfil) return <div className="text-muted">Cargando…</div>;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <PerfilCard inicial={perfil} email={authEmail ?? ""} />
      <PlanCard />
      <RecordatoriosCard />
      <PasswordCard />
      <EmailCard email={authEmail ?? ""} />
      <div className="card flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold">Cerrar sesión</div>
          <p className="text-xs text-muted mt-0.5">Sales de RumeApp en este dispositivo.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => void logout()}>
          <IconLogout size={14} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function Mensaje({ ok, error }: { ok: string | null; error: string | null }) {
  if (error)
    return <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>;
  if (ok)
    return (
      <div
        className="text-sm px-3 py-2 rounded-lg"
        style={{ background: "rgba(184, 206, 122, 0.25)", color: "var(--fg)" }}
      >
        {ok}
      </div>
    );
  return null;
}

// ---------------------------------------------------------------------------
// Perfil: foto + datos personales
// ---------------------------------------------------------------------------

function PerfilCard({ inicial, email }: { inicial: MiPerfil; email: string }) {
  const [p, setP] = useState<MiPerfil>(inicial);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const iniciales = (p.nombre || email).slice(0, 2).toUpperCase();

  function set<K extends keyof MiPerfil>(k: K, v: MiPerfil[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
    setOk(null);
  }

  async function onFoto(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Solo se aceptan imágenes.");
      return;
    }
    setProcesando(true);
    try {
      set("avatar", await fotoCuadrada(file, 256));
    } catch {
      setError("No se pudo procesar la imagen.");
    } finally {
      setProcesando(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setSaving(true);
    try {
      await guardarMiPerfil(p);
      setOk("Datos guardados.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={guardar} className="card space-y-5">
      <div>
        <div className="eyebrow">Tu perfil</div>
        <div className="text-base font-semibold mt-1">Información personal</div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div
          className="w-20 h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xl font-mono font-semibold relative"
          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
        >
          {p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar} alt="Tu foto" className="w-full h-full object-cover" />
          ) : (
            iniciales
          )}
          {procesando && (
            <div className="absolute inset-0 bg-black/50 text-white text-[0.6rem] flex items-center justify-center">
              …
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFoto(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={procesando}
          >
            {p.avatar ? "Cambiar foto" : "Subir foto"}
          </button>
          {p.avatar && (
            <button type="button" className="btn btn-ghost" onClick={() => set("avatar", null)}>
              Quitar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormRow label="Nombre">
          <input
            type="text"
            value={p.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="Tu nombre"
            maxLength={80}
            autoComplete="name"
          />
        </FormRow>
        <FormRow label="Teléfono / WhatsApp">
          <input
            type="tel"
            value={p.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            placeholder="+57 300 123 4567"
            autoComplete="tel"
          />
        </FormRow>
        <FormRow label="Departamento">
          <select value={p.departamento} onChange={(e) => set("departamento", e.target.value)}>
            <option value="">Selecciona…</option>
            {DEPARTAMENTOS_CO.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Municipio">
          <input
            type="text"
            value={p.ciudad}
            onChange={(e) => set("ciudad", e.target.value)}
            placeholder="Ej. Montería"
            maxLength={80}
          />
        </FormRow>
      </div>

      <Mensaje ok={ok} error={error} />

      <button type="submit" className="btn btn-primary" disabled={saving || procesando}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

// Recorta al centro y reduce a un cuadrado de `size` px (JPEG ~10–30 KB).
async function fotoCuadrada(file: File, size: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("imagen inválida"));
      i.src = url;
    });
    const lado = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("sin canvas");
    ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Plan de la finca activa
// ---------------------------------------------------------------------------

function PlanCard() {
  const { authUserId } = useAuth();
  const { activa } = useFincaActiva();
  if (!activa) return null;

  const plan = planEfectivo(activa);
  const dias = diasDePruebaRestantes(activa);
  const enPrueba = dias > 0 && activa.plan === plan;
  const esOwner = activa.ownerUserId === authUserId;

  return (
    <section
      className="rounded-2xl p-5 flex items-center gap-4 flex-wrap"
      style={{ background: "var(--forest)", color: "white" }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="text-[0.68rem] font-mono uppercase tracking-[0.14em]"
          style={{ color: "var(--lime-bright)" }}
        >
          Plan de {activa.nombre}
        </div>
        <div className="text-2xl font-bold mt-1">
          {planLabel(plan)} <span className="text-base font-medium opacity-80">· {fmtPrecio(plan)}</span>
        </div>
        <div className="text-sm mt-1 opacity-80">
          {enPrueba
            ? `Prueba gratis: te quedan ${dias} día${dias === 1 ? "" : "s"}.`
            : activa.planPagado
            ? "Plan activo."
            : "Plan gratis."}{" "}
          Tu rol en esta finca: {esOwner ? ROL_LABEL.owner : "miembro del equipo"}.
        </div>
      </div>
      <Link
        href="/plan"
        className="btn"
        style={{ background: "var(--lime)", color: "var(--forest)", fontWeight: 600 }}
      >
        {esOwner ? "Actualizar plan" : "Ver planes"}
      </Link>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contraseña
// ---------------------------------------------------------------------------

/** Interruptor del correo diario "Hoy toca" (lo manda la Edge Function recordatorios). */
function RecordatoriosCard() {
  const [activo, setActivo] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarRecordatorios().then(setActivo, () => setActivo(true));
  }, []);

  async function cambiar() {
    if (activo === null) return;
    const nuevo = !activo;
    setGuardando(true);
    setError(null);
    try {
      await guardarRecordatorios(nuevo);
      setActivo(nuevo);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Avisos</div>
          <div className="text-base font-semibold mt-1">Correo diario «Hoy toca»</div>
          <p className="text-sm text-muted mt-1">
            Cada mañana a las 6:00 le llega un correo con lo atrasado, lo de hoy y lo de mañana:
            actividades, vacunas, purgas y partos. Solo los días en que hay algo.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!activo}
          aria-label="Recibir el correo diario"
          disabled={activo === null || guardando}
          onClick={cambiar}
          className={`relative shrink-0 w-12 h-7 rounded-full transition ${activo ? "bg-primary" : "bg-rule"}`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${activo ? "left-6" : "left-1"}`}
          />
        </button>
      </div>
      <p className="text-xs text-muted">{activo === null ? "Cargando…" : activo ? "Activado" : "Apagado"}</p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}

function PasswordCard() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirma, setConfirma] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (nueva.length < 8) return setError("La contraseña nueva debe tener al menos 8 caracteres.");
    if (nueva !== confirma) return setError("Las dos contraseñas nuevas no coinciden.");
    setSaving(true);
    try {
      await cambiarMiPassword(actual, nueva);
      setActual("");
      setNueva("");
      setConfirma("");
      setOk("Contraseña cambiada. La próxima vez entra con la nueva.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={guardar} className="card space-y-4">
      <div>
        <div className="eyebrow">Seguridad</div>
        <div className="text-base font-semibold mt-1">Cambiar contraseña</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormRow label="Contraseña actual">
          <PasswordInput
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoComplete="current-password"
          />
        </FormRow>
        <FormRow label="Nueva" hint="Mínimo 8 caracteres">
          <PasswordInput
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="new-password"
          />
        </FormRow>
        <FormRow label="Repite la nueva">
          <PasswordInput
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            autoComplete="new-password"
          />
        </FormRow>
      </div>
      <p className="text-xs text-muted">
        ¿No recuerdas la actual? Cierra sesión y usa &quot;Olvidé mi contraseña&quot; en la pantalla
        de ingreso.
      </p>
      <Mensaje ok={ok} error={error} />
      <button type="submit" className="btn btn-primary" disabled={saving || !actual || !nueva}>
        {saving ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Correo
// ---------------------------------------------------------------------------

function EmailCard({ email }: { email: string }) {
  const [nuevo, setNuevo] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!nuevo.includes("@")) return setError("Escribe un correo válido.");
    if (nuevo.trim().toLowerCase() === email.toLowerCase())
      return setError("Ese ya es tu correo actual.");
    setSaving(true);
    try {
      await cambiarMiEmail(nuevo);
      setOk(
        `Te enviamos un enlace de confirmación a ${nuevo.trim()} (si también te llega uno a ${email}, ábrelo). Mientras no lo confirmes, sigues entrando con ${email}.`
      );
      setNuevo("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={guardar} className="card space-y-4">
      <div>
        <div className="eyebrow">Correo de ingreso</div>
        <div className="text-base font-semibold mt-1">{email}</div>
      </div>
      <FormRow label="Correo nuevo">
        <input
          type="email"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="nuevo@correo.com"
          autoComplete="email"
        />
      </FormRow>
      <Mensaje ok={ok} error={error} />
      <button type="submit" className="btn btn-ghost" disabled={saving || !nuevo}>
        {saving ? "Enviando…" : "Cambiar correo"}
      </button>
    </form>
  );
}
