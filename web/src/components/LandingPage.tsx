"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconCow,
  IconPasture,
  IconHealth,
  IconRepro,
  IconScale,
  IconMoney,
  IconBox,
  IconTask,
  IconUser,
  IconCheck,
  IconArrowUp,
  IconSparkles,
} from "./icons";
import PricingCards from "./PricingCards";
import CalculadoraPerdidas from "./CalculadoraPerdidas";

/** Páginas públicas: la portada es corta (una pantalla) y el resto vive aparte. */
export type SeccionLanding = "inicio" | "funciones" | "precios" | "preguntas";

export const RUTAS_LANDING: Record<string, SeccionLanding> = {
  "/": "inicio",
  "/funciones": "funciones",
  "/precios": "precios",
  "/preguntas": "preguntas",
};

interface Props {
  onLogin: () => void;
  /** Abre el registro directo (sin pasar por la pantalla de ingreso). */
  onSignup: () => void;
  seccion?: SeccionLanding;
}

// ---------------------------------------------------------------------------
//  Fotos (Unsplash, licencia libre)
// ---------------------------------------------------------------------------
const PHOTO_HERO =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1800&q=85";
const PHOTO_CAMPO_ATARDECER =
  "https://images.unsplash.com/photo-1471958680802-1345a694ba6d?auto=format&fit=crop&w=1800&q=85";

const PHOTO_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000' preserveAspectRatio='xMidYMid slice'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#22402A'/>
          <stop offset='100%' stop-color='#5F8248'/>
        </linearGradient>
      </defs>
      <rect width='800' height='1000' fill='url(#g)'/>
    </svg>`
  );

function handlePhotoError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = "1";
  img.src = PHOTO_FALLBACK;
}

/** Reveal on scroll — sube y aparece. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          io.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -50px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

// ---------------------------------------------------------------------------
//  Root
// ---------------------------------------------------------------------------
export default function LandingPage({ onLogin, onSignup, seccion = "inicio" }: Props) {
  return (
    <div className="min-h-screen relative overflow-x-hidden landing-root">
      <LandingStyles />
      <TopNav onLogin={onLogin} onSignup={onSignup} seccion={seccion} />

      {seccion === "inicio" && <HeroInicio onLogin={onLogin} onSignup={onSignup} />}

      {seccion === "funciones" && (
        <>
          <PageHeader
            eyebrow="Funciones"
            titulo={<>Todo lo que hace<br /><em>RumeApp.</em></>}
            texto="Hato, sanidad, reproducción, potreros, inventario y gastos entre socios. Esto es lo que va a tener en el celular."
          />
          <AppSummary />
          <ModulesOverview />
          <SociosSection />
          <ThreePillars />
          <PhonesShowcase />
          <AIAssistantSection />
          <AnimalCedulaSection />
          <FinalCTA onSignup={onSignup} />
          <StickyValueBar />
        </>
      )}

      {seccion === "precios" && (
        <>
          <PageHeader
            eyebrow="Precios"
            titulo={<>Empiece gratis.<br /><em>Crezca cuando quiera.</em></>}
            texto="El plan Ranchero es gratis para siempre, hasta 5 animales. Sin tarjeta."
          />
          <Pricing onSignup={onSignup} />
          <CalculadoraPerdidas onLogin={onSignup} />
          <FinalCTA onSignup={onSignup} />
        </>
      )}

      {seccion === "preguntas" && (
        <>
          <PageHeader
            eyebrow="Preguntas frecuentes"
            titulo={<>Lo que más<br /><em>nos preguntan.</em></>}
            texto="¿No encuentra su pregunta? Escríbanos a soporte@rumea.app."
          />
          <FAQ />
          <FinalCTA onSignup={onSignup} />
        </>
      )}

      <Footer onLogin={onLogin} onSignup={onSignup} compacto={seccion === "inicio"} />
    </div>
  );
}

const LINKS_NAV: { href: string; label: string; seccion: SeccionLanding }[] = [
  { href: "/", label: "Inicio", seccion: "inicio" },
  { href: "/funciones", label: "Funciones", seccion: "funciones" },
  { href: "/precios", label: "Precios", seccion: "precios" },
  { href: "/preguntas", label: "Preguntas", seccion: "preguntas" },
];

/** Encabezado de las páginas internas (funciones, precios, preguntas). */
function PageHeader({ eyebrow, titulo, texto }: { eyebrow: string; titulo: React.ReactNode; texto: string }) {
  return (
    <section className="relative pt-32 md:pt-40 pb-14 md:pb-20" style={{ background: "var(--forest)", color: "white" }}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
        <div className="text-[0.7rem] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--lime)" }}>
          {eyebrow}
        </div>
        <h1 className="display-xxl uppercase text-white mt-4" style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}>
          {titulo}
        </h1>
        <p className="mt-6 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.78)" }}>
          {texto}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Global styles
// ---------------------------------------------------------------------------
function LandingStyles() {
  return (
    <style jsx global>{`
      .landing-root {
        --forest: #14261A;
        --forest-2: #22402A;
        --forest-3: #345A3E;
        --lime: #B8CE7A;
        --lime-bright: #C8DE86;
        --cream: #F8F5EE;
        --sand: #EFE8D8;
        --ink: #0E1B12;
        background: var(--cream);
        color: var(--ink);
      }

      /* Tipografía única: Space Grotesk */
      .landing-root,
      .landing-root button,
      .landing-root input,
      .landing-root select,
      .landing-root textarea {
        font-family: var(--font-space-grotesk), system-ui, sans-serif;
      }

      .reveal { opacity: 0; transform: translateY(14px); transition: opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1); }
      .reveal.in-view { opacity: 1; transform: none; }

      /* Display XXL */
      .display-xxl {
        font-weight: 700;
        letter-spacing: -0.045em;
        line-height: 0.92;
        text-transform: none;
      }
      .display-xxl em {
        font-style: normal;
        color: var(--lime-bright);
      }
      .display-lg {
        font-weight: 700;
        letter-spacing: -0.035em;
        line-height: 0.95;
      }
      .display-md {
        font-weight: 600;
        letter-spacing: -0.025em;
        line-height: 1.05;
      }

      /* Hero: foto grande con overlay verde */
      .hero-photo {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
      }
      .hero-photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 60%;
        transform: scale(1.05);
        animation: kenburns 26s ease-in-out infinite alternate;
      }
      @keyframes kenburns {
        from { transform: scale(1.05); }
        to { transform: scale(1.14); }
      }
      .hero-photo::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(180deg, rgba(14, 27, 18, 0.65) 0%, rgba(14, 27, 18, 0.55) 55%, rgba(20, 38, 26, 0.98) 100%),
          linear-gradient(90deg, rgba(14, 27, 18, 0.65) 0%, rgba(14, 27, 18, 0.3) 60%);
      }
      @media (prefers-reduced-motion: reduce) {
        .hero-photo img { animation: none; }
      }

      /* Badge circular flotante estilo axolotl — grande y protagónico */
      .badge-circle {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 148px;
        height: 148px;
        border-radius: 50%;
        background:
          radial-gradient(circle at 30% 20%, rgba(184, 206, 122, 0.28) 0%, transparent 55%),
          linear-gradient(160deg, rgba(255, 255, 255, 0.22) 0%, rgba(20, 38, 26, 0.20) 100%);
        border: 2px solid rgba(184, 206, 122, 0.55);
        backdrop-filter: blur(18px) saturate(1.2);
        -webkit-backdrop-filter: blur(18px) saturate(1.2);
        color: white;
        text-align: center;
        padding: 10px;
        box-shadow:
          0 24px 48px -14px rgba(0, 0, 0, 0.5),
          0 8px 20px -8px rgba(20, 38, 26, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.25);
        transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s;
      }
      .badge-circle:hover {
        transform: translateY(-4px) scale(1.03);
        box-shadow:
          0 32px 64px -14px rgba(0, 0, 0, 0.55),
          0 12px 24px -8px rgba(184, 206, 122, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.30);
      }
      .badge-circle .b-icon {
        color: var(--lime-bright);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(184, 206, 122, 0.15);
        border: 1px solid rgba(184, 206, 122, 0.35);
      }
      .badge-circle .b-label {
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        line-height: 1.15;
        text-transform: uppercase;
        font-weight: 700;
        color: white;
        text-shadow: 0 1px 3px rgba(0,0,0,0.4);
      }
      @media (max-width: 767px) {
        .badge-circle {
          width: 118px;
          height: 118px;
          gap: 6px;
          padding: 8px;
        }
        .badge-circle .b-icon {
          width: 28px;
          height: 28px;
        }
        .badge-circle .b-label {
          font-size: 0.6rem;
        }
      }

      /* Ring frame verde (marco estilo axolotl) */
      .ring-card {
        position: relative;
        border-radius: 28px;
        padding: 2px;
        background: linear-gradient(180deg, var(--forest-3) 0%, var(--forest-2) 50%, var(--forest) 100%);
        box-shadow:
          0 24px 60px -18px rgba(20, 38, 26, 0.55),
          0 8px 24px -8px rgba(20, 38, 26, 0.30);
      }
      .ring-card-inner {
        border-radius: 26px;
        background: linear-gradient(180deg, #1D3524 0%, #14261A 100%);
        padding: 1.75rem;
        color: white;
        overflow: hidden;
        position: relative;
      }
      .ring-card-inner::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent 0%, rgba(184, 206, 122, 0.4) 50%, transparent 100%);
      }

      /* Card feature con marco (versión sobre cream) */
      .feature-frame {
        position: relative;
        border-radius: 24px;
        padding: 2px;
        background: linear-gradient(180deg, rgba(34, 64, 42, 0.20) 0%, rgba(34, 64, 42, 0.08) 100%);
      }
      .feature-frame-inner {
        border-radius: 22px;
        background: white;
        padding: 1.75rem;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      /* Botones */
      .btn-lime {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.95rem 1.75rem;
        border-radius: 999px;
        font-size: 0.9rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        text-transform: uppercase;
        background: var(--lime);
        color: var(--forest);
        border: 1px solid var(--lime);
        transition: all 200ms cubic-bezier(0.16,1,0.3,1);
        cursor: pointer;
      }
      .btn-lime:hover {
        background: var(--lime-bright);
        transform: translateY(-2px);
        box-shadow: 0 12px 32px -8px rgba(184, 206, 122, 0.55);
      }
      /* Botón principal "Empezar ahora": degradado lima, brillo que cruza,
         anillo que respira y flecha en círculo que avanza al pasar el mouse. */
      .btn-cta {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.9rem;
        padding: 0.55rem 0.55rem 0.55rem 1.9rem;
        border-radius: 999px;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--forest);
        background: linear-gradient(135deg, #DDEDA4 0%, #C3D987 45%, #A5C062 100%);
        border: 1px solid rgba(255, 255, 255, 0.55);
        box-shadow:
          0 18px 40px -12px rgba(184, 206, 122, 0.65),
          0 4px 12px -4px rgba(0, 0, 0, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.7),
          inset 0 -2px 0 rgba(20, 38, 26, 0.12);
        overflow: hidden;
        isolation: isolate;
        cursor: pointer;
        transition: transform 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms;
      }
      .btn-cta::after {
        content: "";
        position: absolute;
        top: 0; bottom: 0;
        left: -60%;
        width: 45%;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.65), transparent);
        transform: skewX(-20deg);
        animation: cta-brillo 3.6s ease-in-out infinite;
        z-index: -1;
      }
      @keyframes cta-brillo {
        0%, 55% { left: -60%; }
        100% { left: 130%; }
      }
      .btn-cta .cta-flecha {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 999px;
        background: var(--forest);
        color: var(--lime-bright);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        transition: transform 220ms cubic-bezier(0.16,1,0.3,1);
      }
      .btn-cta:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow:
          0 24px 50px -12px rgba(184, 206, 122, 0.85),
          0 6px 16px -4px rgba(0, 0, 0, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.7),
          inset 0 -2px 0 rgba(20, 38, 26, 0.12);
      }
      .btn-cta:hover .cta-flecha { transform: translateX(4px); }
      .btn-cta:active { transform: translateY(0) scale(0.98); }
      .cta-wrap {
        position: relative;
        display: inline-flex;
      }
      /* Anillo que respira alrededor del botón: llama el ojo sin gritar. */
      .cta-wrap::before {
        content: "";
        position: absolute;
        inset: -6px;
        border-radius: 999px;
        border: 2px solid rgba(212, 231, 154, 0.55);
        animation: cta-anillo 2.4s ease-out infinite;
        pointer-events: none;
      }
      @keyframes cta-anillo {
        0% { transform: scale(0.96); opacity: 0.9; }
        100% { transform: scale(1.12); opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .btn-cta::after, .cta-wrap::before { animation: none; }
      }
      .btn-ghost-w {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.95rem 1.75rem;
        border-radius: 999px;
        font-size: 0.9rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        text-transform: uppercase;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.35);
        backdrop-filter: blur(10px);
        transition: all 200ms cubic-bezier(0.16,1,0.3,1);
        cursor: pointer;
      }
      .btn-ghost-w:hover {
        background: rgba(255, 255, 255, 0.18);
        transform: translateY(-2px);
      }
      .btn-forest {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.85rem 1.6rem;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        text-transform: uppercase;
        background: var(--forest-2);
        color: white;
        border: 1px solid var(--forest-2);
        transition: all 200ms cubic-bezier(0.16,1,0.3,1);
        cursor: pointer;
      }
      .btn-forest:hover {
        background: var(--forest);
        transform: translateY(-2px);
        box-shadow: 0 12px 32px -8px rgba(20, 38, 26, 0.35);
      }

      /* Módulo chip (grid de 10) */
      .mod-chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        padding: 1.15rem 0.5rem;
        border-radius: 16px;
        background: rgba(184, 206, 122, 0.05);
        border: 1px solid rgba(184, 206, 122, 0.25);
        transition: all 220ms cubic-bezier(0.16,1,0.3,1);
      }
      .mod-chip:hover {
        background: rgba(184, 206, 122, 0.12);
        border-color: rgba(184, 206, 122, 0.55);
        transform: translateY(-3px);
      }
      .mod-chip-ico {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(184, 206, 122, 0.18);
        color: var(--lime-bright);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mod-chip-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: white;
        letter-spacing: -0.005em;
      }

      /* Sticky bottom bar */
      .sticky-bar {
        position: fixed;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 40;
        display: flex;
        align-items: center;
        gap: 1.1rem;
        padding: 0.5rem 1.1rem;
        border-radius: 999px;
        background: rgba(14, 27, 18, 0.7);
        border: 1px solid rgba(184, 206, 122, 0.25);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        color: white;
        box-shadow: 0 12px 28px -12px rgba(0, 0, 0, 0.35);
        max-width: calc(100% - 32px);
        opacity: 0.82;
        transition: opacity 0.25s ease;
      }
      .sticky-bar:hover { opacity: 1; }
      .sticky-bar .item {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.66rem;
        font-weight: 500;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.88);
        white-space: nowrap;
      }
      .sticky-bar .dot {
        width: 5px; height: 5px;
        border-radius: 50%;
        background: var(--lime-bright);
        box-shadow: 0 0 8px var(--lime-bright);
      }
      /* En celular la barra flotante tapaba botones (p. ej. los de Precios)
         y no cabía: ".sticky-bar .item" le ganaba a "hidden sm:inline-flex"
         y salían los 3 mensajes. Es decorativa: se oculta en pantallas chicas. */
      @media (max-width: 640px) {
        .sticky-bar { display: none; }
      }
      @media (min-width: 641px) and (max-width: 767px) {
        .sticky-bar .item:nth-child(3) { display: none; }
      }

      /* Inputs redondeados */
      .landing-input {
        width: 100%;
        padding: 0.85rem 1.1rem;
        border-radius: 14px;
        border: 1px solid rgba(20, 38, 26, 0.15);
        background: white;
        font-size: 0.95rem;
        font-family: inherit;
        color: var(--ink);
        transition: all 180ms;
      }
      .landing-input:focus {
        outline: none;
        border-color: var(--forest-2);
        box-shadow: 0 0 0 4px rgba(34, 64, 42, 0.10);
      }

      /* Phone frames */
      .phone-frame {
        position: relative;
        border-radius: 42px;
        padding: 10px;
        background: linear-gradient(135deg, #1a1a1a 0%, #2b2b2b 100%);
        box-shadow:
          0 40px 80px -20px rgba(0,0,0,0.45),
          0 12px 24px -8px rgba(0,0,0,0.25),
          inset 0 1px 0 rgba(255,255,255,0.08);
        /* Forma de celular: proporción fija incluyendo padding del marco.
           260/(260*19.5/9)=9/19.5, más 20px de padding vertical ≈ ancho/altura fijos */
        width: 100%;
        max-width: 280px;
        margin-inline: auto;
      }
      .phone-screen {
        border-radius: 32px;
        background: var(--cream);
        overflow: hidden;
        position: relative;
        /* Aspect ratio estricto para que el phone mantenga forma de celular */
        aspect-ratio: 9 / 19.5;
        width: 100%;
      }
      .phone-screen > .phone-body {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .phone-frame::before {
        content: "";
        position: absolute;
        top: 14px; left: 50%;
        transform: translateX(-50%);
        width: 90px; height: 22px;
        background: #0a0a0a;
        border-radius: 12px;
        z-index: 10;
      }
      .phone-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 22px 8px;
        font-family: var(--font-geist-mono), monospace;
        font-size: 0.68rem;
        font-weight: 600;
      }
      .phone-content {
        padding: 12px 16px 20px;
      }

      /* Chat bubbles */
      .chat-bubble-user, .chat-bubble-ai {
        max-width: 85%;
        padding: 0.75rem 1rem;
        border-radius: 18px;
        font-size: 0.85rem;
        line-height: 1.45;
        word-wrap: break-word;
      }
      .chat-bubble-user {
        background: var(--forest);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      }
      .chat-bubble-ai {
        background: rgba(20, 38, 26, 0.06);
        color: var(--ink);
        border-bottom-left-radius: 4px;
        border: 1px solid rgba(20, 38, 26, 0.08);
      }
      .typing-dot {
        display: inline-block;
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--forest-3);
        margin: 0 1px;
        animation: bounce 1.2s infinite;
      }
      .typing-dot:nth-child(2) { animation-delay: 0.15s; }
      .typing-dot:nth-child(3) { animation-delay: 0.30s; }
      @keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-4px); opacity: 1; }
      }

      /* QR code fake */
      .qr {
        display: grid;
        grid-template-columns: repeat(21, 1fr);
        gap: 2px;
        aspect-ratio: 1/1;
        padding: 8px;
        background: white;
        border-radius: 12px;
        border: 1px solid rgba(20, 38, 26, 0.08);
      }
      .qr div { background: transparent; }
      .qr div.on { background: var(--forest); }
    `}</style>
  );
}

// ---------------------------------------------------------------------------
//  Nav
// ---------------------------------------------------------------------------
function TopNav({ onLogin, onSignup, seccion }: { onLogin: () => void; onSignup: () => void; seccion: SeccionLanding }) {
  const [scrolledReal, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Con el menú abierto la barra se pone clara para que se lea sobre el menú.
  const scrolled = scrolledReal || menuOpen;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all"
      style={{
        background: scrolled ? "rgba(248, 245, 238, 0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(20, 38, 26, 0.10)" : "1px solid transparent",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/logo.png"
            alt="RumeApp"
            width={52}
            height={52}
            sizes="52px"
            className="w-11 h-11 md:w-13 md:h-13 object-contain shrink-0"
            style={{ filter: scrolled ? "none" : "drop-shadow(0 2px 6px rgba(0,0,0,0.35))" }}
            priority
          />
          <div
            className="text-lg md:text-xl font-bold tracking-tight"
            style={{ color: scrolled ? "var(--forest)" : "white", textShadow: scrolled ? "none" : "0 1px 4px rgba(0,0,0,0.4)" }}
          >
            RumeApp
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {LINKS_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[0.8rem] px-3.5 py-1.5 rounded-full transition font-medium uppercase"
              style={{
                color: scrolled ? "rgba(20, 38, 26, 0.75)" : "rgba(255,255,255,0.90)",
                textShadow: scrolled ? "none" : "0 1px 3px rgba(0,0,0,0.35)",
                letterSpacing: "0.06em",
                background: l.seccion === seccion ? (scrolled ? "rgba(20,38,26,0.07)" : "rgba(255,255,255,0.14)") : "transparent",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-full text-[0.75rem] font-semibold uppercase tracking-wider transition"
            style={{
              color: scrolled ? "var(--forest)" : "white",
              background: scrolled ? "transparent" : "rgba(255,255,255,0.15)",
              border: `1px solid ${scrolled ? "rgba(20,38,26,0.15)" : "rgba(255,255,255,0.25)"}`,
              backdropFilter: "blur(8px)",
              letterSpacing: "0.08em",
            }}
            onClick={onLogin}
          >
            Ingresar
          </button>
          {/* En celular no caben los dos: "Ingresar" arriba y "Empezar ahora" queda
              grande en la portada. Envueltos en <span>: .btn-lime fuerza display. */}
          <span className="sm:hidden">
            <button className="btn-lime" style={{ padding: "0.55rem 1.15rem", fontSize: "0.72rem" }} onClick={onLogin}>
              Ingresar
            </button>
          </span>
          <span className="hidden sm:inline">
            <button className="btn-lime" style={{ padding: "0.55rem 1.15rem", fontSize: "0.72rem" }} onClick={onSignup}>
              Empezar ahora
            </button>
          </span>
          <button
            className="lg:hidden ml-1 p-2 rounded-full"
            style={{
              background: scrolled ? "rgba(20,38,26,0.06)" : "rgba(255,255,255,0.15)",
              color: scrolled ? "var(--forest)" : "white",
              border: `1px solid ${scrolled ? "rgba(20,38,26,0.10)" : "rgba(255,255,255,0.25)"}`,
            }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6L18 18M6 18L18 6" strokeLinecap="round" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                  <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
                  <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden" style={{ background: "rgba(248, 245, 238, 0.98)", borderTop: "1px solid rgba(20,38,26,0.10)" }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {LINKS_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-left text-base font-medium px-3 py-3 rounded-lg"
                style={{ color: "var(--forest)", background: l.seccion === seccion ? "rgba(20,38,26,0.06)" : "transparent" }}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <button
              className="btn-lime mt-2 justify-center w-full"
              onClick={() => {
                setMenuOpen(false);
                onSignup();
              }}
            >
              Empezar ahora
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
//  Hero
// ---------------------------------------------------------------------------
function HeroInicio({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
      <div className="hero-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PHOTO_HERO} alt="" onError={handlePhotoError} />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-14 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-8 items-center">
          <div className="text-white">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-[0.16em]"
              style={{ background: "rgba(184,206,122,0.16)", border: "1px solid rgba(184,206,122,0.35)", color: "var(--lime-bright)" }}
            >
              Gestión ganadera · Hecho en Colombia
            </div>
            <h1
              className="display-xxl uppercase text-white mt-6"
              style={{ fontSize: "clamp(2.7rem, 7vw, 5.25rem)", textShadow: "0 2px 20px rgba(0,0,0,0.35)" }}
            >
              Toda su finca<br />
              en el <em>celular.</em>
            </h1>
            <p
              className="mt-6 text-base md:text-lg max-w-xl leading-relaxed"
              style={{ color: "rgba(255,255,255,0.90)", textShadow: "0 1px 6px rgba(0,0,0,0.35)" }}
            >
              Animales, vacunas, partos y gastos entre socios, anotados en segundos y sin
              cuaderno. RumeApp le avisa qué toca hacer cada día.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-5 sm:items-center">
<span className="cta-wrap w-full sm:w-auto">
                <button className="btn-cta w-full sm:w-auto" onClick={onSignup}>
                  Empezar ahora
                  <span className="cta-flecha" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </span>
              <span className="text-sm text-center sm:text-left" style={{ color: "rgba(255,255,255,0.80)" }}>
                Gratis hasta 5 animales · Sin tarjeta
              </span>
            </div>
            <p className="mt-5 text-sm text-center sm:text-left" style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 1px 6px rgba(0,0,0,0.35)" }}>
              ¿Ya tiene cuenta?{" "}
              <button onClick={onLogin} className="font-semibold underline underline-offset-4" style={{ color: "var(--lime-bright)" }}>
                Ingrese aquí
              </button>
            </p>
          </div>

          <CelularPortada />

          {/* En celular el teléfono queda debajo: quien baja hasta aquí vuelve a
              tener el botón a la mano. */}
          <div className="lg:hidden flex justify-center">
            <span className="cta-wrap w-full sm:w-auto">
              <button className="btn-cta w-full sm:w-auto" onClick={onSignup}>
                Empezar ahora
                <span className="cta-flecha" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
            </span>
          </div>
        </div>

        <div className="mt-10 lg:mt-14 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
          <Link href="/funciones" className="underline underline-offset-4 hover:text-white">Ver todo lo que hace →</Link>
          <Link href="/precios" className="underline underline-offset-4 hover:text-white">Precios</Link>
          <Link href="/preguntas" className="underline underline-offset-4 hover:text-white">Preguntas</Link>
        </div>
      </div>
    </section>
  );
}

/** Celular de la portada: captura real de la pantalla de Sanidad + un aviso encima. */
function CelularPortada() {
  return (
    <div className="relative mx-auto w-full max-w-[290px]">
      <div className="phone-frame" style={{ maxWidth: 290 }}>
        <div className="phone-screen">
          <Image
            src="/app/pantalla-sanidad.webp"
            alt="Pantalla de Sanidad de RumeApp: 6 animales sin vacunar del 2.º ciclo, purga mañana, vitaminas en 5 días"
            fill
            sizes="290px"
            priority
            className="object-cover object-top"
          />
        </div>
      </div>
      <div
        className="absolute -left-4 sm:-left-14 bottom-16 flex gap-3 items-center rounded-2xl px-3.5 py-3 max-w-[250px]"
        style={{ background: "rgba(248,245,238,0.97)", boxShadow: "0 18px 40px -12px rgba(0,0,0,0.45)", color: "var(--forest)" }}
      >
        <Image src="/logo.png" alt="" width={34} height={34} className="w-[34px] h-[34px] rounded-lg shrink-0" />
        <div className="min-w-0">
          <div className="text-[0.62rem] font-mono uppercase tracking-widest" style={{ opacity: 0.6 }}>RumeApp · ahora</div>
          <div className="text-[0.82rem] font-semibold leading-snug">Hoy toca: purgar 8 novillas del potrero La Loma</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Resumen — qué puede hacer la app
// ---------------------------------------------------------------------------
function AppSummary() {
  const ref = useReveal<HTMLDivElement>();
  const items = [
    {
      Icon: IconCow,
      verb: "Lleve la hoja de vida",
      desc: "de cada animal: raza, categoría, peso, padres, potrero, fotos y estado (activo, vendido, muerto).",
    },
    {
      Icon: IconHealth,
      verb: "No se le pase una vacuna",
      desc: "programe vacunas, tratamientos y desparasitaciones. La app le avisa qué toca la próxima semana.",
    },
    {
      Icon: IconRepro,
      verb: "Controle preñeces y partos",
      desc: "servicios (monta o inseminación), diagnóstico, fecha probable de parto y registro de crías nuevas.",
    },
    {
      Icon: IconMoney,
      verb: "Reparta gastos entre socios",
      desc: "por porcentaje, por cabezas o partes iguales. Vea al instante quién debe qué a quién.",
    },
    {
      Icon: IconTask,
      verb: "Organice las tareas del día",
      desc: "ordeño, mantenimiento, sanidad — con prioridad, categoría y responsable. En calendario o en lista.",
    },
    {
      Icon: IconSparkles,
      verb: "Trabaje con todo su equipo",
      desc: "invite socios y trabajadores. Cada quien registra desde el potrero y todos ven los cambios al instante.",
    },
  ];
  return (
    <section className="relative py-16 md:py-24" style={{ background: "var(--sand)" }}>
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-14 md:mb-16 max-w-3xl mx-auto">
          <span
            className="inline-block text-[0.65rem] font-mono uppercase tracking-[0.14em] px-3 py-1.5 rounded-full mb-5 font-semibold"
            style={{ background: "var(--forest)", color: "var(--lime-bright)" }}
          >
            QUÉ HACE RUMEAPP
          </span>
          <h2 className="display-lg uppercase" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "var(--forest)" }}>
            Todo el control<br />
            de la finca,{" "}
            <em style={{ color: "var(--forest-3)", fontStyle: "normal" }}>en una sola app.</em>
          </h2>
          <p className="mt-5 text-base md:text-lg" style={{ color: "rgba(20, 38, 26, 0.72)" }}>
            Registre, controle y decida — desde el celular, sin cuaderno, sin Excel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {items.map((it) => (
            <SummaryItem key={it.verb} {...it} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SummaryItem({
  Icon, verb, desc,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  verb: string;
  desc: string;
}) {
  return (
    <div
      className="rounded-3xl p-6 md:p-7 flex items-start gap-5"
      style={{
        background: "white",
        border: "1px solid rgba(20, 38, 26, 0.08)",
        boxShadow: "0 4px 16px -8px rgba(20, 38, 26, 0.08)",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{
          background: "linear-gradient(160deg, var(--lime) 0%, #A3BE6C 100%)",
          color: "var(--forest)",
          boxShadow: "0 8px 20px -6px rgba(184, 206, 122, 0.55)",
        }}
      >
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <h3
          className="uppercase font-bold leading-tight tracking-tight"
          style={{ fontSize: "1.1rem", color: "var(--forest)" }}
        >
          {verb}
        </h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(20, 38, 26, 0.68)" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  [02] MÓDULOS — grid 10 módulos sobre fondo forest oscuro
// ---------------------------------------------------------------------------
function ModulesOverview() {
  const ref = useReveal<HTMLDivElement>();
  const mods = [
    { icon: <IconCow size={20} />, name: "Hato" },
    { icon: <IconPasture size={20} />, name: "Potreros" },
    { icon: <IconHealth size={20} />, name: "Sanidad" },
    { icon: <IconRepro size={20} />, name: "Reproducción" },
    { icon: <IconScale size={20} />, name: "Peso" },
    { icon: <IconMoney size={20} />, name: "Gastos" },
    { icon: <IconTask size={20} />, name: "Tareas" },
    { icon: <IconBox size={20} />, name: "Inventario" },
    { icon: <IconUser size={20} />, name: "Socios" },
    { icon: <IconSparkles size={20} />, name: "En vivo" },
  ];
  return (
    <section
      id="modulos"
      className="relative"
      style={{ background: "var(--forest)", color: "white" }}
    >
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 md:px-6 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12 items-center">
          <div>
            <h2
              className="display-lg uppercase text-white"
              style={{ fontSize: "clamp(2.2rem, 5.5vw, 3.75rem)" }}
            >
              Todo lo de<br />
              su finca, en<br />
              <em style={{ color: "var(--lime-bright)", fontStyle: "normal" }}>un solo lugar.</em>
            </h2>
            <p className="mt-6 max-w-md" style={{ color: "rgba(255,255,255,0.75)" }}>
              Diez módulos conectados. Reemplaza el Excel, el cuaderno y el chat
              de WhatsApp con una sola plataforma.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {mods.map((m) => (
              <div key={m.name} className="mod-chip">
                <div className="mod-chip-ico">{m.icon}</div>
                <div className="mod-chip-label">{m.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}

// ---------------------------------------------------------------------------
//  [03] 3 PILARES
// ---------------------------------------------------------------------------
function ThreePillars() {
  const ref = useReveal<HTMLDivElement>();
  const pillars = [
    {
      eyebrow: "Tiempo real",
      title: "Datos al instante, sin recargar",
      desc: "Cuando un socio o trabajador registra algo desde el potrero, todos lo ven al instante. Con autor y fecha.",
      icon: <IconSparkles size={22} />,
      badge: "AL INSTANTE",
    },
    {
      eyebrow: "Solo aquí",
      title: "Reparto real entre socios",
      desc: "Por %, por cabezas o partes iguales. La app le muestra quién debe qué a quién — sin calculadora, sin discusiones.",
      icon: <IconMoney size={22} />,
      badge: "ÚNICO",
      featured: true,
    },
    {
      eyebrow: "Próximamente",
      title: "Cédula digital por animal",
      desc: "Cada cabeza con su propio QR. Muéstrelo al veterinario o al comprador — historial completo, imposible falsificar.",
      icon: <IconCow size={22} />,
      badge: "PRÓX.",
    },
  ];
  return (
    <section id="pilares" className="relative max-w-6xl mx-auto px-4 md:px-6 py-24 md:py-32">
      <div ref={ref} className="reveal">
        <div className="text-center mb-14 md:mb-20">
          <h2
            className="display-lg uppercase"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "var(--forest)" }}
          >
            Tres razones que<br />
            <em style={{ color: "var(--forest-3)", fontStyle: "normal" }}>nadie más ofrece.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="feature-frame"
              style={
                p.featured
                  ? {
                      background:
                        "linear-gradient(180deg, var(--forest-2) 0%, var(--forest) 100%)",
                    }
                  : {}
              }
            >
              <div className="feature-frame-inner">
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: p.featured ? "var(--forest-2)" : "rgba(184, 206, 122, 0.18)",
                      color: p.featured ? "var(--lime-bright)" : "var(--forest-2)",
                    }}
                  >
                    {p.icon}
                  </div>
                  <span
                    className="text-[0.6rem] font-mono uppercase tracking-[0.14em] px-2.5 py-1 rounded-full"
                    style={{
                      background: p.featured ? "var(--lime)" : "rgba(20, 38, 26, 0.06)",
                      color: p.featured ? "var(--forest)" : "var(--forest-2)",
                    }}
                  >
                    {p.badge}
                  </span>
                </div>
                <div className="text-[0.65rem] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--forest-3)", opacity: 0.7 }}>
                  {p.eyebrow}
                </div>
                <h3
                  className="mt-2 uppercase font-bold"
                  style={{
                    fontSize: "1.35rem",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    color: "var(--forest)",
                  }}
                >
                  {p.title}
                </h3>
                <p
                  className="mt-4 text-[0.95rem] leading-relaxed flex-1"
                  style={{ color: "rgba(20, 38, 26, 0.68)" }}
                >
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  [04] PRECIOS
// ---------------------------------------------------------------------------
function Pricing({ onSignup }: { onSignup: () => void }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="precios" className="relative pt-12 md:pt-16 pb-24 md:pb-32" style={{ background: "var(--sand)" }}>
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 md:px-6">

        <PricingCards onSelect={() => onSignup()} />

        <p className="text-center text-[0.7rem] font-mono uppercase tracking-widest mt-10" style={{ color: "var(--forest-3)", opacity: 0.65 }}>
          Precios en pesos colombianos. Pago por transferencia, Nequi o Daviplata.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  [05] FAQ
// ---------------------------------------------------------------------------
function FAQ() {
  const ref = useReveal<HTMLDivElement>();
  const qs = [
    {
      q: "¿Cuánto cuesta usar RumeApp?",
      a: "Nada para arrancar. El plan Ranchero es gratis para siempre (hasta 5 animales). Los planes pagos traen de regalo el Curso intensivo de ganadería digital; pagando el año completo ahorra 20%.",
    },
    {
      q: "¿Necesito instalar la app?",
      a: "No. Se abre en cualquier navegador del celular o computador. Funciona como app nativa — puede guardarla en la pantalla de inicio.",
    },
    {
      q: "¿Sirve sin señal en el potrero?",
      a: "Necesita internet para guardar, pero aguanta bien la señal débil o intermitente: si la conexión se cae mientras registra algo, la app le avisa y guarda el cambio sola apenas vuelve la señal (mientras no cierre la app). El modo 100% sin conexión está en desarrollo.",
    },
    {
      q: "¿Mis datos están seguros?",
      a: "Sí. Cada finca queda aislada en la base de datos: solo los usuarios que usted invite pueden ver sus animales, gastos y demás. Hacemos copias de respaldo automáticas todos los días.",
    },
    {
      q: "¿Puedo invitar a mis socios y trabajadores?",
      a: "Sí. Cada socio con su email y su porcentaje. Los trabajadores entran como operarios y registran desde el potrero.",
    },
    {
      q: "¿Puedo migrar mis datos de Excel?",
      a: "Sí. Escríbanos con su Excel y le ayudamos con la importación inicial sin costo.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative max-w-3xl mx-auto px-4 md:px-6 pt-12 md:pt-16 pb-24 md:pb-32">
      <div ref={ref} className="reveal">
        <div className="space-y-3">
          {qs.map((item, i) => (
            <div
              key={item.q}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                border: "1px solid rgba(20, 38, 26, 0.08)",
                boxShadow: "0 4px 16px -8px rgba(20, 38, 26, 0.08)",
              }}
            >
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm md:text-base font-semibold uppercase tracking-tight" style={{ color: "var(--forest)" }}>
                  {item.q}
                </span>
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-mono transition-transform shrink-0"
                  style={{
                    background: "var(--forest-2)",
                    color: "white",
                    transform: open === i ? "rotate(45deg)" : "none",
                  }}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "rgba(20, 38, 26, 0.72)" }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Final CTA con foto
// ---------------------------------------------------------------------------
function FinalCTA({ onSignup }: { onSignup: () => void }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative max-w-6xl mx-auto px-4 md:px-6 pb-24 md:pb-32">
      <div
        ref={ref}
        className="reveal relative overflow-hidden rounded-[36px]"
        style={{ boxShadow: "0 50px 100px -20px rgba(20, 38, 26, 0.45)" }}
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PHOTO_CAMPO_ATARDECER}
            alt=""
            loading="lazy"
            onError={handlePhotoError}
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 55%" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(14, 27, 18, 0.85) 0%, rgba(34, 64, 42, 0.75) 100%)",
            }}
          />
        </div>
        <div className="relative z-10 text-center px-6 py-20 md:py-28 text-white">
          <h3
            className="display-xxl uppercase"
            style={{ fontSize: "clamp(2.2rem, 5.5vw, 4rem)", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
          >
            Su finca<br />
            <em style={{ color: "var(--lime-bright)", fontStyle: "normal" }}>merece control.</em>
          </h3>
          <p
            className="mt-6 max-w-xl mx-auto text-base md:text-lg"
            style={{ color: "rgba(255,255,255,0.90)", textShadow: "0 1px 6px rgba(0,0,0,0.35)" }}
          >
            Sin instalación, sin tarjeta de crédito. En 2 minutos ya está
            registrando animales.
          </p>
          <button className="btn-lime mt-10" onClick={onSignup} style={{ padding: "1.1rem 2.4rem" }}>
            Crear mi cuenta gratis <IconArrowUp size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Footer
// ---------------------------------------------------------------------------
const REDES = [
  {
    nombre: "Instagram",
    url: "https://www.instagram.com/rumea.app/",
    icono:
      "M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm0 8.4a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.3-9.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z",
  },
  {
    nombre: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61594430472677",
    icono:
      "M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z",
  },
];

function Footer({ onLogin, onSignup, compacto = false }: { onLogin: () => void; onSignup: () => void; compacto?: boolean }) {
  if (compacto) return <FooterCompacto />;
  return (
    <footer className="relative" style={{ background: "var(--forest)", color: "white" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="RumeApp"
                width={56}
                height={56}
                sizes="56px"
                className="w-14 h-14 object-contain"
              />
              <div className="text-2xl font-bold uppercase tracking-tight">RumeApp</div>
            </div>
            <p className="mt-5 text-sm max-w-md leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              La plataforma de gestión ganadera para fincas de Colombia y
              Latinoamérica. Hato, sanidad, gastos entre socios &mdash; todo en
              un solo lugar.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {REDES.map((r) => (
                <a
                  key={r.nombre}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`RumeApp en ${r.nombre}`}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "white" }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" style={{ color: "var(--lime)" }}>
                    <path d={r.icono} />
                  </svg>
                  {r.nombre}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[0.65rem] font-mono uppercase tracking-widest mb-4" style={{ color: "var(--lime)" }}>
              Producto
            </div>
            <ul className="space-y-2.5 text-sm">
              <li><FooterNav href="/funciones">Funciones</FooterNav></li>
              <li><FooterNav href="/precios">Precios</FooterNav></li>
              <li><FooterNav href="/preguntas">Preguntas frecuentes</FooterNav></li>
            </ul>
          </div>
          <div>
            <div className="text-[0.65rem] font-mono uppercase tracking-widest mb-4" style={{ color: "var(--lime)" }}>
              Cuenta
            </div>
            <ul className="space-y-2.5 text-sm">
              <li><FooterLink onClick={onLogin}>Iniciar sesión</FooterLink></li>
              <li><FooterLink onClick={onSignup}>Crear cuenta gratis</FooterLink></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 pt-6 border-t flex items-center justify-between flex-wrap gap-3 text-[0.72rem] font-mono uppercase tracking-widest"
          style={{ borderColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}
        >
          <div>RumeApp &middot; {new Date().getFullYear()}</div>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="hover:text-white transition" style={{ color: "inherit" }}>
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-white transition" style={{ color: "inherit" }}>
              Privacidad
            </Link>
            <span>Hecho en Colombia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterNav({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="transition hover:text-white" style={{ color: "rgba(255,255,255,0.75)" }}>
      {children}
    </Link>
  );
}

/** Pie corto de la portada: una línea con redes y legales. */
function FooterCompacto() {
  return (
    <footer style={{ background: "var(--forest)", color: "rgba(255,255,255,0.6)" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-wrap items-center justify-center sm:justify-between text-center gap-x-6 gap-y-3 text-[0.72rem] font-mono uppercase tracking-widest">
        <div>RumeApp &middot; Hecho en Colombia</div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {REDES.map((r) => (
            <a key={r.nombre} href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
              {r.nombre}
            </a>
          ))}
          <Link href="/terminos" className="hover:text-white">Términos</Link>
          <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="text-left transition"
      style={{ color: "rgba(255,255,255,0.75)" }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
//  Sticky bottom bar — 3 valores clave (siempre visible)
// ---------------------------------------------------------------------------
function StickyValueBar() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const bottomLeft =
        document.documentElement.scrollHeight - window.innerHeight - y;
      // Aparece después del hero y desaparece al acercarse al footer/CTA
      setVisible(y > 400 && bottomLeft > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <div className="sticky-bar">
      <span className="item">
        <span className="dot" /> Señal débil &middot; Guarda al reconectar
      </span>
      <span className="item hidden sm:inline-flex">
        <span className="dot" /> Cifrado &middot; RLS por finca
      </span>
      <span className="item hidden md:inline-flex">
        <span className="dot" /> Colombia &middot; En vivo
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Reparto entre socios — diferenciador con visual
// ---------------------------------------------------------------------------
function SociosSection() {
  const ref = useReveal<HTMLDivElement>();
  const socios = [
    { name: "Álvaro D.", initials: "AD", pct: 25, owes: 300000, paid: true },
    { name: "Marcela R.", initials: "MR", pct: 25, owes: 300000, paid: false },
    { name: "Jorge H.", initials: "JH", pct: 25, owes: 300000, paid: true },
    { name: "Camilo V.", initials: "CV", pct: 25, owes: 300000, paid: false, pagador: true },
  ];
  return (
    <section id="socios" className="relative py-24 md:py-32" style={{ background: "var(--cream)" }}>
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <div>
          <span
            className="inline-block text-[0.65rem] font-mono uppercase tracking-[0.14em] px-3 py-1.5 rounded-full mb-6"
            style={{ background: "var(--lime)", color: "var(--forest)" }}
          >
            SOLO AQUÍ
          </span>
          <h2 className="display-lg uppercase" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "var(--forest)" }}>
            Reparto real<br />
            <em style={{ color: "var(--forest-3)", fontStyle: "normal" }}>entre socios</em>
          </h2>
          <p className="mt-6 text-base leading-relaxed max-w-lg" style={{ color: "rgba(20, 38, 26, 0.72)" }}>
            El problema de las fincas familiares no es la vaca — es{" "}
            <strong style={{ color: "var(--forest)" }}>quién puso, cuánto y quién le debe a quién.</strong>{" "}
            Tres modos de reparto según el gasto:
          </p>
          <div className="mt-8 space-y-3">
            <RepartoBullet title="Por participación (%)" desc="Cada socio paga según su porcentaje." />
            <RepartoBullet title="Por cabezas" desc="Divide entre los dueños de los animales." />
            <RepartoBullet title="Partes iguales" desc="Entre los participantes que usted elija." />
          </div>
          <p className="mt-8 text-sm" style={{ color: "rgba(20, 38, 26, 0.72)" }}>
            Al final, la app le muestra{" "}
            <strong style={{ color: "var(--forest)" }}>quién debe qué a quién</strong> — sin
            calculadora, sin discusiones.
          </p>
        </div>

        <div
          className="rounded-3xl p-7 md:p-8"
          style={{
            background: "white",
            border: "2px solid rgba(20, 38, 26, 0.08)",
            boxShadow: "0 30px 60px -20px rgba(20, 38, 26, 0.18)",
          }}
        >
          <div className="flex items-center justify-between pb-5 border-b" style={{ borderColor: "rgba(20, 38, 26, 0.08)" }}>
            <div>
              <div className="text-[0.65rem] font-mono uppercase tracking-widest" style={{ color: "var(--forest-3)", opacity: 0.7 }}>
                Vacunas Q3
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: "var(--forest)" }}>
                $1.200.000
              </div>
            </div>
            <span
              className="text-[0.6rem] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full font-semibold"
              style={{ background: "var(--lime)", color: "var(--forest)" }}
            >
              Sanidad
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {socios.map((s) => (
              <DebtRow key={s.name} {...s} />
            ))}
          </div>

          <div
            className="mt-5 pt-4 border-t flex items-center justify-between text-sm"
            style={{ borderColor: "rgba(20, 38, 26, 0.08)" }}
          >
            <span className="font-mono uppercase text-[0.7rem] tracking-widest" style={{ color: "var(--forest-3)", opacity: 0.7 }}>
              Pendiente hacia Camilo
            </span>
            <span className="font-bold text-lg" style={{ color: "#B54B2A" }}>
              $300.000
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function RepartoBullet({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: "var(--lime)", boxShadow: "0 0 10px rgba(184,206,122,0.6)" }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold uppercase tracking-tight" style={{ color: "var(--forest)" }}>
          {title}
        </div>
        <div className="text-sm mt-0.5" style={{ color: "rgba(20, 38, 26, 0.65)" }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

function DebtRow({
  initials, name, pct, owes, paid, pagador,
}: { initials: string; name: string; pct: number; owes: number; paid: boolean; pagador?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-[0.7rem] font-bold shrink-0"
        style={{ background: pagador ? "var(--forest)" : "rgba(184, 206, 122, 0.25)", color: pagador ? "var(--lime-bright)" : "var(--forest)" }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold uppercase tracking-tight flex items-center gap-2" style={{ color: "var(--forest)" }}>
            {name}
            {pagador && (
              <span className="text-[0.55rem] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: "var(--forest)", color: "var(--lime-bright)" }}>
                pagó
              </span>
            )}
          </span>
          <span className="text-xs font-mono" style={{ color: "rgba(20, 38, 26, 0.55)" }}>{pct}%</span>
        </div>
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-sm font-mono font-medium" style={{ color: "var(--forest)" }}>
            ${owes.toLocaleString("es-CO")}
          </span>
          {pagador ? null : paid ? (
            <span className="text-[0.55rem] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: "rgba(184, 206, 122, 0.35)", color: "var(--forest)" }}>
              PAGADO
            </span>
          ) : (
            <span className="text-[0.55rem] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: "rgba(181, 75, 42, 0.14)", color: "#B54B2A" }}>
              DEBE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Phones Showcase — 3 devices con UI real
// ---------------------------------------------------------------------------
function PhonesShowcase() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: "var(--forest)", color: "white" }}>
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-14 md:mb-20">
          <h2 className="display-lg uppercase text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}>
            Toda la operación,<br />
            <em style={{ color: "var(--lime-bright)", fontStyle: "normal" }}>a un toque.</em>
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-base md:text-lg" style={{ color: "rgba(255,255,255,0.72)" }}>
            Pensada para el celular. Con toques, arrastres y tarjetas grandes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 items-start">
          <PhoneHato />
          <PhoneGastos />
          <PhoneActividades />
        </div>
      </div>
    </section>
  );
}

function PhoneShell({ children, active }: { children: React.ReactNode; active: "hato" | "gastos" | "tareas" }) {
  return (
    <div className="phone-frame">
      <div className="phone-screen">
        <div className="phone-body">
          <div className="phone-status shrink-0" style={{ color: "var(--ink)" }}>
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1.5 rounded-sm" style={{ background: "rgba(14,27,18,0.6)" }} />
              <span className="w-3 h-1.5 rounded-sm" style={{ background: "rgba(14,27,18,0.4)" }} />
              <span className="w-4 h-2 rounded-sm relative" style={{ border: "1px solid rgba(14,27,18,0.55)" }}>
                <span className="absolute inset-0.5 rounded-sm" style={{ width: "72%", background: "rgba(14,27,18,0.65)" }} />
              </span>
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
          <PhoneBottomNav active={active} />
        </div>
      </div>
    </div>
  );
}

/** Bottom nav mock: 5 tabs con iconos y home indicator. Llena el fondo del phone. */
function PhoneBottomNav({ active }: { active: "hato" | "gastos" | "tareas" }) {
  const tabs: { id: "hato" | "gastos" | "tareas" | "socios" | "mi"; label: string; icon: React.ReactNode }[] = [
    { id: "hato", label: "Hato", icon: <IconCow size={14} /> },
    { id: "gastos", label: "Gastos", icon: <IconMoney size={14} /> },
    { id: "tareas", label: "Tareas", icon: <IconTask size={14} /> },
    { id: "socios", label: "Socios", icon: <IconUser size={14} /> },
    { id: "mi", label: "Mi op.", icon: <IconSparkles size={14} /> },
  ];
  return (
    <div
      className="shrink-0 border-t"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(10px)",
        borderColor: "rgba(20,38,26,0.08)",
        paddingTop: "6px",
        paddingBottom: "18px",
      }}
    >
      <div className="grid grid-cols-5 gap-1 px-2">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <div key={t.id} className="flex flex-col items-center gap-0.5 py-0.5">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: isActive ? "var(--forest)" : "transparent",
                  color: isActive ? "var(--lime-bright)" : "rgba(14,27,18,0.45)",
                }}
              >
                {t.icon}
              </span>
              <span
                className="text-[0.44rem] font-semibold uppercase tracking-wider"
                style={{ color: isActive ? "var(--forest)" : "rgba(14,27,18,0.45)" }}
              >
                {t.label}
              </span>
            </div>
          );
        })}
      </div>
      <div
        className="mx-auto mt-1 rounded-full"
        style={{ width: "40%", height: "3px", background: "rgba(14,27,18,0.4)" }}
      />
    </div>
  );
}

// --- Réplica de la UI real: /hato ---
// Grid 2x3 de tiles-mod coloridos (paleta moss/sea/sand/coral/plum/sky/clay).
function PhoneHato() {
  const tiles = [
    { label: "Animales", sub: "cabezas activas", metric: "11", from: "#E4EED4", to: "#A9C177", ink: "#3E5A24", fg: "#1D2F10", Icon: IconCow },
    { label: "Potreros", sub: "lotes", metric: "4", from: "#D5EBE4", to: "#7EBFA9", ink: "#1E5A48", fg: "#0F2E23", Icon: IconPasture },
    { label: "Peso", sub: "pesajes", from: "#F0EADA", to: "#CBB98D", ink: "#5A4A22", fg: "#2E240F", Icon: IconScale },
    { label: "Sanidad", sub: "cercanos", metric: "3", from: "#FBDACF", to: "#F19277", ink: "#8A3B24", fg: "#4A1B0F", Icon: IconHealth, alert: true },
    { label: "Reprod.", sub: "preñeces", metric: "2", from: "#E9D9E6", to: "#B48AB0", ink: "#5A2C57", fg: "#2E1230", Icon: IconRepro },
    { label: "Inventario", sub: "insumos", from: "#EBE0D1", to: "#B99A7A", ink: "#5A3C20", fg: "#2E1D0C", Icon: IconBox },
  ];
  return (
    <PhoneShell active="hato">
      <div className="phone-content h-full" style={{ background: "var(--cream)" }}>
        <div className="flex items-center justify-between mb-3.5">
          <div className="text-[0.6rem] font-mono uppercase tracking-widest" style={{ color: "rgba(14,27,18,0.5)" }}>
            Las Delicias
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(20,38,26,0.08)" }}>
            <IconUser size={12} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((t) => (
            <MiniTile key={t.label} {...t} />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function MiniTile({
  label, sub, metric, from, to, ink, fg, Icon, alert,
}: {
  label: string; sub: string; metric?: string; from: string; to: string; ink: string; fg: string;
  Icon: React.ComponentType<{ size?: number }>; alert?: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center aspect-square"
      style={{
        background: `radial-gradient(120% 100% at 100% 0%, color-mix(in oklab, white 30%, ${from}) 0%, transparent 55%), linear-gradient(155deg, ${from} 0%, ${to} 100%)`,
        color: fg,
        border: `1px solid color-mix(in oklab, ${ink} 12%, transparent)`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.55) inset, 0 6px 14px -8px ${ink}44`,
        padding: "0.5rem",
      }}
    >
      {alert && (
        <span
          className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full"
          style={{ background: "#d9534f", boxShadow: "0 0 4px #d9534f, 0 0 0 2px rgba(255,255,255,0.6)" }}
        />
      )}
      {metric && (
        <span
          className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center text-[0.5rem] font-bold"
          style={{ background: "rgba(255,255,255,0.85)", color: ink }}
        >
          {metric}
        </span>
      )}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-1"
        style={{ background: ink, color: "white" }}
      >
        <Icon size={14} />
      </div>
      <div className="text-[0.55rem] font-bold leading-tight" style={{ color: fg }}>{label}</div>
      <div className="text-[0.42rem]" style={{ color: `${fg}99` }}>{sub}</div>
    </div>
  );
}

// --- Réplica de la UI real: /gastos ---
// 3 HeroStat + lista de gastos con avatares de socios pagados.
function PhoneGastos() {
  return (
    <PhoneShell active="gastos">
      <div className="phone-content h-full" style={{ background: "var(--cream)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[0.6rem] font-mono uppercase tracking-widest" style={{ color: "rgba(14,27,18,0.5)" }}>
            Gastos e ingresos
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(20,38,26,0.08)" }}>
            <IconMoney size={12} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <HeroStatMini label="Ingresos" value="$4.8M" from="#E4EED4" to="#A9C177" ink="#3E5A24" />
          <HeroStatMini label="Gastos" value="$3.2M" from="#FBDACF" to="#F19277" ink="#8A3B24" />
          <HeroStatMini label="Balance" value="+$1.6M" from="#D5EBE4" to="#7EBFA9" ink="#1E5A48" />
        </div>

        <div className="flex gap-1.5 mb-2">
          <span className="text-[0.55rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "var(--forest)", color: "var(--lime-bright)" }}>Gastos</span>
          <span className="text-[0.55rem] uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ color: "rgba(14,27,18,0.55)" }}>Ingresos</span>
        </div>

        <ExpenseRow titulo="Vacunas Q3" cat="Sanidad" fecha="12 sep" monto="$1.200.000" payer="CV" partners={["AD","MR","JH","CV"]} paidBy={["AD","JH","CV"]} />
        <ExpenseRow titulo="Sal + concentrado" cat="Alimentación" fecha="08 sep" monto="$680.000" payer="MR" partners={["AD","MR","JH","CV"]} paidBy={["AD","MR","JH","CV"]} />
        <ExpenseRow titulo="Diesel" cat="Otros" fecha="05 sep" monto="$320.000" payer="CV" partners={["AD","MR","JH","CV"]} paidBy={["MR","CV"]} />
      </div>
    </PhoneShell>
  );
}

function HeroStatMini({ label, value, from, to, ink }: { label: string; value: string; from: string; to: string; ink: string }) {
  return (
    <div
      className="rounded-lg px-1.5 py-1.5"
      style={{
        background: `linear-gradient(155deg, ${from} 0%, ${to} 100%)`,
        color: ink,
      }}
    >
      <div className="text-[0.45rem] font-mono uppercase tracking-widest" style={{ opacity: 0.7 }}>{label}</div>
      <div className="text-[0.7rem] font-bold leading-tight mt-0.5">{value}</div>
    </div>
  );
}

function ExpenseRow({
  titulo, cat, fecha, monto, payer, partners, paidBy,
}: { titulo: string; cat: string; fecha: string; monto: string; payer: string; partners: string[]; paidBy: string[] }) {
  return (
    <div className="rounded-xl px-2.5 py-2 mb-1.5" style={{ background: "white", border: "1px solid rgba(20,38,26,0.06)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[0.68rem] font-semibold truncate" style={{ color: "var(--forest)" }}>{titulo}</div>
          <div className="text-[0.5rem]" style={{ color: "rgba(14,27,18,0.55)" }}>{cat} · {fecha} · pagó {payer}</div>
        </div>
        <div className="text-[0.68rem] font-mono font-bold shrink-0" style={{ color: "var(--forest)" }}>{monto}</div>
      </div>
      <div className="mt-1 flex gap-0.5">
        {partners.map((p) => {
          const pagado = paidBy.includes(p);
          return (
            <span
              key={p}
              className="text-[0.42rem] font-mono rounded-full w-[18px] h-[14px] flex items-center justify-center font-bold"
              style={{
                background: pagado ? "rgba(184,206,122,0.4)" : "rgba(181,75,42,0.15)",
                color: pagado ? "var(--forest)" : "#8A3B24",
              }}
            >
              {p}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// --- Réplica de la UI real: /tareas (vista calendario) ---
function PhoneActividades() {
  const dias = ["L","M","M","J","V","S","D"];
  // Simular grid de mes con puntos coloreados en días con actividades.
  const cells = Array.from({ length: 35 }, (_, i) => {
    const day = i - 1; // -1..33
    const inMonth = day > 0 && day <= 30;
    const today = day === 15;
    const eventos = {
      2: ["sanidad"],
      5: ["manejo"],
      8: ["sanidad", "manejo"],
      12: ["reproduccion"],
      14: ["manejo"],
      15: ["sanidad", "reproduccion"],
      18: ["alimentacion"],
      22: ["sanidad"],
      25: ["manejo", "reproduccion"],
      28: ["sanidad"],
    }[day] as string[] | undefined;
    return { day, inMonth, today, eventos };
  });
  const dotColor: Record<string, string> = {
    sanidad: "#D97757",
    manejo: "var(--forest)",
    reproduccion: "#B48AB0",
    alimentacion: "#D19255",
  };
  return (
    <PhoneShell active="tareas">
      <div className="phone-content h-full" style={{ background: "var(--cream)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[0.6rem] font-mono uppercase tracking-widest" style={{ color: "rgba(14,27,18,0.5)" }}>
            Actividades
          </div>
          <div className="flex gap-1">
            <span className="text-[0.5rem] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "var(--forest)", color: "var(--lime-bright)" }}>Cal.</span>
            <span className="text-[0.5rem] uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ color: "rgba(14,27,18,0.55)" }}>Lista</span>
          </div>
        </div>

        <div className="text-center mb-2">
          <div className="text-[0.85rem] font-bold uppercase" style={{ color: "var(--forest)" }}>Septiembre 2026</div>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1.5">
          {dias.map((d, i) => (
            <div key={i} className="text-[0.5rem] text-center font-mono uppercase" style={{ color: "rgba(14,27,18,0.45)" }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((c, i) => (
            <div
              key={i}
              className="aspect-square rounded flex flex-col items-center justify-center relative"
              style={{
                background: c.today ? "var(--forest)" : c.inMonth ? "white" : "transparent",
                border: c.inMonth && !c.today ? "1px solid rgba(20,38,26,0.06)" : "none",
              }}
            >
              {c.inMonth && (
                <>
                  <span className="text-[0.5rem] font-semibold" style={{ color: c.today ? "var(--lime-bright)" : "var(--forest)" }}>
                    {c.day}
                  </span>
                  {c.eventos && (
                    <div className="flex gap-0.5 mt-0.5">
                      {c.eventos.slice(0, 3).map((e, idx) => (
                        <span key={idx} className="w-1 h-1 rounded-full" style={{ background: c.today ? "var(--lime-bright)" : dotColor[e] }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl px-2.5 py-2" style={{ background: "white", border: "1px solid rgba(20,38,26,0.06)" }}>
          <div className="text-[0.5rem] font-mono uppercase tracking-widest mb-1" style={{ color: "rgba(14,27,18,0.5)" }}>Hoy · 15 sep</div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#D97757" }} />
            <div className="text-[0.6rem] font-semibold" style={{ color: "var(--forest)" }}>Vacuna aftosa · V12</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#B48AB0" }} />
            <div className="text-[0.6rem] font-semibold" style={{ color: "var(--forest)" }}>Diagnóstico preñez · N4</div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ---------------------------------------------------------------------------
//  Asistente IA — sección completa con chat mockup
// ---------------------------------------------------------------------------
function AIAssistantSection() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="ia" className="relative py-24 md:py-32" style={{ background: "var(--cream)" }}>
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <div>
          <span
            className="inline-block text-[0.65rem] font-mono uppercase tracking-[0.14em] px-3 py-1.5 rounded-full mb-6 font-semibold"
            style={{ background: "rgba(184, 206, 122, 0.25)", color: "var(--forest)", border: "1px solid var(--lime)" }}
          >
            PRÓXIMAMENTE · Q1 2027
          </span>
          <h2 className="display-lg uppercase" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "var(--forest)" }}>
            Asistente<br />
            <em style={{ color: "var(--forest-3)", fontStyle: "normal" }}>IA RumeApp.</em>
          </h2>
          <p className="mt-6 text-base leading-relaxed max-w-lg" style={{ color: "rgba(20, 38, 26, 0.72)" }}>
            Un cerebro que analiza los datos de su finca sin que abra un
            Excel. Pregúntele en español y le responde con datos reales.
          </p>
          <ul className="mt-8 space-y-3">
            <AIBullet>&ldquo;¿Cuáles vacas están próximas a parir este mes?&rdquo;</AIBullet>
            <AIBullet>&ldquo;¿En qué me gasté más este trimestre?&rdquo;</AIBullet>
            <AIBullet>&ldquo;¿Cuál es la vaca más rentable del hato?&rdquo;</AIBullet>
            <AIBullet>&ldquo;¿Qué animales están perdiendo peso?&rdquo;</AIBullet>
          </ul>
          <div className="mt-8 text-sm" style={{ color: "rgba(20, 38, 26, 0.65)" }}>
            Incluido en los planes <strong style={{ color: "var(--forest)" }}>Ganadero</strong> y <strong style={{ color: "var(--forest)" }}>Hacienda</strong>.
          </div>
        </div>

        <div
          className="rounded-3xl p-6 md:p-7"
          style={{
            background: "white",
            border: "2px solid rgba(20, 38, 26, 0.08)",
            boxShadow: "0 30px 60px -20px rgba(20, 38, 26, 0.18)",
          }}
        >
          <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "rgba(20, 38, 26, 0.08)" }}>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "var(--forest)", color: "var(--lime-bright)" }}
            >
              <IconSparkles size={18} />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-tight" style={{ color: "var(--forest)" }}>RumeApp IA</div>
              <div className="text-[0.65rem] flex items-center gap-1.5" style={{ color: "rgba(20, 38, 26, 0.55)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--lime)" }} /> Analizando su hato
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-5">
            <div className="chat-bubble-user">
              Hola, ¿cuáles vacas debo revisar esta semana?
            </div>
            <div className="chat-bubble-ai">
              Tres cosas urgentes:
              <br />• <strong>V12</strong> lleva 3 meses sin ganar peso.
              <br />• <strong>N4</strong> tiene chequeo de preñez el jueves.
              <br />• <strong>V07</strong> debe recibir refuerzo de aftosa mañana.
            </div>
            <div className="chat-bubble-user">¿Cuánto costó la sanidad en junio?</div>
            <div className="chat-bubble-ai">
              <strong>$1.840.000</strong> — 32% más que en mayo. El aumento
              viene de dos compras de antiparasitarios. ¿Le hago un desglose por animal?
            </div>
            <div className="chat-bubble-ai typing" style={{ padding: "0.55rem 0.9rem", display: "inline-block" }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AIBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--forest-3)" }} />
      <span className="text-sm italic" style={{ color: "rgba(20, 38, 26, 0.75)" }}>{children}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
//  Cédula digital / QR por animal
// ---------------------------------------------------------------------------
function AnimalCedulaSection() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative py-24 md:py-32" style={{ background: "var(--forest)", color: "white" }}>
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        <div
          className="rounded-3xl p-6 md:p-7"
          style={{ background: "white", color: "var(--forest)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.35)" }}
        >
          <div className="grid grid-cols-[1fr_140px] gap-4 items-start">
            <div>
              <div className="text-[0.6rem] font-mono uppercase tracking-widest" style={{ color: "var(--forest-3)" }}>
                CÉDULA DIGITAL · V12
              </div>
              <div className="mt-1 text-2xl font-bold uppercase tracking-tight">Vaca &ldquo;Estrella&rdquo;</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(20, 38, 26, 0.55)" }}>Girolando · 4 años · Las Delicias</div>

              <dl className="mt-5 space-y-2 text-sm">
                <FieldPair label="Dueño" value="Camilo Vega" />
                <FieldPair label="Registrada" value="2024-03-14" />
                <FieldPair label="Último peso" value="420 kg · hace 3 días" />
                <FieldPair label="Última vacuna" value="Aftosa · 2026-07-20" />
                <FieldPair label="Preñada" value="Sí · FPP 2026-11-08" />
              </dl>
            </div>
            <QRCode />
          </div>
          <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: "rgba(20, 38, 26, 0.08)" }}>
            <div className="text-[0.65rem] font-mono" style={{ color: "rgba(20, 38, 26, 0.55)" }}>
              rumea.app/animal/<span style={{ color: "var(--forest)" }}>v12-x9k2</span>
            </div>
            <span
              className="text-[0.55rem] font-mono uppercase tracking-widest px-2 py-1 rounded-full font-semibold"
              style={{ background: "var(--lime)", color: "var(--forest)" }}
            >
              ✓ verificado
            </span>
          </div>
        </div>

        <div>
          <span
            className="inline-block text-[0.65rem] font-mono uppercase tracking-[0.14em] px-3 py-1.5 rounded-full mb-6 font-semibold"
            style={{ background: "rgba(184, 206, 122, 0.16)", color: "var(--lime-bright)", border: "1px solid rgba(184, 206, 122, 0.4)" }}
          >
            PRÓXIMAMENTE
          </span>
          <h2 className="display-lg uppercase text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}>
            Cédula digital<br />
            <em style={{ color: "var(--lime-bright)", fontStyle: "normal" }}>por animal.</em>
          </h2>
          <p className="mt-6 text-base leading-relaxed max-w-lg" style={{ color: "rgba(255, 255, 255, 0.75)" }}>
            Cada animal con su QR único. Muéstrelo al veterinario, al
            comprador o al inspector — sin papeles, sin dudas.
          </p>
          <ul className="mt-8 space-y-3">
            <CedulaBullet><strong>QR único</strong> por cabeza — imposible falsificar</CedulaBullet>
            <CedulaBullet><strong>Historial verificable</strong>: sanidad, peso, reproducción</CedulaBullet>
            <CedulaBullet><strong>Ideal para venta</strong> — pásele el QR al comprador</CedulaBullet>
            <CedulaBullet><strong>Trazabilidad real</strong> — no en cuaderno</CedulaBullet>
          </ul>
        </div>
      </div>
    </section>
  );
}

function CedulaBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--lime)", color: "var(--forest)" }}
      >
        <IconCheck size={11} />
      </span>
      <span className="text-sm" style={{ color: "rgba(255, 255, 255, 0.85)" }}>{children}</span>
    </li>
  );
}

function FieldPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[0.6rem] font-mono uppercase tracking-widest" style={{ color: "rgba(20, 38, 26, 0.5)" }}>{label}</dt>
      <dd className="text-xs font-medium text-right truncate" style={{ color: "var(--forest)" }}>{value}</dd>
    </div>
  );
}

function QRCode() {
  const pattern =
    "111111101010111111100" +
    "100000101101100000101" +
    "101110100110101110101" +
    "101110101010101110101" +
    "101110101101101110101" +
    "100000101010100000101" +
    "111111101010111111101" +
    "000000001101000000000" +
    "110101110010110110110" +
    "010110011101011010010" +
    "101011100101110110101" +
    "011001010110101011010" +
    "110110101011100101110" +
    "000000001011001010100" +
    "111111100110101101100" +
    "100000101011010101010" +
    "101110101100110110110" +
    "101110101010101010101" +
    "101110100110101101001" +
    "100000101001010101110" +
    "111111100010110101010";
  const cells = pattern.split("");
  return (
    <div className="qr" style={{ maxWidth: 140 }}>
      {cells.map((c, i) => (
        <div key={i} className={c === "1" ? "on" : ""} />
      ))}
    </div>
  );
}
