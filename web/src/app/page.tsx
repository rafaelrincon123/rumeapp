"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { diasHasta } from "@/lib/format";
import {
  ArtActividades,
  ArtHato,
  ArtGastos,
  ArtMi,
} from "@/components/HomeArt";

type TileTone = "forest" | "copper" | "moss" | "citrus";

interface Tile {
  href: string;
  label: string;
  sub?: string;
  Art: React.ComponentType<{ size?: number; className?: string }>;
  tone: TileTone;
  metric?: string | number;
  alert?: boolean;
}

const TONES: Record<TileTone, { from: string; to: string; ink: string; fg: string; shadow: string }> = {
  forest: {
    from: "#D9EFD1", to: "#89C57B", ink: "#1E4A2A", fg: "#0F2A17",
    shadow: "rgba(46, 106, 60, 0.32)",
  },
  copper: {
    from: "#F8E1C1", to: "#E4A46A", ink: "#7A4A1E", fg: "#3E230C",
    shadow: "rgba(196, 128, 60, 0.32)",
  },
  moss: {
    from: "#E4EED4", to: "#A9C177", ink: "#3E5A24", fg: "#1D2F10",
    shadow: "rgba(120, 150, 80, 0.30)",
  },
  citrus: {
    from: "#F6EFC2", to: "#DFC85E", ink: "#6B5410", fg: "#2E2306",
    shadow: "rgba(180, 160, 60, 0.30)",
  },
};

export default function Home() {
  const { db, ready, loaded } = useDB();
  const animalesReady = loaded("animales");
  const tareasReady = loaded("tareas");

  const stats = useMemo(() => {
    if (!db) return null;
    const activos = animalesReady
      ? db.animales.filter((a) => a.estado === "activo").length
      : null;
    const pendientes = tareasReady
      ? db.tareas.filter((t) => !t.completada).length
      : null;
    const vencidas = tareasReady
      ? db.tareas.filter((t) => {
          if (t.completada) return false;
          const d = diasHasta(t.fecha);
          return d !== null && d < 0;
        }).length
      : 0;

    return { activos, pendientes, vencidas };
  }, [db, animalesReady, tareasReady]);

  if (!ready || !stats) {
    return (
      <div className="text-muted text-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Cargando…
      </div>
    );
  }

  const tiles: Tile[] = [
    {
      href: "/tareas",
      label: "Actividades",
      sub: stats.vencidas > 0 ? `${stats.vencidas} vencidas` : "pendientes",
      Art: ArtActividades,
      tone: "copper",
      metric: stats.pendientes ?? undefined,
      alert: stats.vencidas > 0,
    },
    {
      href: "/hato",
      label: "Hato",
      sub: "animales y potreros",
      Art: ArtHato,
      tone: "moss",
      metric: stats.activos ?? undefined,
    },
    {
      href: "/gastos",
      label: "Gastos",
      sub: "ingresos y contabilidad",
      Art: ArtGastos,
      tone: "citrus",
    },
    {
      href: "/mi-operacion",
      label: "Mi operación",
      sub: "panel y tu vista",
      Art: ArtMi,
      tone: "forest",
    },
  ];

  return (
    <div className="relative z-10">
      <PrimerosPasos />
      <div className="grid grid-cols-2 gap-3 md:gap-5 max-w-3xl mx-auto">
        {tiles.map((t) => (
          <TileCard key={t.href} tile={t} />
        ))}
      </div>
    </div>
  );
}

function TileCard({ tile }: { tile: Tile }) {
  const t = TONES[tile.tone];
  const showMetric = tile.metric !== undefined && tile.metric !== 0;
  return (
    <Link
      href={tile.href}
      className="tile-mod tile-art"
      style={
        {
          "--t-from": t.from,
          "--t-to": t.to,
          "--t-ink": t.ink,
          "--t-fg": t.fg,
          "--t-shadow": t.shadow,
        } as React.CSSProperties
      }
      aria-label={tile.label}
    >
      {tile.alert && <span className="tile-dot" aria-label="alerta" />}
      {showMetric && <div className="tile-metric">{tile.metric}</div>}

      <div className="tile-art-wrap">
        <tile.Art />
      </div>

      <div>
        <div className="tile-label">{tile.label}</div>
        {tile.sub && <div className="tile-sub">{tile.sub}</div>}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
//  Primeros pasos: guía a la cuenta nueva hasta que la app le sea útil
//  (primer animal, primer gasto, primera tarea, su socio). Se oculta sola al
//  completar todo, o si el usuario la cierra.

const PASOS_OCULTOS_KEY = "rumeapp:primerosPasosOcultos";

function PrimerosPasos() {
  const { db, loaded } = useDB();
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    try {
      setOculto(window.localStorage.getItem(PASOS_OCULTOS_KEY) === "1");
    } catch {
      setOculto(false);
    }
  }, []);

  const listo =
    !!db && loaded("animales") && loaded("gastos") && loaded("tareas") && loaded("propietarios");
  if (!listo || oculto || !db) return null;

  const pasos = [
    { hecho: db.animales.length > 0, href: "/animales", titulo: "Registre su primer animal", sub: "Nombre o número, raza y sexo. Toma un minuto." },
    { hecho: db.gastos.length > 0, href: "/gastos", titulo: "Anote un gasto", sub: "Sal, vacunas, jornales… y vea cuánto le toca a cada socio." },
    { hecho: db.tareas.length > 0, href: "/tareas", titulo: "Programe una tarea", sub: "La próxima vacuna, un pesaje o una visita del veterinario." },
    { hecho: db.propietarios.length > 1, href: "/socios", titulo: "Agregue a su socio", sub: "Para repartir los gastos o que vea las cuentas." },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length) return null;

  function cerrar() {
    setOculto(true);
    try {
      window.localStorage.setItem(PASOS_OCULTOS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="card max-w-3xl mx-auto mb-5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">Primeros pasos</h2>
          <p className="text-sm text-muted">
            {hechos} de {pasos.length} listos · así RumeApp empieza a trabajar para usted
          </p>
        </div>
        <button type="button" onClick={cerrar} className="text-xs text-muted underline shrink-0">
          Ocultar
        </button>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(hechos / pasos.length) * 100}%` }}
        />
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-1">
        {pasos.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2 transition ${p.hecho ? "opacity-60" : ""}`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  p.hecho ? "bg-primary text-white" : "border-2 border-primary text-primary"
                }`}
                aria-hidden
              >
                {p.hecho ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${p.hecho ? "line-through" : ""}`}>{p.titulo}</span>
                {!p.hecho && <span className="block text-xs text-muted">{p.sub}</span>}
              </span>
              {!p.hecho && <span className="ml-auto text-muted" aria-hidden>→</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
