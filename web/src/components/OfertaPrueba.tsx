"use client";

import { useState } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { iniciarPruebaGanadero, useFincaActiva } from "@/lib/useFincaActiva";
import { trackPixel } from "@/lib/pixel";
import { DIAS_PRUEBA, PLAN_LIMITS, cop, diasDePruebaRestantes, planLabel, puedeProbar } from "@/lib/plans";
import { fmtDate } from "@/lib/format";
import { IconSparkles } from "./icons";

// El momento de llenar el plan gratis (5 animales): en vez de un aviso de
// límite, le muestra al ganadero lo que ya logró y le ofrece 15 días del plan
// Ganadero sin pagar. Si la finca ya usó su prueba, lo lleva a los planes.

interface Props {
  /**
   * "lleno" = acaba de registrar el último que cabía; "intento" = quiso
   * agregar uno más; "plan" = la ofrece la página de planes.
   */
  motivo: "lleno" | "intento" | "plan";
  /** Al activar la prueba (para seguir guardando lo que tenía escrito). */
  onActivada?: () => void;
}

export default function OfertaPrueba({ motivo, onActivada }: Props) {
  const { db } = useDB();
  const { activa } = useFincaActiva();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hastaFecha, setHastaFecha] = useState<string | null>(null);

  if (!activa || !db) return null;

  const ganadero = PLAN_LIMITS.ganadero;
  const animales = db.animales.length;
  const sanidad = db.sanidad.length;
  const gastos = db.gastos.reduce((t, g) => t + (Number(g.monto) || 0), 0);
  const tareas = db.tareas.length;
  const logros = [
    `${animales} animal${animales === 1 ? "" : "es"}`,
    sanidad > 0 && `${sanidad} vacuna${sanidad === 1 ? "" : "s"} o tratamiento${sanidad === 1 ? "" : "s"}`,
    gastos > 0 && `${cop(gastos)} en gastos anotados`,
    tareas > 0 && `${tareas} actividad${tareas === 1 ? "" : "es"}`,
  ].filter(Boolean) as string[];

  async function activar() {
    if (!activa) return;
    setCargando(true);
    setError(null);
    const res = await iniciarPruebaGanadero(activa.id);
    setCargando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    trackPixel("StartTrial", { plan: "ganadero" });
    const hasta = new Date();
    hasta.setDate(hasta.getDate() + DIAS_PRUEBA);
    setHastaFecha(hasta.toISOString());
    onActivada?.();
  }

  if (hastaFecha) {
    return (
      <div className="rounded-2xl border border-primary bg-primary-soft/40 p-4 text-center">
        <div className="mx-auto w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center">
          <IconSparkles size={20} />
        </div>
        <h3 className="mt-2 font-semibold">¡Listo! Ya tiene el plan Ganadero</h3>
        <p className="text-sm text-muted mt-1">
          Gratis hasta el {fmtDate(hastaFecha)}. Siga registrando su hato: le caben hasta{" "}
          {ganadero.maxAnimales} animales.
        </p>
      </div>
    );
  }

  const probar = puedeProbar(activa);

  return (
    <div className="rounded-2xl border border-primary bg-primary-soft/40 p-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
          <IconSparkles size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">
            {motivo === "lleno"
              ? "¡Su finca ya está andando en RumeApp!"
              : motivo === "intento"
                ? "Llegó al máximo del plan gratis"
                : `Pruebe el plan Ganadero ${DIAS_PRUEBA} días gratis`}
          </h3>
          <p className="text-sm text-muted mt-0.5">Ya lleva {logros.join(" · ")}.</p>
        </div>
      </div>

      <p className="text-sm mt-3">
        El plan gratis llega hasta {PLAN_LIMITS.ranchero.maxAnimales} animales.{" "}
        {probar ? (
          <>
            <b>Pruebe el plan Ganadero gratis por {DIAS_PRUEBA} días:</b> hasta {ganadero.maxAnimales}{" "}
            animales, todo su equipo anotando y reportes en PDF.
          </>
        ) : (
          <>
            Con el plan Ganadero ({cop(ganadero.precioCOP)} al mes) registra hasta{" "}
            {ganadero.maxAnimales} animales, todo su equipo anota y saca reportes en PDF.
          </>
        )}
      </p>

      {error && <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg mt-3">{error}</div>}

      <div className="mt-3 flex flex-col gap-1.5">
        {probar ? (
          <>
            <button type="button" className="btn btn-primary justify-center" onClick={activar} disabled={cargando}>
              {cargando ? "Activando…" : `Probar Ganadero ${DIAS_PRUEBA} días gratis`}
            </button>
            <p className="text-[0.72rem] text-subtle text-center">
              Sin tarjeta y sin compromiso. Si no paga, vuelve solo al plan gratis y no pierde nada
              de lo registrado.
            </p>
          </>
        ) : (
          <Link href="/plan" className="btn btn-primary justify-center">
            Ver planes →
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Aviso del inicio mientras dura la prueba: cuántos días le quedan y un
 * enlace a los planes. Desde 3 días antes de vencer se resalta.
 */
export function AvisoPrueba() {
  const { activa } = useFincaActiva();
  if (!activa) return null;
  const dias = diasDePruebaRestantes(activa);
  if (dias <= 0 || activa.planPagado) return null;
  const urgente = dias <= 3;
  return (
    <Link
      href="/plan"
      className={`card max-w-3xl mx-auto mb-5 p-3 md:p-4 flex items-center gap-3 ${urgente ? "border-primary" : ""}`}
    >
      <span className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
        <IconSparkles size={16} />
      </span>
      <span className="flex-1 min-w-0 text-sm">
        Está probando el plan <b>{planLabel(activa.plan)}</b> gratis: le{" "}
        {dias === 1 ? "queda 1 día" : `quedan ${dias} días`}.
        {urgente && " Para no volver al plan gratis, actívelo antes de que termine."}
      </span>
      <span className="text-sm font-semibold text-primary whitespace-nowrap">Ver planes →</span>
    </Link>
  );
}
