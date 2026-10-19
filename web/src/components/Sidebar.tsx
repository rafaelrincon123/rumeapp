"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useDB } from "@/lib/useDB";
import { useFincaActiva } from "@/lib/useFincaActiva";
import { logout } from "@/lib/auth";
import { useMiPerfil } from "@/lib/cuenta";
import { miParticipacion } from "@/lib/participacion";
import { fmtPct } from "@/lib/format";
import {
  IconPanel,
  IconCow,
  IconPasture,
  IconLote,
  IconHealth,
  IconRepro,
  IconMilk,
  IconMoney,
  IconTask,
  IconBox,
  IconUser,
  IconLogout,
  IconClose,
  IconHome,
  IconScale,
} from "./icons";

const NAV = [
  { href: "/", label: "Inicio", section: "General", Icon: IconHome },
  { href: "/tareas", label: "Actividades", section: "General", Icon: IconTask },
  { href: "/gastos", label: "Gastos", section: "General", Icon: IconMoney },
  { href: "/hato", label: "Hato (resumen)", section: "Hato", Icon: IconCow },
  { href: "/animales", label: "Animales", section: "Hato", Icon: IconCow },
  { href: "/lotes", label: "Aves y lotes", section: "Hato", Icon: IconLote },
  { href: "/potreros", label: "Potreros", section: "Hato", Icon: IconPasture },
  { href: "/peso", label: "Control de peso", section: "Hato", Icon: IconScale },
  { href: "/sanidad", label: "Sanidad", section: "Hato", Icon: IconHealth },
  { href: "/reproduccion", label: "Reproducción", section: "Hato", Icon: IconRepro },
  { href: "/produccion", label: "Producción", section: "Hato", Icon: IconMilk },
  { href: "/inventario", label: "Inventario", section: "Hato", Icon: IconBox },
  { href: "/mi-operacion", label: "Mi operación", section: "Mi operación", Icon: IconUser },
  { href: "/panel", label: "Panel general", section: "Mi operación", Icon: IconPanel },
  { href: "/socios", label: "Socios", section: "Mi operación", Icon: IconUser },
  { href: "/cuenta", label: "Mi cuenta", section: "Cuenta", Icon: IconUser },
  { href: "/equipo", label: "Equipo", section: "Cuenta", Icon: IconUser },
  { href: "/plan", label: "Plan y facturación", section: "Cuenta", Icon: IconPanel },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar(props: SidebarProps) {
  const mobileOpen = props.mobileOpen ?? false;
  const onClose = props.onClose;
  const path = usePathname();
  const { user } = useAuth();
  const { db } = useDB();
  const { activa, fincas, setActiva } = useFincaActiva();
  const [pickerOpen, setPickerOpen] = useState(false);
  const perfil = useMiPerfil();
  const sections = Array.from(new Set(NAV.map((n) => n.section)));
  const initials = user ? user.nombre.slice(0, 2).toUpperCase() : "";
  const share =
    user && db ? miParticipacion(user.id, db.animales) : { count: 0, pct: 0 };

  const asideClass =
    "flex flex-col w-[280px] md:w-[248px] shrink-0 border-r border-rule z-50 " +
    "fixed md:sticky md:top-0 inset-y-0 left-0 " +
    "transition-transform duration-200 ease-out " +
    (mobileOpen ? "translate-x-0" : "-translate-x-full") +
    " md:translate-x-0";

  return (
    <div className="contents">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
          }}
        />
      ) : null}

      <aside
        className={asideClass}
        style={{
          background: "var(--surface-solid)",
          height: "100dvh",
          overflowY: "auto",
        }}
      >
        <div className="px-5 pt-6 pb-3 flex items-center gap-3">
          <BrandMark />
          <button
            type="button"
            onClick={() => fincas.length > 1 && setPickerOpen((v) => !v)}
            className="flex-1 min-w-0 text-left"
            style={{ cursor: fincas.length > 1 ? "pointer" : "default" }}
            title={fincas.length > 1 ? "Cambiar de finca" : undefined}
          >
            <div className="flex items-center gap-1">
              <div className="text-[0.95rem] font-serif font-semibold tracking-tight leading-none truncate">
                {activa?.nombre ?? "RumeApp"}
              </div>
              {fincas.length > 1 && (
                <span className="text-muted text-xs">▾</span>
              )}
            </div>
            <div className="text-[0.62rem] text-accent font-mono tracking-[0.14em] uppercase mt-1">
              {fincas.length > 1 ? `${fincas.length} fincas` : "RumeApp"}
            </div>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition"
            aria-label="Cerrar menú"
          >
            <IconClose size={16} />
          </button>
        </div>
        {pickerOpen && fincas.length > 1 && (
          <div className="px-3 pb-3 space-y-1">
            {fincas.map((f) => (
              <button
                key={f.id}
                type="button"
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-2 transition flex items-center justify-between gap-2"
                style={{
                  background: f.id === activa?.id ? "var(--primary-soft)" : "transparent",
                  color: f.id === activa?.id ? "var(--primary)" : "var(--fg)",
                  border: "1px solid var(--rule)",
                }}
                onClick={() => {
                  setActiva(f.id);
                  setPickerOpen(false);
                  // Forzar re-hidratación del cache para esta finca
                  window.location.reload();
                }}
              >
                <span className="text-sm truncate">{f.nombre}</span>
                {f.id === activa?.id && (
                  <span className="text-[0.6rem] font-mono uppercase tracking-wider">
                    activa
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <nav className="px-3 flex-1 flex flex-col gap-5 overflow-y-auto">
          {sections.map((section) => (
            <div key={section}>
              <div className="px-2 mb-2 text-[0.62rem] font-mono uppercase tracking-[0.14em] text-subtle">
                {section}
              </div>
              <ul className="flex flex-col gap-0.5">
                {NAV.filter((n) => n.section === section).map((item) => {
                  const active =
                    item.href === "/"
                      ? path === "/"
                      : item.href === "/panel"
                      ? path === "/panel"
                      : path.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        className={"nav-link " + (active ? "active" : "")}
                      >
                        <item.Icon className="nav-icon" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-rule">
          {user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/cuenta"
                prefetch={false}
                title="Mi cuenta"
                className="flex items-center gap-2.5 flex-1 min-w-0"
              >
              <div
                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-mono font-semibold shrink-0"
                style={{
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                  border: "1.5px solid var(--surface-solid)",
                  boxShadow: "0 0 12px -4px var(--primary-glow)",
                }}
              >
                {perfil?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={perfil.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.nombre}</div>
                <div className="text-[0.62rem] font-mono text-subtle uppercase tracking-wider">
                  {fmtPct(share.pct)} · {share.count}{" "}
                  {share.count === 1 ? "cabeza" : "cabezas"}
                </div>
              </div>
              </Link>
              <button
                onClick={logout}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-surface-2 transition shrink-0"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <IconLogout size={15} />
              </button>
            </div>
          ) : null}
          <div className="mt-4 text-[0.62rem] text-subtle font-mono flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              style={{ boxShadow: "0 0 6px var(--primary)" }}
            />
            v0.2 · local
          </div>
        </div>
      </aside>
    </div>
  );
}

function BrandMark() {
  return (
    <Image
      src="/logo.png"
      alt="RumeApp"
      width={48}
      height={48}
      sizes="48px"
      className="w-12 h-12 object-contain shrink-0"
    />
  );
}
