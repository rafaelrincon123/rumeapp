"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { diasHasta, fmtDate } from "@/lib/format";
import { especiesPresentes, infoEspecie } from "@/lib/especies";
import {
  ItemPlan,
  PLANES,
  activarPlan,
  animalesDelItem,
  completarTareaPlan,
  pendienteDe,
  planActivo,
  primeraFecha,
  quitarItem,
} from "@/lib/planSanitario";
import type { DBState, Especie } from "@/lib/types";
import { track } from "@vercel/analytics";

function frecuencia(item: ItemPlan): string {
  if (item.meses) {
    const nombres = item.meses.map((m) =>
      new Date(2026, m - 1, 1).toLocaleDateString("es-CO", { month: "long" })
    );
    return nombres.join(" y ").replace(/^./, (c) => c.toUpperCase());
  }
  const d = item.cadaDias ?? 365;
  if (d >= 365) return "Una vez al año";
  if (d <= 31) return "Cada mes";
  return `Cada ${Math.round(d / 30)} meses`;
}

function cuando(fecha: string): { texto: string; tono: "danger" | "accent" | "" } {
  const d = diasHasta(fecha) ?? 0;
  if (d < 0) return { texto: `atrasada ${Math.abs(d)} d`, tono: "danger" };
  if (d === 0) return { texto: "hoy", tono: "accent" };
  if (d === 1) return { texto: "mañana", tono: "accent" };
  return { texto: `en ${d} días`, tono: "" };
}

function medir(evento: string, datos: Record<string, string | number>) {
  try {
    track(evento, datos);
  } catch {
    /* ignore */
  }
}

/** Plan sanitario por especie: activar, marcar hecho y quitar cuidados. */
export default function PlanSanitario() {
  const { db, ready } = useDB();
  const presentes = useMemo(() => especiesPresentes(db?.animales ?? []), [db]);

  if (!ready || !db) return <div className="text-muted">Cargando…</div>;

  if (presentes.length === 0) {
    return (
      <div className="card text-center py-8 flex flex-col items-center gap-3">
        <div className="text-4xl" aria-hidden>🩺</div>
        <p className="text-sm text-muted max-w-sm">
          Registre sus animales y aquí le armamos un plan sanitario: le avisamos cuándo toca purgar,
          bañar, vacunar y revisar.
        </p>
        <Link href="/animales?nuevo=1" className="btn btn-primary">
          + Registrar animales
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {presentes.map((e) => (
        <PlanEspecie key={e} db={db} especie={e} />
      ))}
      <p className="text-xs text-muted px-1">
        Es una guía general para fincas de Colombia. El producto, la dosis y las fechas exactas los
        decide su veterinario. Cada cuidado queda en Actividades y le llega en el correo diario
        &quot;Hoy toca&quot;.
      </p>
    </div>
  );
}

function PlanEspecie({ db, especie }: { db: DBState; especie: Especie }) {
  const info = infoEspecie(especie);
  const items = PLANES[especie];
  const activo = planActivo(db, especie);
  const total = db.animales.filter(
    (a) => a.estado === "activo" && (a.especie ?? "bovino") === especie
  ).length;
  const [escogidos, setEscogidos] = useState<string[]>(() => items.map((i) => i.id));
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [anotar, setAnotar] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  function activar() {
    activarPlan(db, especie, escogidos);
    medir("PlanSanitarioActivado", { especie, cuidados: escogidos.length });
    setAviso("¡Plan activado! Le avisaremos cada vez que toque un cuidado.");
  }

  function hecho(item: ItemPlan) {
    const t = pendienteDe(db, especie, item.id);
    if (!t) return;
    const animales = anotar ? animalesDelItem(db, especie, item) : undefined;
    const siguiente = completarTareaPlan(t, animales);
    medir("PlanSanitarioHecho", { especie, cuidado: item.id });
    setHaciendo(null);
    setAviso(
      `Listo${animales?.length ? `: quedó en la hoja de vida de ${animales.length} animal${animales.length === 1 ? "" : "es"}` : ""}. La próxima vez: ${fmtDate(siguiente ?? undefined)}.`
    );
  }

  return (
    <section className="card space-y-3">
      <header className="flex items-center gap-3">
        <span className="text-3xl leading-none" aria-hidden>
          {info.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold tracking-tight">Plan sanitario · {info.plural}</h2>
          <p className="text-xs text-muted">
            {total} animal{total === 1 ? "" : "es"} activo{total === 1 ? "" : "s"}
          </p>
        </div>
        {activo && <span className="chip success">Activo</span>}
      </header>

      {aviso && (
        <div className="text-sm rounded-lg px-3 py-2" style={{ background: "rgba(184, 206, 122, 0.25)" }}>
          {aviso}
        </div>
      )}

      {!activo ? (
        <>
          <p className="text-sm text-muted">
            Escoja los cuidados que quiere que le recordemos. Si ya anotó alguno en Sanidad, contamos
            desde esa fecha.
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const marcado = escogidos.includes(item.id);
              return (
                <li key={item.id}>
                  <label className="flex items-start gap-3 rounded-xl border border-rule px-3 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 shrink-0"
                      checked={marcado}
                      onChange={() =>
                        setEscogidos((s) => (marcado ? s.filter((x) => x !== item.id) : [...s, item.id]))
                      }
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">{item.titulo}</span>
                      <span className="block text-xs text-muted mt-0.5">{item.detalle}</span>
                      <span className="block text-xs mt-1">
                        <b>{frecuencia(item)}</b> · primera vez: {fmtDate(primeraFecha(db, especie, item))}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn btn-primary w-full justify-center"
            disabled={escogidos.length === 0}
            onClick={activar}
          >
            Activar plan de {info.plural.toLowerCase()}
          </button>
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const t = pendienteDe(db, especie, item.id);
            if (!t) {
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-rule px-3 py-2.5"
                >
                  <span className="flex-1 min-w-0 text-sm text-muted">{item.titulo}</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => activarPlan(db, especie, [item.id])}
                  >
                    + Agregar
                  </button>
                </li>
              );
            }
            const c = cuando(t.fecha);
            const n = animalesDelItem(db, especie, item).length;
            return (
              <li key={item.id} className="rounded-xl border border-rule px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold">{item.titulo}</span>
                    <span className="block text-xs text-muted mt-0.5">
                      {fmtDate(t.fecha)} · {frecuencia(item).toLowerCase()}
                    </span>
                  </span>
                  <span className={"chip " + c.tono}>{c.texto}</span>
                </div>
                {haciendo === item.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {n > 0 && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={anotar}
                          onChange={(e) => setAnotar(e.target.checked)}
                        />
                        Anotarlo en la hoja de vida de {n === 1 ? "el animal" : `los ${n} animales`}
                      </label>
                    )}
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-primary flex-1 justify-center" onClick={() => hecho(item)}>
                        Sí, ya lo hice hoy
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setHaciendo(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      className="btn btn-primary !py-1.5 text-sm"
                      onClick={() => {
                        setAnotar(true);
                        setHaciendo(item.id);
                      }}
                    >
                      ✓ Hecho
                    </button>
                    <button
                      type="button"
                      className="text-xs text-muted hover:underline ml-auto"
                      onClick={() => {
                        if (confirm(`¿Quitar "${item.titulo}" del plan? Ya no se lo recordaremos.`)) {
                          quitarItem(db, especie, item.id);
                        }
                      }}
                    >
                      Quitar del plan
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Invitación en el inicio: aparece si alguna especie del hato no tiene plan. */
export function InvitacionPlanSanitario() {
  const { db, ready, loaded } = useDB();
  if (!ready || !db || !loaded("animales") || !loaded("tareas")) return null;
  const sinPlan = especiesPresentes(db.animales).filter((e) => !planActivo(db, e));
  if (sinPlan.length === 0) return null;
  const nombres = sinPlan.map((e) => infoEspecie(e).plural.toLowerCase()).join(" y ");
  return (
    <Link
      href="/sanidad?plan=1"
      className="card flex items-center gap-3 max-w-3xl mx-auto mb-4 hover:bg-surface-2 transition"
      style={{ borderColor: "var(--primary)" }}
    >
      <span className="text-3xl leading-none" aria-hidden>
        🩺
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-sm">Active el plan sanitario de sus {nombres}</span>
        <span className="block text-xs text-muted mt-0.5">
          Le avisamos cuándo toca purgar, bañar, vacunar y revisar. Gratis, en un toque.
        </span>
      </span>
      <span className="text-primary font-semibold" aria-hidden>
        →
      </span>
    </Link>
  );
}
