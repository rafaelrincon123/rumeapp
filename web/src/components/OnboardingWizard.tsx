"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { crearFinca } from "@/lib/useFincaActiva";
import { logout } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { IconLogout } from "./icons";

interface Props {
  email: string | null;
  initialError?: string | null;
}

// Primer paso ya con la cuenta creada: solo el nombre de la finca. El nombre
// y el WhatsApp de la persona vienen del registro (metadatos del usuario);
// si no están (cuentas viejas o creadas por otra vía) se pide el nombre aquí.
export default function OnboardingWizard({ email, initialError }: Props) {
  const [nombreFinca, setNombreFinca] = useState("");
  const [nombrePropietario, setNombrePropietario] = useState("");
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [nombreDelRegistro, setNombreDelRegistro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    void getSupabase().auth.getUser().then(({ data }) => {
      const meta = (data.user?.user_metadata ?? {}) as { nombre?: string; whatsapp?: string };
      if (meta.nombre?.trim()) {
        setNombrePropietario(meta.nombre.trim());
        setNombreDelRegistro(true);
      }
      if (meta.whatsapp?.trim()) setWhatsapp(meta.whatsapp.trim());
    });
  }, []);

  const primerNombre = nombrePropietario.split(" ")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombreFinca.trim()) {
      setError("Escriba el nombre de su finca.");
      return;
    }
    setLoading(true);
    try {
      await crearFinca({
        nombre: nombreFinca.trim(),
        timezone: "America/Bogota",
        nombrePropietario: nombrePropietario.trim() || undefined,
        telefono: whatsapp,
      });
      // La finca activa ya quedó guardada; el AuthGate re-renderiza solo.
    } catch (err) {
      setError((err as Error).message ?? "No se pudo crear la finca. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <div className="app-bg" aria-hidden />
      <div className="app-glow-1" aria-hidden />
      <div className="app-glow-2" aria-hidden />

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
            {primerNombre && nombreDelRegistro ? `¡Bienvenido, ${primerNombre}!` : "¡Bienvenido a RumeApp!"}
          </h1>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto">
            Su cuenta ya está lista. Solo falta un dato para empezar.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow">¿Cómo se llama su finca?</span>
              <input
                type="text"
                value={nombreFinca}
                onChange={(e) => setNombreFinca(e.target.value)}
                placeholder="Ej. Finca El Palmar"
                autoFocus
                maxLength={80}
              />
            </div>

            {!nombreDelRegistro && (
              <div className="flex flex-col gap-1">
                <span className="eyebrow">
                  Su nombre <span className="normal-case tracking-normal opacity-70">(opcional)</span>
                </span>
                <input
                  type="text"
                  value={nombrePropietario}
                  onChange={(e) => setNombrePropietario(e.target.value)}
                  placeholder="Así aparece en gastos y tareas"
                  maxLength={60}
                  autoComplete="name"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>
            )}

            <button type="submit" className="btn btn-primary justify-center" disabled={loading}>
              {loading ? "Creando…" : "Entrar a mi finca →"}
            </button>

            <p className="text-[0.7rem] text-subtle text-center">
              Empieza en el plan gratis (hasta 5 animales). Puede cambiarlo cuando quiera.
            </p>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-[0.7rem] text-subtle">
          {email && <span className="font-mono">{email}</span>}
          <button
            type="button"
            className="inline-flex items-center gap-1 underline"
            onClick={() => void logout()}
          >
            <IconLogout size={11} />
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
