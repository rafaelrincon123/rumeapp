"use client";

import { useEffect } from "react";
import { capturarCodigoDesdeUrl } from "@/lib/referido";

/**
 * Componente invisible: al montar lee ?r=... del URL y lo guarda en
 * localStorage. Se usa desde el layout raíz, así cualquier página que se
 * abra con ?r=... queda con el código vigente hasta que el usuario cree su
 * primera finca (o se venza en 60 días).
 */
export default function CapturarReferido() {
  useEffect(() => {
    capturarCodigoDesdeUrl();
  }, []);
  return null;
}
