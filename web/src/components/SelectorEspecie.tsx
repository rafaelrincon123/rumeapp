"use client";

import { ESPECIES } from "@/lib/especies";
import type { Especie } from "@/lib/types";

/** Botones grandes con la especie (🐄 🐃 🐐 🐑 🐴 🐖): se escoge a un toque. */
export default function SelectorEspecie({
  value,
  onChange,
}: {
  value: Especie;
  onChange: (e: Especie) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" role="radiogroup" aria-label="Especie">
      {ESPECIES.map((e) => {
        const activo = e.value === value;
        return (
          <button
            key={e.value}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(e.value)}
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-1 text-[0.7rem] font-medium transition-colors"
            style={{
              background: activo ? "var(--primary-soft)" : "transparent",
              color: activo ? "var(--primary)" : "var(--muted)",
              border: `1.5px solid ${activo ? "var(--primary)" : "var(--rule)"}`,
            }}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {e.emoji}
            </span>
            <span className="truncate max-w-full">{e.plural}</span>
          </button>
        );
      })}
    </div>
  );
}
