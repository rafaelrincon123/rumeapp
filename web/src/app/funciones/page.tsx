import type { Metadata } from "next";

// El contenido lo pinta AuthGate (LandingPage seccion="funciones"): esta ruta
// solo existe para la URL pública y su metadata.
export const metadata: Metadata = {
  title: "Funciones · RumeApp",
  description: "Todo lo que hace RumeApp para ganado, búfalos, cabras, ovejas, caballos, cerdos y aves: plan sanitario automático, lotes de gallinas y pollos, reproducción, inventario y gastos entre socios.",
  alternates: { canonical: "/funciones" },
};

export default function Page() {
  return null;
}
