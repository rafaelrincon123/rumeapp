"use client";

import { useState } from "react";
import Link from "next/link";
import { useFincaActiva } from "@/lib/useFincaActiva";
import { planEfectivo } from "@/lib/plans";
import type { ReportColumn } from "@/lib/pdfReport";
import { IconFile } from "./icons";

interface Props<T> {
  titulo: string;
  subtitulo?: string;
  columnas: ReportColumn<T>[];
  filas: T[];
  resumen?: { label: string; valor: string }[];
  nombreArchivo: string;
  className?: string;
}

/**
 * Botón "Exportar PDF" para las páginas de sección. Gratis para Pro/Full (y
 * fincas que aún están en una prueba antigua); en Gratuito se ve
 * deshabilitado con un tooltip que manda a /plan.
 */
export default function ExportarPDFButton<T>({
  titulo,
  subtitulo,
  columnas,
  filas,
  resumen,
  nombreArchivo,
  className = "",
}: Props<T>) {
  const { activa } = useFincaActiva();
  const [generando, setGenerando] = useState(false);

  if (!activa) return null;

  const plan = planEfectivo(activa);
  const disponible = plan === "ganadero" || plan === "hacienda";

  if (!disponible) {
    return (
      <Link
        href="/plan"
        className={`btn btn-ghost text-xs ${className}`}
        title="Reportes en PDF disponibles en los planes Pro y Full"
      >
        <IconFile size={13} />
        Exportar PDF
        <span className="text-[0.6rem] text-accent ml-1">Pro+</span>
      </Link>
    );
  }

  async function handleClick() {
    setGenerando(true);
    try {
      // jsPDF + autotable pesan ~150kB — se cargan solo al hacer click, no
      // en el bundle inicial de cada página (la app está pensada para
      // celular con señal débil, no queremos ese peso en cada visita).
      const { generarReportePDF } = await import("@/lib/pdfReport");
      generarReportePDF({
        finca: activa!.nombre,
        titulo,
        subtitulo,
        columnas,
        filas,
        resumen,
        nombreArchivo,
      });
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-ghost text-xs ${className}`}
      onClick={() => void handleClick()}
      disabled={generando || filas.length === 0}
      title={filas.length === 0 ? "No hay datos para exportar" : undefined}
    >
      <IconFile size={13} />
      {generando ? "Generando…" : "Exportar PDF"}
    </button>
  );
}
