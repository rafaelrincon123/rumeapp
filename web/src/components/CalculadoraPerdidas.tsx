"use client";

import { useMemo, useState } from "react";
import type { PlanFinca } from "@/lib/types";
import { PLAN_LIMITS, precioPeriodo } from "@/lib/plans";

// Calculadora "¿Cuánto le cuesta no llevar el control?" de la landing.
// Es una estimación ilustrativa: los supuestos están a la vista y el
// ganadero los puede ajustar. Nada de cifras mágicas escondidas.

const SUPUESTOS_INICIALES = {
  sanidad: 1, // % del valor del hato al año: muertes/enfermedades por vacunas o tratamientos atrasados
  reproduccion: 2, // % del valor del hato al año: celos no vistos y partos que se atrasan
  gastos: 5, // % del gasto anual: insumos que se pierden y gastos que nadie anotó
};

function cop(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function copCorto(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  return cop(n);
}

function planPara(animales: number): PlanFinca {
  if (animales <= PLAN_LIMITS.ranchero.maxAnimales!) return "ranchero";
  if (animales <= PLAN_LIMITS.ganadero.maxAnimales!) return "ganadero";
  return "hacienda";
}

/** Lo que cuesta RumeApp un año con el plan anual. */
function costoAnualCOP(plan: PlanFinca): number {
  return precioPeriodo(plan, "anual");
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.68rem] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--forest-3)" }}>
          {label}
        </span>
        <span className="text-xl font-bold tracking-tight" style={{ color: "var(--forest)" }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="calc-range w-full mt-2"
      />
    </label>
  );
}

export default function CalculadoraPerdidas({ onLogin }: { onLogin: () => void }) {
  const [animales, setAnimales] = useState(40);
  const [valorAnimal, setValorAnimal] = useState(3_000_000);
  const [gastoMes, setGastoMes] = useState(4_000_000);
  const [sup, setSup] = useState(SUPUESTOS_INICIALES);
  const [verSupuestos, setVerSupuestos] = useState(false);

  const r = useMemo(() => {
    const valorHato = animales * valorAnimal;
    const lineas = [
      {
        titulo: "Sanidad a destiempo",
        detalle: "Vacunas, purgas y tratamientos que se atrasan o se olvidan.",
        valor: (valorHato * sup.sanidad) / 100,
      },
      {
        titulo: "Reproducción sin seguimiento",
        detalle: "Celos que nadie vio y partos que se corren meses.",
        valor: (valorHato * sup.reproduccion) / 100,
      },
      {
        titulo: "Gastos e insumos sin control",
        detalle: "Lo que se gasta y nadie anotó, o el insumo que se pierde.",
        valor: (gastoMes * 12 * sup.gastos) / 100,
      },
    ];
    const total = lineas.reduce((s, l) => s + l.valor, 0);
    const plan = planPara(animales);
    const costo = costoAnualCOP(plan);
    return { lineas, total, plan, costo, veces: costo > 0 ? total / costo : null };
  }, [animales, valorAnimal, gastoMes, sup]);

  return (
    <section id="calculadora" className="relative py-24 md:py-32" style={{ background: "#FFFFFF" }}>
      <style>{`
        .calc-range { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px;
          background: rgba(20,38,26,0.12); outline: none; }
        .calc-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px;
          border-radius: 50%; background: var(--forest); border: 3px solid var(--lime); cursor: pointer; }
        .calc-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--forest);
          border: 3px solid var(--lime); cursor: pointer; }
      `}</style>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2
            className="display-lg uppercase"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "var(--forest)" }}
          >
            ¿Cuánto le cuesta<br />
            <em style={{ color: "var(--forest-3)", fontStyle: "normal" }}>no llevar el control?</em>
          </h2>
          <p className="text-sm md:text-base mt-4 max-w-xl mx-auto" style={{ color: "rgba(20,38,26,0.7)" }}>
            Mueva los valores según su finca y vea una estimación de lo que se va cada año por no
            tener sanidad, reproducción y gastos al día.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
          {/* Entradas */}
          <div
            className="rounded-[1.75rem] p-6 md:p-8 space-y-7"
            style={{ background: "var(--sand)", border: "1px solid rgba(20,38,26,0.08)" }}
          >
            <Slider
              label="Animales en su finca"
              value={animales}
              onChange={setAnimales}
              min={5}
              max={500}
              step={5}
              format={(v) => `${v}`}
            />
            <Slider
              label="Valor promedio por animal"
              value={valorAnimal}
              onChange={setValorAnimal}
              min={1_000_000}
              max={8_000_000}
              step={100_000}
              format={copCorto}
            />
            <Slider
              label="Gasto mensual de la finca"
              value={gastoMes}
              onChange={setGastoMes}
              min={500_000}
              max={50_000_000}
              step={500_000}
              format={copCorto}
            />

            <div>
              <button
                type="button"
                onClick={() => setVerSupuestos((v) => !v)}
                className="text-[0.68rem] font-mono uppercase tracking-[0.14em] underline underline-offset-4"
                style={{ color: "var(--forest-3)" }}
              >
                {verSupuestos ? "Ocultar supuestos" : "Ver y ajustar los supuestos"}
              </button>
              {verSupuestos && (
                <div className="mt-5 space-y-5">
                  <Slider
                    label="Pérdida por sanidad (% del hato/año)"
                    value={sup.sanidad}
                    onChange={(v) => setSup((s) => ({ ...s, sanidad: v }))}
                    min={0}
                    max={5}
                    step={0.5}
                    format={(v) => `${v.toLocaleString("es-CO")}%`}
                  />
                  <Slider
                    label="Pérdida en reproducción (% del hato/año)"
                    value={sup.reproduccion}
                    onChange={(v) => setSup((s) => ({ ...s, reproduccion: v }))}
                    min={0}
                    max={8}
                    step={0.5}
                    format={(v) => `${v.toLocaleString("es-CO")}%`}
                  />
                  <Slider
                    label="Fugas en gastos (% del gasto/año)"
                    value={sup.gastos}
                    onChange={(v) => setSup((s) => ({ ...s, gastos: v }))}
                    min={0}
                    max={15}
                    step={1}
                    format={(v) => `${v}%`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Resultado */}
          <div
            className="rounded-[1.75rem] p-6 md:p-8 relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg, var(--forest-2) 0%, var(--forest) 60%)",
              color: "var(--sand)",
              boxShadow: "0 36px 70px -28px rgba(20, 38, 26, 0.55)",
            }}
          >
            <div className="text-[0.68rem] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--lime-bright)" }}>
              Lo que podría estar perdiendo al año
            </div>
            <div className="text-5xl md:text-6xl font-bold tracking-tight mt-2">{cop(r.total)}</div>
            <div className="text-sm mt-1" style={{ opacity: 0.7 }}>
              ≈ {cop(r.total / 12)} al mes
            </div>

            <ul className="mt-7 space-y-4">
              {r.lineas.map((l) => (
                <li key={l.titulo} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{l.titulo}</div>
                    <div className="text-xs mt-0.5" style={{ opacity: 0.65 }}>
                      {l.detalle}
                    </div>
                  </div>
                  <div className="text-base font-bold shrink-0" style={{ color: "var(--lime-bright)" }}>
                    {copCorto(l.valor)}
                  </div>
                </li>
              ))}
            </ul>

            <div
              className="mt-7 rounded-2xl p-4 md:p-5"
              style={{ background: "rgba(200, 222, 134, 0.12)", border: "1px solid rgba(200, 222, 134, 0.3)" }}
            >
              {r.costo === 0 ? (
                <div className="text-sm">
                  Para {animales} animales le alcanza el plan <strong>Gratuito</strong>. Empezar
                  a llevar el control no le cuesta nada.
                </div>
              ) : (
                <div className="text-sm leading-relaxed">
                  Con el plan <strong>{PLAN_LIMITS[r.plan].nombre}</strong>, RumeApp le cuesta{" "}
                  <strong>{cop(r.costo)}</strong> al año con el
                  plan anual.
                  {r.veces !== null && r.veces >= 1 && (
                    <>
                      {" "}
                      Estas pérdidas equivalen a{" "}
                      <strong style={{ color: "var(--lime-bright)" }}>
                        {r.veces >= 10 ? "más de 10" : Math.floor(r.veces)} {Math.floor(r.veces) === 1 ? "vez" : "veces"}
                      </strong>{" "}
                      lo que cuesta la app.
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onLogin}
              className="mt-6 w-full rounded-full py-3.5 px-5 text-sm font-semibold uppercase tracking-[0.08em]"
              style={{ background: "var(--lime)", color: "var(--forest)" }}
            >
              Empezar a llevar el control →
            </button>
            <p className="text-[0.65rem] mt-3 text-center" style={{ opacity: 0.55 }}>
              Estimación ilustrativa con supuestos conservadores que usted puede ajustar. No es una
              garantía de ahorro.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
