import type { Metadata } from "next";

// El contenido lo pinta AuthGate (LandingPage seccion="funciones"): esta ruta
// solo existe para la URL pública y su metadata.
export const metadata: Metadata = {
  title: "Funciones · RumeApp",
  description: "Todo lo que hace RumeApp: hato, sanidad, reproducción, potreros, inventario y gastos entre socios, desde el celular.",
  alternates: { canonical: "/funciones" },
};

export default function Page() {
  return null;
}
