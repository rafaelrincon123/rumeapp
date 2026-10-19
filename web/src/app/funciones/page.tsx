import type { Metadata } from "next";

// El contenido lo pinta AuthGate (LandingPage seccion="funciones"): esta ruta
// solo existe para la URL pública y su metadata.
export const metadata: Metadata = {
  title: "Funciones · RumeApp",
  description: "Todo lo que hace RumeApp para vacas, búfalos, cabras, ovejas y caballos: plan sanitario automático, reproducción, potreros, inventario y gastos entre socios.",
  alternates: { canonical: "/funciones" },
};

export default function Page() {
  return null;
}
