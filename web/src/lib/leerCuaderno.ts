"use client";

import { track } from "@vercel/analytics";
import { getSupabase } from "./supabase";
import type { CategoriaAnimal } from "./types";

// "Mande una foto de su cuaderno": reduce las fotos en el celular (para que
// suban rápido aun con mala señal) y se las pasa a la Edge Function
// leer-cuaderno, que devuelve los animales que leyó. No guarda nada: el
// registro de varios los muestra como filas para revisar.

export const MAX_FOTOS = 4;
const LADO_MAX = 1600;

export interface AnimalLeido {
  chapeta: string;
  nombre: string;
  categoria: CategoriaAnimal | "";
  edad_meses: number | null;
  raza: string;
}

/** Foto → JPEG de máximo 1600 px por lado, en base64 (sin el prefijo data:). */
async function reducir(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

export async function leerCuaderno(
  fincaId: string,
  archivos: File[]
): Promise<{ animales: AnimalLeido[]; nota: string }> {
  const imagenes = await Promise.all(
    archivos.slice(0, MAX_FOTOS).map(async (f) => ({ media_type: "image/jpeg", data: await reducir(f) }))
  );
  const { data, error } = await getSupabase().functions.invoke("leer-cuaderno", {
    body: { finca_id: fincaId, imagenes },
  });
  if (error) {
    // El mensaje útil viene en el cuerpo de la respuesta de la función.
    let msg = "No pudimos leer las fotos. Intente de nuevo.";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = ((await ctx.json()) as { error?: string }).error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const res = data as { animales: AnimalLeido[]; nota: string };
  try {
    track("CuadernoLeido", { fotos: imagenes.length, animales: res.animales.length });
  } catch {
    /* ignore */
  }
  return res;
}
