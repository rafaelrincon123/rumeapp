import type { Metadata } from "next";

// El contenido lo pinta AuthGate (LandingPage seccion="precios"): esta ruta
// solo existe para la URL pública y su metadata.
export const metadata: Metadata = {
  title: "Precios · RumeApp",
  description: "Empiece gratis con el plan Gratuito (hasta 5 animales). Planes Pro y Full en pesos colombianos.",
  alternates: { canonical: "/precios" },
};

export default function Page() {
  return null;
}
