import { ymdLocal } from "./format";
import type { Animal, CategoriaAnimal, Sexo } from "./types";

// Ayudas compartidas por el formulario de un animal y el registro de varios.

// La categoría ya dice el sexo: los formularios los mantienen de acuerdo.
export const SEXO_DE_CATEGORIA: Record<CategoriaAnimal, Sexo> = {
  vaca: "hembra",
  novilla: "hembra",
  ternera: "hembra",
  toro: "macho",
  novillo: "macho",
  ternero: "macho",
};

// "¿Qué animal es?" de los formularios cortos: categoría y sexo en un campo.
export const TIPOS_BASICO: CategoriaAnimal[] = ["vaca", "novilla", "ternera", "toro", "novillo", "ternero"];

// Edad aproximada en meses. Casi nadie sabe la fecha exacta de nacimiento;
// con la edad se calcula una fecha y el animal queda marcado como aproximado.
export const EDADES: { meses: number; label: string }[] = [
  { meses: 6, label: "Menos de 1 año" },
  ...Array.from({ length: 14 }, (_, i) => ({
    meses: (i + 1) * 12,
    label: i === 0 ? "1 año" : `${i + 1} años`,
  })),
  { meses: 180, label: "15 años o más" },
];

export function fechaDesdeEdad(meses: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return ymdLocal(d);
}

/** Siguiente número libre ("001", "002"…) para un animal sin chapeta. */
export function siguienteNumero(animales: { nroIdentificacion: string }[]): string {
  const max = animales.reduce((m, a) => {
    const n = /^\d+$/.test(a.nroIdentificacion) ? Number(a.nroIdentificacion) : 0;
    return n > m ? n : m;
  }, 0);
  return String(max + 1).padStart(3, "0");
}

/**
 * Chapeta que sigue a `anterior` ("027" → "028") sin chocar con una que ya
 * exista. Si la anterior no es un número, devuelve "" (el usuario la escribe).
 */
export function chapetaSiguiente(anterior: string, usadas: Set<string>): string {
  if (!/^\d+$/.test(anterior)) return "";
  let n = Number(anterior) + 1;
  let c = String(n).padStart(anterior.length, "0");
  while (usadas.has(c)) {
    n++;
    c = String(n).padStart(anterior.length, "0");
  }
  return c;
}

/** Edad en meses → la opción más cercana de EDADES (para las listas). */
export function edadMasCercana(meses: number): number {
  return EDADES.reduce((best, e) => (Math.abs(e.meses - meses) < Math.abs(best - meses) ? e.meses : best), EDADES[0].meses);
}

/** Datos que "Registrar otro" copia del animal anterior. */
export interface PlantillaAnimal {
  datos: Pick<Animal, "categoria" | "sexo" | "raza" | "fechaNacimiento" | "fechaNacimientoAprox" | "potreroId" | "propietarioId">;
  edadMeses: string;
  chapeta: string;
}

/** Lo que queda al guardar animales nuevos: con esto se felicita. */
export interface Guardado {
  animales: Animal[];
  /** Algún animal no traía chapeta y la app le asignó un número. */
  nroAuto: boolean;
  primero: boolean;
  /** "uno" = formulario de un animal; "varios" = registro de varios a la vez. */
  modo: "uno" | "varios";
  /** Para "Registrar otro": lo que se copia del último animal. */
  plantilla?: PlantillaAnimal;
}
