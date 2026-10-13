"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { CUPOS_FUNDADOR, DIAS_GARANTIA, PLAN_LIMITS, PRECIO_FUNDADOR, cop } from "@/lib/plans";

// Plan Fundador: plan Ganadero por $150.000 el año, precio para siempre, para
// las primeras 50 fincas. Los cupos que quedan salen de cupos_fundador() (la
// puede llamar cualquiera, también la landing sin sesión). Si ya no quedan
// cupos no se muestra, salvo a una finca que ya es fundadora (para renovar).

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

/** Cupos que quedan del plan Fundador (null mientras carga o si falla). */
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
  const cupos = useCuposFundador();
  if (!esFundador && (cupos === null || cupos <= 0)) return null;
  const precioNormal = PLAN_LIMITS.ganadero.precioCOP * 12;

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
          {esFundador
            ? "Usted es Fundador"
            : `Plan Fundador · quedan ${cupos} de ${CUPOS_FUNDADOR} cupos`}
        </div>
        <h2 className="text-xl md:text-2xl font-bold leading-tight">
          {esFundador
            ? `Renueve su plan Ganadero por ${cop(PRECIO_FUNDADOR)} el año`
            : `Plan Ganadero por ${cop(PRECIO_FUNDADOR)} el año, con ese precio para siempre`}
        </h2>
        <ul className="text-sm space-y-1.5 opacity-90">
          <li>
            ✓ Equivale a <b>{cop(PRECIO_FUNDADOR / 12)} al mes</b> (normalmente son {cop(precioNormal)} al año).
          </li>
          <li>✓ Cada año renueva al mismo precio, aunque la tarifa suba.</li>
          <li>✓ Hasta {PLAN_LIMITS.ganadero.maxAnimales} animales, reparto entre socios y avisos de vacunas, purgas y partos.</li>
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
        {!esFundador && (
          <span className="text-[0.7rem] opacity-70 md:text-right">
            Solo para las primeras {CUPOS_FUNDADOR} fincas.
          </span>
        )}
      </div>
    </section>
  );
}
