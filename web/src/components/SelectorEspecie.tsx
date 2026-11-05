"use client";

import Link from "next/link";
import { ESPECIES } from "@/lib/especies";
import type { Especie } from "@/lib/types";

/**
 * Botones grandes con la especie (🐄 🐃 🐐 🐑 🐴 🐖): se escoge a un toque.
 *
 * `especiesBloqueadas` (opcional): especies a las que este plan no llega
 * (se muestran con candado; al tocar, llevan a /plan en vez de seleccionar).
 */
export default function SelectorEspecie({
  value,
  onChange,
  especiesBloqueadas,
}: {
  value: Especie;
  onChange: (e: Especie) => void;
  especiesBloqueadas?: Set<Especie>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5" role="radiogroup" aria-label="Especie">
        {ESPECIES.map((e) => {
          const activo = e.value === value;
          const bloqueada = especiesBloqueadas?.has(e.value) ?? false;
          if (bloqueada) {
            return (
              <Link
                key={e.value}
                href="/plan"
                title="Su plan no permite más especies. Toque para ver planes."
                className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-1 text-[0.7rem] font-medium transition-colors text-muted hover:bg-surface-2 relative"
                style={{ border: "1.5px dashed var(--rule)", opacity: 0.55 }}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {e.emoji}
                </span>
                <span className="truncate max-w-full">{e.plural}</span>
                <span className="absolute top-1 right-1 text-[0.6rem]" aria-hidden>🔒</span>
              </Link>
            );
          }
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
        <Link
          href="/lotes"
          className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-1 text-[0.7rem] font-medium transition-colors text-muted hover:bg-surface-2"
          style={{ border: "1.5px dashed var(--rule)" }}
          title="Las gallinas y los pollos se llevan por lote"
        >
          <span className="text-2xl leading-none" aria-hidden>
            🐔
          </span>
          <span className="truncate max-w-full">Aves →</span>
        </Link>
      </div>
      <p className="text-[0.68rem] text-muted leading-snug">
        Las gallinas, los pollos de engorde y los cerdos de ceba se llevan por lote en{" "}
        <Link href="/lotes" className="text-primary underline underline-offset-2">
          Aves y lotes
        </Link>
        .
      </p>
    </div>
  );
}
