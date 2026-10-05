"use client";

import Link from "next/link";
import { DIAS_PRUEBA, PLAN_LIMITS, usageStatus, nextPlan, planLabel, planEfectivo, puedeProbar } from "@/lib/plans";
import { useFincaActiva } from "@/lib/useFincaActiva";

interface Props {
  resource: "animales" | "usuarios";
  used: number;
  className?: string;
}

/**
 * Aviso de uso vs límite del plan. Se oculta si:
 *  - No hay finca activa
 *  - El plan tiene límite infinito (Hacienda)
 *  - Aún queda mucho cupo (más del 20% + al menos 3 items libres)
 * Al llegar al tope, se vuelve rojo y bloquea con CTA a /plan.
 */
export default function PlanUsageBanner({ resource, used, className = "" }: Props) {
  const { activa } = useFincaActiva();
  if (!activa) return null;

  const plan = planEfectivo(activa);
  const limits = PLAN_LIMITS[plan];
  const limit = resource === "animales" ? limits.maxAnimales : limits.maxUsuarios;
  const status = usageStatus(used, limit);

  if (limit === null || !status.nearLimit) return null;

  const next = nextPlan(plan);
  const probar = puedeProbar(activa);
  const noun = resource === "animales" ? "animales" : "usuarios";

  return (
    <div
      className={`rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap ${className}`}
      style={{
        background: status.atLimit ? "rgba(200, 60, 60, 0.10)" : "rgba(184, 206, 122, 0.18)",
        border: `1px solid ${status.atLimit ? "rgba(200, 60, 60, 0.30)" : "rgba(20, 38, 26, 0.15)"}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: "var(--forest)" }}>
          {status.atLimit
            ? `Llegaste al tope del plan ${planLabel(plan)}`
            : `Vas ${status.used}/${limit} ${noun} en tu plan ${planLabel(plan)}`}
        </div>
        {next && (
          <div className="text-xs mt-0.5" style={{ color: "rgba(20,38,26,0.72)" }}>
            {status.atLimit
              ? probar
                ? `Para agregar más, pruebe el plan ${planLabel(next)} gratis por ${DIAS_PRUEBA} días.`
                : `Para agregar más, cambia al plan ${planLabel(next)}.`
              : `Cuando lo llenes tendrás que pasar al plan ${planLabel(next)}.`}
          </div>
        )}
      </div>
      {next && (
        <Link
          href="/plan"
          className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
          style={{ background: "var(--forest)", color: "var(--lime-bright)" }}
        >
          {status.atLimit && probar ? "Probar gratis →" : "Ver planes →"}
        </Link>
      )}
    </div>
  );
}
