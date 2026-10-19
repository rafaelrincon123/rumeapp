"use client";

import { usePathname } from "next/navigation";
import { resetDB } from "@/lib/storage";
import { useFincaActiva } from "@/lib/useFincaActiva";
import { useState } from "react";
import { IconRefresh, IconMenu } from "./icons";

const TITLES: Record<string, { title: string; sub: string }> = {
  "/": { title: "Inicio", sub: "Todos los módulos" },
  "/panel": { title: "Panel", sub: "Estado del hato en un vistazo" },
  "/tareas": { title: "Actividades", sub: "Pendientes, vencidas y programadas" },
  "/mi-operacion": { title: "Mi operación", sub: "Lo que te toca a ti" },
  "/hato": { title: "Hato", sub: "Animales, potreros y salud" },
  "/animales": { title: "Animales", sub: "Inventario del hato" },
  "/lotes": { title: "Aves y lotes", sub: "Gallinas, pollos y cerdos de ceba por grupo" },
  "/potreros": { title: "Potreros", sub: "Ubicaciones y capacidad" },
  "/peso": { title: "Control de peso", sub: "Pesajes y curvas" },
  "/sanidad": { title: "Sanidad", sub: "Vacunas, tratamientos y calendario" },
  "/reproduccion": { title: "Reproducción", sub: "Servicios, preñeces y partos" },
  "/produccion": { title: "Producción", sub: "Ordeño diario y pesajes" },
  "/gastos": { title: "Gastos", sub: "Contabilidad de la finca" },
  "/inventario": { title: "Inventario", sub: "Insumos, stock y movimientos" },
  "/socios": { title: "Socios", sub: "Propietarios y participaciones" },
  "/equipo": { title: "Equipo", sub: "Quién tiene acceso a tu finca" },
  "/cuenta": { title: "Mi cuenta", sub: "Tus datos, contraseña y plan" },
  "/plan": { title: "Plan y facturación", sub: "Elige el plan de tu operación" },
};

interface HeaderProps {
  onOpenNav?: () => void;
}

export default function Header({ onOpenNav }: HeaderProps) {
  const path = usePathname();
  const { activa } = useFincaActiva();
  const key = Object.keys(TITLES).find((k) =>
    k === "/" ? path === "/" : k === "/panel" ? path === "/panel" : path.startsWith(k)
  );
  const meta = key ? TITLES[key] : { title: activa?.nombre ?? "RumeApp", sub: "" };
  const [confirming, setConfirming] = useState(false);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="border-b border-rule bg-bg/40 backdrop-blur-2xl sticky top-0 z-30">
      <div className="max-w-[92rem] mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={onOpenNav}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-fg hover:bg-surface-2 transition shrink-0"
            style={{ border: "1px solid var(--rule)" }}
            aria-label="Abrir menú"
          >
            <IconMenu size={17} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base md:text-xl font-semibold tracking-tight truncate">{meta.title}</h1>
              <span className="chip ghost hidden sm:inline-flex" style={{ padding: "0.15rem 0.5rem", fontSize: "0.62rem" }}>
                {dateLabel}
              </span>
            </div>
            {meta.sub ? (
              <p className="text-[0.7rem] md:text-xs text-muted mt-0.5 truncate">{meta.sub}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-muted hidden md:inline">¿Restablecer datos?</span>
              <button
                className="btn btn-danger"
                onClick={() => {
                  resetDB();
                  setConfirming(false);
                }}
              >
                Sí, restablecer
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => setConfirming(true)}
              title="Restaurar los datos sembrados originales"
            >
              <IconRefresh size={14} />
              <span className="hidden md:inline">Restablecer</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
