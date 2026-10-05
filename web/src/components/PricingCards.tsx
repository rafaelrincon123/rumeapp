"use client";

import type { PlanFinca } from "@/lib/types";
import { useState } from "react";
import {
  PLAN_LIMITS,
  DESCUENTO_ANUAL,
  type Periodo,
  cop,
  precioPeriodo,
  precioMesAnual,
  CURSO_REGALO,
} from "@/lib/plans";
import { IconCheck, IconCow, IconPasture, IconHome } from "./icons";

// Tarjetas de precios compartidas por la landing (sección Precios) y la
// página /plan. Única fuente de textos, features y precios (mensual y anual).

export const PLAN_ORDER: PlanFinca[] = ["ranchero", "ganadero", "hacienda"];

interface Feature {
  texto: string;
  proximamente?: boolean;
}

const INFO: Record<
  PlanFinca,
  { tagline: string; paraQuien: string; Icon: typeof IconCow; features: Feature[] }
> = {
  ranchero: {
    tagline: "Para empezar a llevar el control",
    paraQuien: "Fincas pequeñas o quien quiere probar sin compromiso.",
    Icon: IconPasture,
    features: [
      { texto: "Hato, sanidad, gastos y actividades" },
      { texto: "1 editor + hasta 4 personas en solo lectura" },
      { texto: "Funciona en celular y computador" },
      { texto: "Soporte por correo" },
    ],
  },
  ganadero: {
    tagline: "Para la finca familiar con socios",
    paraQuien: "Operaciones en crecimiento que reparten gastos entre socios.",
    Icon: IconCow,
    features: [
      { texto: "Todo lo del plan Ranchero" },
      { texto: "Cualquier rol para tu equipo" },
      { texto: "Reparto de gastos entre socios" },
      { texto: "Reportes en PDF de cada sección" },
      { texto: "Soporte prioritario" },
      { texto: "Alertas por WhatsApp", proximamente: true },
    ],
  },
  hacienda: {
    tagline: "Sin límites, para grupos de fincas",
    paraQuien: "Haciendas grandes o quien administra varias fincas.",
    Icon: IconHome,
    features: [
      { texto: "Todo lo del plan Ganadero" },
      { texto: "Animales, personas y fincas ilimitados" },
      { texto: "Reportes en PDF de cada sección" },
      { texto: "Soporte dedicado" },
      { texto: "Alertas por WhatsApp", proximamente: true },
    ],
  },
};

const FEATURED: PlanFinca = "ganadero";

function lim(n: number | null): string {
  return n === null ? "∞" : String(n);
}

const PCT_ANUAL = Math.round(DESCUENTO_ANUAL * 100);

/** Selector Mensual / Anual. */
function SelectorPeriodo({ periodo, onChange }: { periodo: Periodo; onChange: (p: Periodo) => void }) {
  const opciones: { v: Periodo; label: string }[] = [
    { v: "mensual", label: "Mensual" },
    { v: "anual", label: `Anual · −${PCT_ANUAL}%` },
  ];
  return (
    <div className="flex justify-center">
      <div
        role="radiogroup"
        aria-label="Forma de pago"
        className="inline-flex p-1 rounded-full"
        style={{ background: "rgba(20, 38, 26, 0.07)", border: "1px solid rgba(20, 38, 26, 0.10)" }}
      >
        {opciones.map((o) => {
          const activo = periodo === o.v;
          return (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onChange(o.v)}
              className="px-5 py-2 rounded-full text-[0.78rem] font-semibold uppercase tracking-[0.08em] transition"
              style={
                activo
                  ? { background: "var(--forest)", color: "var(--sand)" }
                  : { background: "transparent", color: "var(--forest)" }
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PricingCards({
  planActual,
  onSelect,
  ctaLabel,
}: {
  /** Plan vigente de la finca (en /plan). En la landing, omitir. */
  planActual?: PlanFinca;
  onSelect: (plan: PlanFinca, periodo: Periodo) => void;
  /** Texto del botón; por defecto depende del contexto. */
  ctaLabel?: (plan: PlanFinca) => string;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("mensual");
  return (
    <div className="space-y-8">
      <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-4 lg:gap-6 items-stretch pt-3">
        {PLAN_ORDER.map((p) => (
          <Card
            key={p}
            plan={p}
            periodo={periodo}
            planActual={planActual}
            onSelect={onSelect}
            ctaLabel={ctaLabel}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  plan,
  periodo,
  planActual,
  onSelect,
  ctaLabel,
}: {
  plan: PlanFinca;
  periodo: Periodo;
  planActual?: PlanFinca;
  onSelect: (plan: PlanFinca, periodo: Periodo) => void;
  ctaLabel?: (plan: PlanFinca) => string;
}) {
  const limits = PLAN_LIMITS[plan];
  const info = INFO[plan];
  const dark = plan === FEATURED;
  const gratis = limits.precioCOP === 0;
  const anual = periodo === "anual" && !gratis;
  const esActual = planActual === plan;
  const esBajar =
    planActual !== undefined && PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(planActual);

  const fg = dark ? "var(--sand)" : "var(--forest)";
  const soft = dark ? "rgba(239, 232, 216, 0.7)" : "rgba(20, 38, 26, 0.62)";
  const line = dark ? "rgba(239, 232, 216, 0.14)" : "rgba(20, 38, 26, 0.09)";

  const cta = ctaLabel
    ? ctaLabel(plan)
    : planActual === undefined
    ? plan === "ranchero"
      ? "Empezar gratis"
      : `Elegir ${limits.nombre}`
    : `Cambiar a ${limits.nombre}`;

  return (
    <div
      className={
        "relative rounded-[1.75rem] flex flex-col transition-transform duration-200 " +
        (dark ? "md:-translate-y-3 order-first md:order-none" : "hover:-translate-y-1")
      }
      style={{
        background: dark
          ? "linear-gradient(165deg, var(--forest-2) 0%, var(--forest) 55%)"
          : "#FFFFFF",
        color: fg,
        border: esActual
          ? "2px solid var(--forest-3)"
          : dark
          ? "1.5px solid rgba(200, 222, 134, 0.55)"
          : "1px solid rgba(20, 38, 26, 0.10)",
        boxShadow: dark
          ? "0 36px 70px -28px rgba(20, 38, 26, 0.65)"
          : "0 18px 40px -26px rgba(20, 38, 26, 0.28)",
      }}
    >
      {(dark || esActual) && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3.5 py-1 rounded-full text-[0.6rem] font-mono uppercase tracking-[0.16em] font-semibold"
          style={
            esActual
              ? { background: "var(--forest-3)", color: "#fff" }
              : { background: "var(--lime)", color: "var(--forest)" }
          }
        >
          {esActual ? "Tu plan actual" : "★ Recomendado"}
        </div>
      )}

      {/* Encabezado */}
      <div className="px-6 pt-7 pb-5 md:px-7">
        <div className="flex items-center gap-3">
          <span
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: dark ? "rgba(200, 222, 134, 0.14)" : "rgba(34, 64, 42, 0.07)",
              color: dark ? "var(--lime-bright)" : "var(--forest-2)",
            }}
          >
            <info.Icon size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="text-xl font-bold uppercase tracking-tight leading-none">{limits.nombre}</h3>
            <div className="text-[0.78rem] mt-1" style={{ color: soft }}>
              {info.tagline}
            </div>
          </div>
        </div>

        {/* Precio */}
        <div className="mt-6 md:min-h-[8.5rem]">
          {gratis ? (
            <>
              <div className="text-[0.62rem] font-mono uppercase tracking-[0.16em]" style={{ color: soft }}>
                Para siempre
              </div>
              <div className="text-5xl font-bold tracking-tight mt-1">Gratis</div>
              <div className="text-xs mt-2" style={{ color: soft }}>
                Sin tarjeta y sin fecha de vencimiento.
              </div>
            </>
          ) : anual ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm line-through" style={{ color: soft }}>
                  {cop(limits.precioCOP)}
                </span>
                <span
                  className="text-[0.62rem] font-mono font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                  style={
                    dark
                      ? { background: "var(--lime)", color: "var(--forest)" }
                      : { background: "var(--forest)", color: "var(--lime-bright)" }
                  }
                >
                  Ahorras {PCT_ANUAL}%
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-5xl font-bold tracking-tight">{cop(precioMesAnual(plan))}</span>
                <span className="text-sm" style={{ color: soft }}>/mes</span>
              </div>
              <div className="text-xs mt-1.5" style={{ color: soft }}>
                Un solo pago de {cop(precioPeriodo(plan, "anual"))} al año
              </div>
            </>
          ) : (
            <>
              <div className="text-[0.62rem] font-mono uppercase tracking-[0.16em]" style={{ color: soft }}>
                Pago mensual
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-5xl font-bold tracking-tight">{cop(limits.precioCOP)}</span>
                <span className="text-sm" style={{ color: soft }}>/mes</span>
              </div>
              <div className="text-xs mt-1.5" style={{ color: soft }}>
                O {cop(precioMesAnual(plan))}/mes pagando el año
              </div>
            </>
          )}
        </div>

        {/* Límites clave */}
        <div
          className="mt-5 grid grid-cols-3 rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${line}` }}
        >
          {[
            { v: lim(limits.maxAnimales), l: "Animales" },
            { v: lim(limits.maxUsuarios), l: "Personas" },
            { v: lim(limits.maxFincas), l: limits.maxFincas === 1 ? "Finca" : "Fincas" },
          ].map((s, i) => (
            <div
              key={s.l}
              className="py-3 text-center"
              style={{ borderLeft: i ? `1px solid ${line}` : undefined }}
            >
              <div className="text-xl font-bold leading-none">{s.v}</div>
              <div className="text-[0.58rem] font-mono uppercase tracking-[0.14em] mt-1.5" style={{ color: soft }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!gratis && (
        <div className="px-6 md:px-7 pb-5">
          <div
            className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={
              dark
                ? { background: "rgba(200, 222, 134, 0.14)", border: "1px solid rgba(200, 222, 134, 0.45)" }
                : { background: "rgba(184, 206, 122, 0.22)", border: "1px solid rgba(34, 64, 42, 0.18)" }
            }
          >
            <span className="text-xl leading-none mt-0.5" aria-hidden>🎓</span>
            <div className="min-w-0">
              <div className="text-[0.6rem] font-mono font-semibold uppercase tracking-[0.16em]" style={{ color: dark ? "var(--lime-bright)" : "var(--forest-3)" }}>
                De regalo
              </div>
              <div className="text-sm font-bold leading-snug">{CURSO_REGALO}</div>
              <div className="text-[0.7rem] mt-0.5" style={{ color: soft }}>
                Se lo enviamos al correo cuando confirmamos su pago.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="px-6 md:px-7 pt-5 pb-2 flex-1" style={{ borderTop: `1px solid ${line}` }}>
        <p className="text-[0.78rem] leading-relaxed" style={{ color: soft }}>
          {info.paraQuien}
        </p>
        <ul className="mt-4 space-y-2.5">
          {info.features.map((f) => (
            <li key={f.texto} className="flex items-start gap-2.5 text-sm">
              <span
                className="mt-0.5 shrink-0 w-[1.1rem] h-[1.1rem] rounded-full flex items-center justify-center"
                style={
                  f.proximamente
                    ? { border: `1px dashed ${soft}`, color: soft }
                    : dark
                    ? { background: "var(--lime)", color: "var(--forest)" }
                    : { background: "var(--forest-2)", color: "#fff" }
                }
              >
                <IconCheck size={10} strokeWidth={2.4} />
              </span>
              <span style={f.proximamente ? { color: soft } : undefined}>
                {f.texto}
                {f.proximamente && (
                  <span
                    className="ml-1.5 text-[0.55rem] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                    style={{ background: line }}
                  >
                    Pronto
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-6 md:px-7 pb-7 pt-5">
        <button
          type="button"
          disabled={esActual}
          onClick={() => onSelect(plan, periodo)}
          className="w-full rounded-full py-3.5 px-5 text-sm font-semibold uppercase tracking-[0.08em] transition disabled:cursor-default"
          style={
            esActual
              ? { background: line, color: soft }
              : esBajar
              ? { background: "transparent", color: fg, border: `1.5px solid ${line}` }
              : dark
              ? { background: "var(--lime)", color: "var(--forest)", boxShadow: "0 10px 24px -10px rgba(200,222,134,0.7)" }
              : { background: "var(--forest)", color: "var(--sand)" }
          }
        >
          {esActual ? "Plan actual" : `${cta}${esBajar ? "" : " →"}`}
        </button>
        <div className="text-[0.66rem] text-center mt-2.5" style={{ color: soft }}>
          {gratis
            ? "Sin tarjeta · Para siempre"
            : anual
            ? "Un pago al año · tarjeta, PSE o Nequi"
            : "Pago mensual · tarjeta, PSE o Nequi"}
        </div>
      </div>
    </div>
  );
}
