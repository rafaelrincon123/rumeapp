"use client";

import { useState } from "react";
import Link from "next/link";
import { useDB } from "@/lib/useDB";
import { useFincaActiva } from "@/lib/useFincaActiva";
import { updateCollection, uid, nowISO } from "@/lib/storage";
import { PLAN_LIMITS, planEfectivo, planLabel } from "@/lib/plans";
import { Animal, CATEGORIAS_ANIMAL, CategoriaAnimal } from "@/lib/types";
import {
  EDADES,
  Guardado,
  SEXO_DE_CATEGORIA,
  TIPOS_BASICO,
  chapetaSiguiente,
  edadMasCercana,
  fechaDesdeEdad,
  siguienteNumero,
} from "@/lib/animalesForm";

// Registrar varios animales en una sola pantalla: una fila por animal con lo
// mínimo (chapeta o nombre, qué animal es, edad, raza). Cada fila nueva copia
// la anterior y sigue la numeración de la chapeta. También se pueden pegar
// las columnas copiadas de un Excel o de Google Sheets.

interface Fila {
  id: string;
  chapeta: string;
  nombre: string;
  categoria: CategoriaAnimal | "";
  edadMeses: string;
  raza: string;
}

function filaVacia(): Fila {
  return { id: uid(), chapeta: "", nombre: "", categoria: "vaca", edadMeses: "", raza: "" };
}

function filaLlena(f: Fila): boolean {
  return !!(f.chapeta.trim() || f.nombre.trim());
}

function sinTildes(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** "Novilla", "NOVILLAS", "ternero macho"… → categoría (o "" si no se reconoce). */
function tipoDesdeTexto(t: string): CategoriaAnimal | "" {
  const x = sinTildes(t);
  // El orden importa: "novilla" antes que "novillo", "ternera" antes que "ternero".
  for (const c of ["novilla", "novillo", "ternera", "ternero", "vaca", "toro"] as CategoriaAnimal[]) {
    if (x.includes(c)) return c;
  }
  return "";
}

/** "3", "3 años", "2,5", "8 meses" → meses, ajustados a la lista de edades. */
function edadDesdeTexto(t: string): string {
  const n = Number(t.replace(",", ".").replace(/[^\d.]/g, ""));
  if (!t.trim() || Number.isNaN(n)) return "";
  const meses = /mes/i.test(t) ? n : n * 12;
  return String(edadMasCercana(meses));
}

/** Filas pegadas de una hoja de cálculo: chapeta, nombre, tipo, edad, raza. */
function filasDesdeTexto(texto: string): Fila[] {
  // Sin trim() de la línea: borraría el tabulador de una chapeta vacía y
  // correría todas las columnas una posición.
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  const filas: Fila[] = [];
  lineas.forEach((linea, i) => {
    const sep = linea.includes("\t") ? "\t" : linea.includes(";") ? ";" : ",";
    const [chapeta = "", nombre = "", tipo = "", edad = "", raza = ""] = linea.split(sep).map((c) => c.trim());
    // Encabezado ("Chapeta | Nombre | …"): se salta.
    if (i === 0 && (/^(chapeta|n[º°o]\.?|nro\.?|n[uú]mero)$/i.test(chapeta) || /^nombre$/i.test(nombre))) return;
    if (!chapeta && !nombre) return;
    filas.push({
      id: uid(),
      chapeta,
      nombre,
      categoria: tipoDesdeTexto(tipo),
      edadMeses: edadDesdeTexto(edad),
      raza,
    });
  });
  return filas;
}

export default function RegistroVarios({
  onSaved,
  onCancel,
  onUno,
}: {
  onSaved: (g: Guardado) => void;
  onCancel: () => void;
  /** Volver al formulario de un solo animal. */
  onUno: () => void;
}) {
  const { db } = useDB();
  const { activa } = useFincaActiva();
  const [filas, setFilas] = useState<Fila[]>(() => [filaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [pegando, setPegando] = useState(false);
  const [texto, setTexto] = useState("");

  const existentes = db?.animales ?? [];
  const plan = activa ? planEfectivo(activa) : null;
  const limite = plan ? PLAN_LIMITS[plan].maxAnimales : null;
  const caben = limite === null ? null : Math.max(0, limite - existentes.length);
  const llenas = filas.filter(filaLlena).length;

  function cambiar(id: string, cambio: Partial<Fila>) {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...cambio } : f)));
  }

  function quitar(id: string) {
    setFilas((fs) => (fs.length > 1 ? fs.filter((f) => f.id !== id) : [filaVacia()]));
  }

  // Cada fila nueva copia la anterior (tipo, edad, raza) y sigue su chapeta.
  function agregar(cuantas: number) {
    setFilas((fs) => {
      const usadas = new Set([...existentes.map((a) => a.nroIdentificacion), ...fs.map((f) => f.chapeta.trim())]);
      const nuevas: Fila[] = [];
      let ultima = fs[fs.length - 1];
      for (let i = 0; i < cuantas; i++) {
        const chapeta = ultima ? chapetaSiguiente(ultima.chapeta.trim(), usadas) : "";
        if (chapeta) usadas.add(chapeta);
        const fila: Fila = {
          ...filaVacia(),
          chapeta,
          categoria: ultima?.categoria ?? "vaca",
          edadMeses: ultima?.edadMeses ?? "",
          raza: ultima?.raza ?? "",
        };
        nuevas.push(fila);
        ultima = fila;
      }
      return [...fs, ...nuevas];
    });
  }

  function usarPegado() {
    const pegadas = filasDesdeTexto(texto);
    if (pegadas.length === 0) {
      setError("No encontramos animales en lo que pegó. Revise que cada animal esté en su propia fila.");
      return;
    }
    setError(null);
    // Reemplaza las filas vacías; las que ya tenían datos se conservan.
    setFilas((fs) => [...fs.filter(filaLlena), ...pegadas]);
    setTexto("");
    setPegando(false);
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const conDatos = filas
      .map((f, i) => ({ f, n: i + 1 }))
      .filter(({ f }) => filaLlena(f));
    if (conDatos.length === 0) {
      setError("Escriba al menos un animal: su chapeta o su nombre.");
      return;
    }
    const incompletas = conDatos.filter(({ f }) => !f.categoria || !f.edadMeses).map(({ n }) => n);
    if (incompletas.length > 0) {
      setError(
        `Falta qué animal es o la edad en ${incompletas.length === 1 ? "la fila" : "las filas"} ${incompletas.join(", ")}.`
      );
      return;
    }
    const usadas = new Set(existentes.map((a) => a.nroIdentificacion));
    const vistas = new Set<string>();
    const repetidas = new Set<string>();
    conDatos.forEach(({ f }) => {
      const c = f.chapeta.trim();
      if (!c) return;
      if (usadas.has(c) || vistas.has(c)) repetidas.add(c);
      vistas.add(c);
    });
    if (repetidas.size > 0) {
      const lista = [...repetidas].join(", ");
      setError(
        repetidas.size === 1
          ? `La chapeta ${lista} está repetida o ya existe en su hato. Cámbiela.`
          : `Estas chapetas están repetidas o ya existen en su hato: ${lista}. Cámbielas.`
      );
      return;
    }
    if (caben !== null && conDatos.length > caben && plan) {
      setError(
        caben === 0
          ? `Ya tiene ${limite} animales, el máximo del plan ${planLabel(plan)}.`
          : `Su plan ${planLabel(plan)} permite ${limite} animales: le caben ${caben} más y está registrando ${conDatos.length}.`
      );
      return;
    }

    // Los que no traen chapeta reciben el siguiente número libre.
    const asignadas = [...existentes.map((a) => ({ nroIdentificacion: a.nroIdentificacion })), ...[...vistas].map((c) => ({ nroIdentificacion: c }))];
    let nroAuto = false;
    const nuevos: Animal[] = conDatos.map(({ f }) => {
      let nro = f.chapeta.trim();
      if (!nro) {
        nro = siguienteNumero(asignadas);
        asignadas.push({ nroIdentificacion: nro });
        nroAuto = true;
      }
      const categoria = f.categoria as CategoriaAnimal;
      return {
        id: uid(),
        nroIdentificacion: nro,
        nombre: f.nombre.trim(),
        sexo: SEXO_DE_CATEGORIA[categoria],
        raza: f.raza.trim(),
        fechaNacimiento: fechaDesdeEdad(Number(f.edadMeses)),
        fechaNacimientoAprox: true,
        categoria,
        estado: "activo",
        createdAt: nowISO(),
      };
    });
    const primero = existentes.length === 0;
    updateCollection("animales", (list) => [...list, ...nuevos]);
    onSaved({ animales: nuevos, nroAuto, primero, modo: "varios" });
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <p className="text-sm text-muted -mt-1">
        Una fila por animal. Cada fila nueva copia la anterior y sigue el número de la chapeta: solo
        cambie lo que sea distinto. Sin chapeta, le ponemos un número.
      </p>

      {caben !== null && plan && (
        <div className="text-xs text-muted bg-surface-2 rounded-lg px-3 py-2">
          Su plan {planLabel(plan)} permite {limite} animales: {caben === 0 ? "ya está completo" : `le caben ${caben} más`}.{" "}
          <Link href="/plan" className="underline text-primary">
            Ver planes
          </Link>
        </div>
      )}

      {/* Encabezados (solo computador; en el celular cada campo trae su texto). */}
      <div className="hidden md:grid md:grid-cols-[2rem_6rem_1fr_8.5rem_9.5rem_1fr_2rem] gap-2 px-1 eyebrow">
        <span>#</span>
        <span>Chapeta</span>
        <span>Nombre</span>
        <span>Qué animal es *</span>
        <span>Edad *</span>
        <span>Raza (opcional)</span>
        <span />
      </div>

      <ol className="flex flex-col gap-2">
        {filas.map((f, i) => (
          <li
            key={f.id}
            className="grid grid-cols-2 md:grid-cols-[2rem_6rem_1fr_8.5rem_9.5rem_1fr_2rem] gap-2 items-center rounded-xl border border-rule p-2 md:p-1 md:border-0"
          >
            <div className="col-span-2 md:col-span-1 flex items-center justify-between md:justify-center">
              <span className="text-xs font-mono text-subtle">{i + 1}</span>
              <button
                type="button"
                onClick={() => quitar(f.id)}
                className="md:hidden text-muted text-lg leading-none w-7 h-7 rounded-lg hover:bg-surface-2"
                aria-label={`Quitar fila ${i + 1}`}
              >
                ×
              </button>
            </div>
            <input
              value={f.chapeta}
              onChange={(e) => cambiar(f.id, { chapeta: e.target.value })}
              placeholder="Chapeta"
              aria-label={`Chapeta, fila ${i + 1}`}
            />
            <input
              value={f.nombre}
              onChange={(e) => cambiar(f.id, { nombre: e.target.value })}
              placeholder="Nombre"
              aria-label={`Nombre, fila ${i + 1}`}
            />
            <select
              value={f.categoria}
              onChange={(e) => cambiar(f.id, { categoria: e.target.value as CategoriaAnimal | "" })}
              aria-label={`Qué animal es, fila ${i + 1}`}
            >
              <option value="">¿Qué animal?</option>
              {TIPOS_BASICO.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIAS_ANIMAL.find((x) => x.value === c)?.label ?? c}
                </option>
              ))}
            </select>
            <select
              value={f.edadMeses}
              onChange={(e) => cambiar(f.id, { edadMeses: e.target.value })}
              aria-label={`Edad, fila ${i + 1}`}
            >
              <option value="">Edad</option>
              {EDADES.map((ed) => (
                <option key={ed.meses} value={ed.meses}>{ed.label}</option>
              ))}
            </select>
            <input
              value={f.raza}
              onChange={(e) => cambiar(f.id, { raza: e.target.value })}
              placeholder="Raza"
              aria-label={`Raza, fila ${i + 1}`}
              className="col-span-2 md:col-span-1"
            />
            <button
              type="button"
              onClick={() => quitar(f.id)}
              className="hidden md:flex text-muted text-lg leading-none w-8 h-8 items-center justify-center rounded-lg hover:bg-surface-2"
              aria-label={`Quitar fila ${i + 1}`}
            >
              ×
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => agregar(1)}>
          + Otra fila
        </button>
        <button type="button" className="btn" onClick={() => agregar(5)}>
          + 5 filas
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setPegando((v) => !v)}>
          {pegando ? "Cerrar" : "Pegar desde Excel"}
        </button>
      </div>

      {pegando && (
        <div className="rounded-xl border border-rule p-3 flex flex-col gap-2">
          <p className="text-sm text-muted">
            En su Excel o Google Sheets ponga las columnas en este orden:{" "}
            <b>chapeta, nombre, qué animal es, edad (años), raza</b>. Selecciónelas, cópielas y
            péguelas aquí.
          </p>
          <textarea
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"027\tLuna\tVaca\t5\tGyr\n028\tCanela\tNovilla\t2\tBrahman"}
            className="font-mono text-xs"
          />
          <button type="button" className="btn btn-primary self-start" onClick={usarPegado} disabled={!texto.trim()}>
            Agregar estos animales
          </button>
        </div>
      )}

      {error && <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>}

      <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onUno}>
          ← Solo un animal
        </button>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost flex-1 md:flex-none justify-center" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary flex-1 md:flex-none justify-center">
            {llenas > 0 ? `Guardar ${llenas} animal${llenas === 1 ? "" : "es"}` : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}
