import type { Metadata } from "next";

// El contenido lo pinta AuthGate (LandingPage seccion="precios"): esta ruta
// solo existe para la URL pública y su metadata.
export const metadata: Metadata = {
  title: "Precios · RumeApp",
  description: "Empiece gratis con el plan Ranchero (hasta 5 animales). Planes Ganadero y Hacienda en pesos colombianos.",
  alternates: { canonical: "/precios" },
};

export default function Page() {
  return null;
}
