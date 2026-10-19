"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { diasHasta } from "@/lib/format";
import {
  IconCow,
  IconPasture,
  IconScale,
  IconHealth,
  IconRepro,
  IconMilk,
  IconBox,
  IconLote,
} from "@/components/icons";

type TileTone = "moss" | "sea" | "sand" | "coral" | "plum" | "sky" | "clay";

interface Tile {
  href: string;
  label: string;
  sub?: string;
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  tone: TileTone;
  metric?: string | number;
  alert?: boolean;
}

const TONES: Record<TileTone, { from: string; to: string; ink: string; fg: string; shadow: string }> = {
  moss: {
    from: "#E4EED4", to: "#A9C177", ink: "#3E5A24", fg: "#1D2F10",
    shadow: "rgba(120, 150, 80, 0.30)",
  },
  sea: {
    from: "#D5EBE4", to: "#7EBFA9", ink: "#1E5A48", fg: "#0F2E23",
    shadow: "rgba(90, 160, 140, 0.30)",
  },
  sand: {
    from: "#F0EADA", to: "#CBB98D", ink: "#5A4A22", fg: "#2E240F",
    shadow: "rgba(160, 140, 90, 0.28)",
  },
  coral: {
    from: "#FBDACF", to: "#F19277", ink: "#8A3B24", fg: "#4A1B0F",
    shadow: "rgba(220, 110, 80, 0.32)",
  },
  plum: {
    from: "#E9D9E6", to: "#B48AB0", ink: "#5A2C57", fg: "#2E1230",
    shadow: "rgba(150, 100, 150, 0.30)",
  },
  sky: {
    from: "#D6E7F2", to: "#7DB3D2", ink: "#1E4A6B", fg: "#0F2A40",
    shadow: "rgba(90, 140, 180, 0.32)",
  },
  clay: {
    from: "#EBE0D1", to: "#B99A7A", ink: "#5A3C20", fg: "#2E1D0C",
    shadow: "rgba(160, 120, 90, 0.28)",
  },
};

export default function HatoLanding() {
  const { db, ready } = useDB();

  const stats = useMemo(() => {
    if (!db) return null;
    const activos = db.animales.filter((a) => a.estado === "activo").length;
    const sanidadCercana = db.sanidad.filter((s) => {
      const d = diasHasta(s.proximoEventoFecha || s.fecha);
      return d !== null && d >= -14 && d <= 30;
    }).length;
    const proximosPartos = db.servicios.filter(
      (s) =>
        (s.resultado === "prenada" || s.resultado === "pendiente") &&
        s.fechaProbableParto
    ).length;
    const stockBajo = db.insumos.filter((i) => i.stock < i.minimo).length;

    return {
      activos,
      potreros: db.potreros.length,
      lotes: db.lotes.filter((l) => l.estado === "activo").length,
      sanidadCercana,
      proximosPartos,
      stockBajo,
    };
  }, [db]);

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
      href: "/animales",
      label: "Animales",
      sub: "cabezas activas",
      Icon: IconCow,
      tone: "moss",
      metric: stats.activos,
    },
    {
      href: "/lotes",
      label: "Aves y lotes",
      sub: "gallinas, pollos, cerdos de ceba",
      Icon: IconLote,
      tone: "sand",
      metric: stats.lotes,
    },
    {
      href: "/potreros",
      label: "Potreros",
      sub: "lotes",
      Icon: IconPasture,
      tone: "sea",
      metric: stats.potreros,
    },
    {
      href: "/peso",
      label: "Peso",
      sub: "pesajes y curvas",
      Icon: IconScale,
      tone: "sand",
    },
    {
      href: "/sanidad",
      label: "Sanidad",
      sub: "eventos cercanos",
      Icon: IconHealth,
      tone: "coral",
      metric: stats.sanidadCercana,
      alert: stats.sanidadCercana > 0,
    },
    {
      href: "/reproduccion",
      label: "Reproducción",
      sub: "preñeces",
      Icon: IconRepro,
      tone: "plum",
      metric: stats.proximosPartos,
    },
    {
      href: "/produccion",
      label: "Producción",
      sub: "ordeño diario",
      Icon: IconMilk,
      tone: "sky",
    },
    {
      href: "/inventario",
      label: "Inventario",
      sub: "insumos",
      Icon: IconBox,
      tone: "clay",
      metric: stats.stockBajo,
      alert: stats.stockBajo > 0,
    },
  ];

  return (
    <div className="relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
      className="tile-mod"
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

      <div className="icon-orb">
        <tile.Icon size={30} strokeWidth={2} />
      </div>

      <div>
        <div className="tile-label">{tile.label}</div>
        {tile.sub && <div className="tile-sub">{tile.sub}</div>}
      </div>
    </Link>
  );
}
