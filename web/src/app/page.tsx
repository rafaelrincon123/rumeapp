"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { diasHasta } from "@/lib/format";
import {
  ArtActividades,
  ArtHato,
  ArtGastos,
  ArtMi,
} from "@/components/HomeArt";
import { PrimerosPasos, RecorridoBienvenida } from "@/components/Tutorial";

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
      <RecorridoBienvenida />
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
