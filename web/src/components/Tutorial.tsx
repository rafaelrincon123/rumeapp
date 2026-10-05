"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDB } from "@/lib/useDB";
import {
  PASOS_EMPEZADOS_KEY,
  PASOS_OCULTOS_KEY,
  RECORRIDO_VISTO_KEY,
  hrefNuevo,
  leerBandera,
  marcarBandera,
} from "@/lib/tutorial";
import {
  IconCow,
  IconHome,
  IconMoney,
  IconPanel,
  IconSparkles,
  IconTask,
  IconBell,
} from "./icons";

// ---------------------------------------------------------------------------
//  Recorrido de bienvenida: 4 tarjetas que se muestran una sola vez, a la
//  finca recién creada (sin animales). Explica cómo está organizada la app y
//  termina llevando a registrar el primer animal.

const SECCIONES = [
  { Icon: IconHome, nombre: "Inicio", que: "Su resumen y estos primeros pasos" },
  { Icon: IconTask, nombre: "Actividades", que: "Lo que toca hacer: vacunas, purgas, pesajes" },
  { Icon: IconCow, nombre: "Hato", que: "Animales, sanidad, peso, partos y potreros" },
  { Icon: IconMoney, nombre: "Gastos", que: "Gastos, ingresos y el reparto entre socios" },
  { Icon: IconPanel, nombre: "Mi op.", que: "Sus números y reportes" },
];

export function RecorridoBienvenida() {
  const { db, loaded } = useDB();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [paso, setPaso] = useState(0);

  const nueva = !!db && loaded("animales") && db.animales.length === 0;
  useEffect(() => {
    if (nueva && !leerBandera(RECORRIDO_VISTO_KEY)) setVisible(true);
  }, [nueva]);
  // Para "Ver el recorrido otra vez" desde los primeros pasos.
  useEffect(() => {
    const abrir = () => {
      setPaso(0);
      setVisible(true);
    };
    window.addEventListener("rumeapp:recorrido", abrir);
    return () => window.removeEventListener("rumeapp:recorrido", abrir);
  }, []);

  if (!visible) return null;

  function cerrar() {
    marcarBandera(RECORRIDO_VISTO_KEY);
    setVisible(false);
  }

  const tarjetas = [
    {
      Icon: IconSparkles,
      titulo: "¡Su finca ya está en RumeApp!",
      cuerpo: (
        <p>
          En un minuto le mostramos cómo funciona y por dónde empezar. Puede saltar esto cuando
          quiera.
        </p>
      ),
    },
    {
      Icon: IconHome,
      titulo: "Así está organizada",
      cuerpo: (
        <>
          <p>Las secciones están en la barra de abajo (en el computador, a la izquierda):</p>
          <ul className="mt-3 flex flex-col gap-2">
            {SECCIONES.map((s) => (
              <li key={s.nombre} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <s.Icon size={17} />
                </span>
                <span className="text-sm leading-snug">
                  <b>{s.nombre}</b> · {s.que}
                </span>
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      Icon: IconCow,
      titulo: "Todo empieza por los animales",
      cuerpo: (
        <>
          <p>
            Registre cada animal con su número de chapeta o su nombre. Después, sobre ese mismo
            animal, va anotando todo lo que le pasa:
          </p>
          <ol className="mt-3 flex flex-col gap-2 text-sm">
            <li className="flex gap-3"><Num n={1} /> El animal: chapeta o nombre, qué animal es y su edad.</li>
            <li className="flex gap-3"><Num n={2} /> Sus vacunas, purgas y tratamientos.</li>
            <li className="flex gap-3"><Num n={3} /> Sus pesos, servicios y partos.</li>
          </ol>
          <p className="mt-3">Así cada animal tiene su ficha completa, sin cuaderno.</p>
        </>
      ),
    },
    {
      Icon: IconBell,
      titulo: "RumeApp le avisa",
      cuerpo: (
        <>
          <p>
            Cuando anote una vacuna o una purga, ponga la <b>próxima fecha</b>: le aparece en
            Actividades el día que toca.
          </p>
          <p className="mt-3">
            Y cada gasto que anote se reparte solo entre los socios, según el porcentaje de cada uno.
          </p>
        </>
      ),
    },
  ];
  const t = tarjetas[paso];
  const ultimo = paso === tarjetas.length - 1;

  // Portal a <body>: el inicio pinta dentro de un contenedor con z-index
  // propio y la barra de abajo quedaba encima del botón "Siguiente".
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Recorrido de bienvenida">
      <div className="absolute inset-0 bg-black/50" onClick={cerrar} aria-hidden />
      <div className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Paso ${paso + 1} de ${tarjetas.length}`}>
            {tarjetas.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === paso ? "w-6 bg-primary" : "w-1.5 bg-rule"}`} />
            ))}
          </div>
          <button type="button" onClick={cerrar} className="text-sm text-muted underline">
            Saltar
          </button>
        </div>

        <div className="mt-5 w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center">
          <t.Icon size={26} />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{t.titulo}</h2>
        <div className="mt-2 text-[0.95rem] text-muted leading-relaxed">{t.cuerpo}</div>

        <div className="mt-6 flex flex-col gap-2">
          {ultimo ? (
            <>
              <button
                type="button"
                className="btn btn-primary justify-center"
                onClick={() => {
                  cerrar();
                  router.push(hrefNuevo("/animales"));
                }}
              >
                Registrar mi primer animal →
              </button>
              <button type="button" className="btn btn-ghost justify-center" onClick={cerrar}>
                Explorar por mi cuenta
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              {paso > 0 && (
                <button type="button" className="btn btn-ghost flex-1 justify-center" onClick={() => setPaso(paso - 1)}>
                  ← Atrás
                </button>
              )}
              <button type="button" className="btn btn-primary flex-1 justify-center" onClick={() => setPaso(paso + 1)}>
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Num({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  );
}

// ---------------------------------------------------------------------------
//  Primeros pasos: lista en el inicio. El siguiente paso pendiente se muestra
//  abierto, con qué poner y un botón que abre el formulario de una vez.

interface Paso {
  id: string;
  hecho: boolean;
  ruta: string;
  titulo: string;
  como: string;
  boton: string;
  opcional?: boolean;
  /** Enlace secundario bajo el botón (p. ej. registrar varios a la vez). */
  alterno?: { texto: string; href: string };
}

export function PrimerosPasos() {
  const { db, loaded } = useDB();
  const [oculto, setOculto] = useState(true);
  const [empezados, setEmpezados] = useState(false);

  useEffect(() => {
    setOculto(leerBandera(PASOS_OCULTOS_KEY));
    setEmpezados(leerBandera(PASOS_EMPEZADOS_KEY));
  }, []);

  const listo =
    !!db &&
    loaded("animales") &&
    loaded("sanidad") &&
    loaded("gastos") &&
    loaded("tareas") &&
    loaded("propietarios");
  if (!listo || oculto || !db) return null;

  const pasos: Paso[] = [
    {
      id: "animal",
      hecho: db.animales.length > 0,
      ruta: "/animales",
      titulo: "Registre su primer animal",
      como: "Basta con la chapeta o un nombre, qué animal es (vaca, novilla, toro…) y su edad aproximada. Toma menos de un minuto.",
      boton: "Registrar animal",
      alterno: { texto: "¿Tiene muchos? Regístrelos varios a la vez", href: hrefNuevo("/animales", { modo: "varios" }) },
    },
    {
      id: "gasto",
      hecho: db.gastos.length > 0,
      ruta: "/gastos",
      titulo: "Anote un gasto",
      como: "Qué compró (sal, jornal, vacunas), cuánto costó y quién lo pagó. Si tiene socios, la app lo reparte según el porcentaje de cada uno.",
      boton: "Anotar gasto",
    },
    {
      id: "sanidad",
      hecho: db.sanidad.length > 0,
      ruta: "/sanidad",
      titulo: "Anote una vacuna o una purga",
      como: "Escoja el animal, el tipo (vacuna, purga o tratamiento), el producto y la fecha. Ponga la próxima fecha y RumeApp se la recuerda.",
      boton: "Anotar vacuna o purga",
    },
    {
      id: "tarea",
      hecho: db.tareas.length > 0,
      ruta: "/tareas",
      titulo: "Programe una actividad",
      como: "Una vacuna, un pesaje o la visita del veterinario, con su fecha. Le aparece en Actividades el día que toca.",
      boton: "Programar actividad",
    },
    {
      id: "socio",
      hecho: db.propietarios.length > 1,
      ruta: "/socios",
      titulo: "Agregue a sus socios",
      como: "Si la finca tiene socios, agréguelos con su porcentaje para repartir los gastos. Si es solo suya, sáltese este paso.",
      boton: "Agregar socio",
      opcional: true,
    },
  ];
  const obligatorios = pasos.filter((p) => !p.opcional);
  const hechos = obligatorios.filter((p) => p.hecho).length;
  const completo = hechos === obligatorios.length;
  const siguiente = pasos.find((p) => !p.hecho && !p.opcional) ?? null;
  // Quien ya venía usando la app con todo hecho no ve ni la lista ni la
  // felicitación; solo se felicita a quien vio la lista incompleta.
  if (!completo && !empezados) marcarBandera(PASOS_EMPEZADOS_KEY);
  if (completo && !empezados) return null;

  function ocultar() {
    marcarBandera(PASOS_OCULTOS_KEY);
    setOculto(true);
  }

  if (completo) {
    return (
      <section className="card max-w-3xl mx-auto mb-5 p-4 md:p-5 flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0" aria-hidden>
          ✓
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base">¡Su finca ya está andando!</h2>
          <p className="text-sm text-muted mt-0.5">
            Ya registró animales, sanidad, gastos y actividades. De aquí en adelante, anote cada
            cosa el día que pasa y RumeApp le lleva las cuentas y le avisa lo que toca.
          </p>
        </div>
        <button type="button" onClick={ocultar} className="text-xs text-muted underline shrink-0">
          Ocultar
        </button>
      </section>
    );
  }

  return (
    <section className="card max-w-3xl mx-auto mb-5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">Primeros pasos</h2>
          <p className="text-sm text-muted">
            {hechos} de {obligatorios.length} listos · así RumeApp empieza a trabajar para usted
          </p>
        </div>
        <button type="button" onClick={ocultar} className="text-xs text-muted underline shrink-0">
          Ocultar
        </button>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(hechos / obligatorios.length) * 100}%` }} />
      </div>

      <ol className="mt-3 flex flex-col gap-1">
        {pasos.map((p, i) => {
          const abierto = siguiente?.id === p.id;
          return (
            <li key={p.id} className={abierto ? "rounded-xl border border-primary/30 bg-primary-soft/40 p-3 my-1" : ""}>
              {abierto ? (
                <>
                  <div className="flex items-center gap-3">
                    <Circulo hecho={false} n={i + 1} activo />
                    <span className="text-sm font-semibold">{p.titulo}</span>
                  </div>
                  <p className="text-sm text-muted mt-2 ml-9 leading-relaxed">{p.como}</p>
                  <Link href={hrefNuevo(p.ruta)} className="btn btn-primary mt-3 ml-9 inline-flex">
                    {p.boton} →
                  </Link>
                  {p.alterno && (
                    <Link href={p.alterno.href} className="block mt-2 ml-9 text-sm text-primary underline underline-offset-4">
                      {p.alterno.texto}
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href={p.hecho ? p.ruta : hrefNuevo(p.ruta)}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2 transition ${p.hecho ? "opacity-60" : ""}`}
                >
                  <Circulo hecho={p.hecho} n={i + 1} />
                  <span className={`text-sm font-medium ${p.hecho ? "line-through" : ""}`}>
                    {p.titulo}
                    {p.opcional && !p.hecho && <span className="text-xs text-muted font-normal"> · opcional</span>}
                  </span>
                  {!p.hecho && <span className="ml-auto text-muted" aria-hidden>→</span>}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className="mt-3 text-xs text-muted underline inline-flex items-center gap-1"
        onClick={() => window.dispatchEvent(new Event("rumeapp:recorrido"))}
      >
        <IconSparkles size={11} /> Ver otra vez cómo funciona la app
      </button>
    </section>
  );
}

function Circulo({ hecho, n, activo = false }: { hecho: boolean; n: number; activo?: boolean }) {
  return (
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        hecho ? "bg-primary text-white" : activo ? "bg-primary text-white" : "border-2 border-primary text-primary"
      }`}
      aria-hidden
    >
      {hecho ? "✓" : n}
    </span>
  );
}

