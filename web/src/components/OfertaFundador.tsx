"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { DIAS_GARANTIA, PLAN_LIMITS, PRECIO_FUNDADOR, cop, fundadorAbierto } from "@/lib/plans";

// Plan Fundador: plan Full por $100.000 el año, para las primeras 100 fincas.
// Al cumplir 1 año, la finca pasa al plan Full al precio vigente. No se
// muestran cupos ni fecha (decisión de Rafael); cupos_fundador() solo sirve
// para esconder la oferta cuando se completen los 100. Si ya es fundadora,
// se muestra para renovar (ya al precio Full normal, no al Fundador).

/** La persona eligió la oferta en la página pública antes de tener cuenta. */
export const QUIERE_FUNDADOR_KEY = "rumeapp:quiereFundador";

/**
 * En el inicio de la app: si llegó por la oferta Fundador de /precios, se la
 * vuelve a mostrar (ya con cuenta) hasta que la abra o la cierre.
 */
export function RecordatorioFundador() {
  const [ver, setVer] = useState(false);
  useEffect(() => {
    try {
      setVer(window.localStorage.getItem(QUIERE_FUNDADOR_KEY) === "1");
    } catch {
      /* sin almacenamiento: no se muestra */
    }
  }, []);
  if (!ver) return null;
  const olvidar = () => {
    try {
      window.localStorage.removeItem(QUIERE_FUNDADOR_KEY);
    } catch {
      /* ignore */
    }
    setVer(false);
  };
  return (
    <div className="max-w-3xl mx-auto mb-5 relative">
      <OfertaFundador
        onElegir={() => {
          olvidar();
          window.location.assign("/plan?activar=fundador");
        }}
      />
      <button
        type="button"
        onClick={olvidar}
        className="absolute top-2 right-3 text-lg leading-none opacity-70 hover:opacity-100"
        style={{ color: "var(--sand)" }}
        aria-label="Cerrar la oferta Fundador"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Cupos tomados del plan Fundador (null mientras carga o si falla la RPC).
 * Antes era "cupos que quedan"; hoy quien llama decide si mostrar la oferta
 * en función del tope (CUPOS_FUNDADOR). No se renderiza el número.
 */
export function useCuposFundador(): number | null {
  const [cupos, setCupos] = useState<number | null>(null);
  useEffect(() => {
    void getSupabase()
      .rpc("cupos_fundador")
      .then(({ data, error }) => setCupos(error ? null : (data as number)));
  }, []);
  return cupos;
}

export default function OfertaFundador({
  onElegir,
  textoBoton = "Quiero ser Fundador",
  esFundador = false,
}: {
  onElegir: () => void;
  textoBoton?: string;
  /** La finca ya pagó el plan Fundador: se muestra como renovación. */
  esFundador?: boolean;
}) {
  const cuposRestantes = useCuposFundador();
  // Ocultar cuando se completen los 100 cupos. cupos_fundador() devuelve cuántos
  // CUPOS QUEDAN (tope - tomados), así que <= 0 = agotado. null = aún cargando.
  if (!esFundador && (cuposRestantes === null || cuposRestantes <= 0 || !fundadorAbierto())) return null;
  const precioNormalAnual = PLAN_LIMITS.hacienda.precioCOP * 12;

  return (
    <section
      className="rounded-2xl p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-center"
      style={{ background: "var(--forest)", color: "var(--sand)" }}
    >
      <div className="flex-1 min-w-0 space-y-3">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.14em]"
          style={{ background: "rgba(184, 206, 122, 0.16)", border: "1px solid rgba(184, 206, 122, 0.4)", color: "var(--lime-bright)" }}
        >
          {esFundador ? "Usted es Fundador" : "Plan Fundador"}
        </div>
        <h2 className="text-xl md:text-2xl font-bold leading-tight">
          {esFundador
            ? `Su plan Full por ${cop(PRECIO_FUNDADOR)} el año como Fundador`
            : `Plan Full por ${cop(PRECIO_FUNDADOR)} el primer año`}
        </h2>
        <ul className="text-sm space-y-1.5 opacity-90">
          <li>
            ✓ Equivale a <b>{cop(Math.round(PRECIO_FUNDADOR / 12))} al mes</b> durante el primer año (pagando mes a mes serían {cop(precioNormalAnual)} al año).
          </li>
          <li>✓ Acceso completo al plan Full: animales, personas y fincas ilimitados.</li>
          <li>✓ Reparto entre socios, avisos de vacunas, purgas y partos, reportes en PDF.</li>
          <li>✓ Al cumplirse el año, su finca pasa al plan Full al precio vigente de ese momento.</li>
          {!esFundador && (
            <li>
              ✓ <b>Garantía:</b> si en {DIAS_GARANTIA} días no le sirve, le devolvemos el 100 % de su dinero.
            </li>
          )}
        </ul>
      </div>
      <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
        <div className="text-3xl font-bold" style={{ color: "var(--lime-bright)" }}>
          {cop(PRECIO_FUNDADOR)}
          <span className="text-sm font-normal opacity-75"> / año</span>
        </div>
        <button
          type="button"
          onClick={onElegir}
          className="btn justify-center font-semibold"
          style={{ background: "var(--lime-bright)", color: "var(--forest)", borderColor: "transparent" }}
        >
          {textoBoton}
        </button>
      </div>
    </section>
  );
}
