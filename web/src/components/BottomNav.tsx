"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconTask,
  IconCow,
  IconMoney,
  IconUser,
} from "./icons";

// Rutas que se agrupan bajo cada tab (para resaltar el activo).
const HATO_ROUTES = [
  "/hato",
  "/animales",
  "/lotes",
  "/potreros",
  "/peso",
  "/sanidad",
  "/reproduccion",
  "/produccion",
  "/inventario",
];
const MIOP_ROUTES = ["/mi-operacion", "/panel"];

const ITEMS: {
  href: string;
  label: string;
  Icon: typeof IconHome;
  match: (path: string) => boolean;
}[] = [
  { href: "/", label: "Inicio", Icon: IconHome, match: (p) => p === "/" },
  {
    href: "/tareas",
    label: "Actividades",
    Icon: IconTask,
    match: (p) => p.startsWith("/tareas"),
  },
  {
    href: "/hato",
    label: "Hato",
    Icon: IconCow,
    match: (p) => HATO_ROUTES.some((r) => p === r || p.startsWith(r + "/")),
  },
  {
    href: "/gastos",
    label: "Gastos",
    Icon: IconMoney,
    match: (p) => p.startsWith("/gastos"),
  },
  {
    href: "/mi-operacion",
    label: "Mi op.",
    Icon: IconUser,
    match: (p) => MIOP_ROUTES.some((r) => p === r || p.startsWith(r + "/")),
  },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t"
      style={{
        background: "color-mix(in oklab, var(--surface-solid) 95%, transparent)",
        borderColor: "var(--rule-strong)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="flex justify-around items-stretch px-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg transition"
              style={{
                color: active ? "var(--primary)" : "var(--muted)",
              }}
            >
              <div
                className="flex items-center justify-center w-10 h-6 rounded-full transition"
                style={{
                  background: active ? "var(--primary-soft)" : "transparent",
                }}
              >
                <Icon size={18} />
              </div>
              <span
                className="text-[0.6rem] font-medium"
                style={{ letterSpacing: "-0.005em" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
