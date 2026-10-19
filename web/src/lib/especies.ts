import type { Animal, CategoriaAnimal, Especie } from "./types";

// Especies que maneja RumeApp. Las 6 categorías de siempre (ternero, ternera,
// novillo, novilla, vaca, toro) se guardan igual para todas: significan cría
// macho/hembra, joven macho/hembra y adulto macho/hembra. Lo que cambia es
// cómo se llaman en pantalla.

export interface InfoEspecie {
  value: Especie;
  /** "Bovinos", "Cabras"… */
  plural: string;
  /** "bovino", "cabra"… para frases como "de los bovinos". */
  singular: string;
  emoji: string;
  categorias: Record<CategoriaAnimal, string>;
  /** Días de gestación promedio para la fecha probable de parto. */
  gestacionDias: number;
  razas: string[];
  /** Placeholder del campo raza. */
  ejemploRaza: string;
}

export const ESPECIES: InfoEspecie[] = [
  {
    value: "bovino",
    plural: "Bovinos",
    singular: "bovino",
    emoji: "🐄",
    categorias: {
      ternero: "Ternero",
      ternera: "Ternera",
      novillo: "Novillo",
      novilla: "Novilla",
      vaca: "Vaca",
      toro: "Toro",
    },
    gestacionDias: 283,
    razas: ["Brahman", "Cebú", "Gyr", "Girolando", "Holstein", "Normando", "Jersey", "Romosinuano", "Blanco orejinegro", "Simmental", "Angus", "Cruce"],
    ejemploRaza: "Ej. Gyr Holstein",
  },
  {
    value: "bufalino",
    plural: "Búfalos",
    singular: "búfalo",
    emoji: "🐃",
    categorias: {
      ternero: "Bucerro",
      ternera: "Bucerra",
      novillo: "Búfalo joven",
      novilla: "Búfala joven",
      vaca: "Búfala",
      toro: "Búfalo",
    },
    gestacionDias: 310,
    razas: ["Murrah", "Mediterráneo", "Jafarabadi", "Carabao", "Cruce"],
    ejemploRaza: "Ej. Murrah",
  },
  {
    value: "caprino",
    plural: "Cabras",
    singular: "cabra",
    emoji: "🐐",
    categorias: {
      ternero: "Cabrito",
      ternera: "Cabrita",
      novillo: "Chivo joven",
      novilla: "Cabra joven",
      vaca: "Cabra",
      toro: "Chivo",
    },
    gestacionDias: 150,
    razas: ["Saanen", "Alpina", "Nubiana", "Toggenburg", "Boer", "Criolla", "Cruce"],
    ejemploRaza: "Ej. Saanen",
  },
  {
    value: "ovino",
    plural: "Ovejas",
    singular: "oveja",
    emoji: "🐑",
    categorias: {
      ternero: "Cordero",
      ternera: "Cordera",
      novillo: "Borrego",
      novilla: "Borrega",
      vaca: "Oveja",
      toro: "Carnero",
    },
    gestacionDias: 147,
    razas: ["Camura", "Santa Inés", "Dorper", "Katahdin", "Pelibuey", "Criolla", "Cruce"],
    ejemploRaza: "Ej. Santa Inés",
  },
  {
    value: "equino",
    plural: "Caballos",
    singular: "caballo",
    emoji: "🐴",
    categorias: {
      ternero: "Potrillo",
      ternera: "Potranca",
      novillo: "Potro",
      novilla: "Yegua joven",
      vaca: "Yegua",
      toro: "Caballo",
    },
    gestacionDias: 340,
    razas: ["Criollo colombiano", "Cuarto de milla", "Árabe", "Percherón", "Mular", "Asnal", "Cruce"],
    ejemploRaza: "Ej. Criollo colombiano",
  },
  {
    // Cerdos de cría, uno por uno. Los de levante y ceba van por lotes (/lotes).
    value: "porcino",
    plural: "Cerdos",
    singular: "cerdo",
    emoji: "🐖",
    categorias: {
      ternero: "Lechón",
      ternera: "Lechona",
      novillo: "Cerdo joven",
      novilla: "Primeriza",
      vaca: "Cerda",
      toro: "Verraco",
    },
    gestacionDias: 114,
    razas: ["Landrace", "Large White", "Duroc", "Pietrain", "Hampshire", "Zungo", "San Pedreño", "Cruce comercial"],
    ejemploRaza: "Ej. Landrace × Large White",
  },
];

export const ESPECIE_POR_DEFECTO: Especie = "bovino";

export function infoEspecie(e?: Especie | null): InfoEspecie {
  return ESPECIES.find((x) => x.value === e) ?? ESPECIES[0];
}

/** Especie de un animal (los registrados antes de las especies son bovinos). */
export function especieDe(a: Pick<Animal, "especie">): Especie {
  return a.especie ?? ESPECIE_POR_DEFECTO;
}

/** Nombre de la categoría según la especie: vaca → "Búfala", "Cabra"… */
export function nombreCategoria(categoria: CategoriaAnimal, especie?: Especie | null): string {
  return infoEspecie(especie).categorias[categoria] ?? categoria;
}

/** Nombre de la categoría de un animal. */
export function categoriaDe(a: Pick<Animal, "categoria" | "especie">): string {
  return nombreCategoria(a.categoria, a.especie);
}

/** Especies con al menos un animal activo, en el orden de ESPECIES. */
export function especiesPresentes(animales: Pick<Animal, "especie" | "estado">[]): Especie[] {
  const set = new Set(animales.filter((a) => a.estado === "activo").map(especieDe));
  return ESPECIES.map((e) => e.value).filter((e) => set.has(e));
}
