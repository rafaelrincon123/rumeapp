import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones · RumeApp",
  description: "Términos y condiciones de uso de RumeApp, la plataforma de gestión ganadera para fincas de Colombia.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "var(--bg)" }}>
      <header className="relative z-10" style={{ background: "var(--forest)" }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
          <Link
            href="/"
            className="btn btn-ghost btn-sm"
            style={{ color: "var(--sand)", borderColor: "rgba(239,232,216,0.25)", background: "rgba(239,232,216,0.08)" }}
          >
            ← Inicio
          </Link>
          <p className="eyebrow mt-6" style={{ color: "var(--lime)" }}>
            RumeApp &middot; Legal
          </p>
          <h1 className="display-xl mt-2" style={{ color: "var(--sand)" }}>
            Términos y condiciones
          </h1>
          <p className="mt-2 text-sm" style={{ color: "rgba(239,232,216,0.65)" }}>
            Última actualización: 23 de septiembre de 2026
          </p>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="card" style={{ lineHeight: 1.75 }}>
          <div className="flex flex-col gap-8 text-[0.92rem]" style={{ color: "var(--fg)" }}>
            <section>
              <p style={{ color: "var(--muted)" }}>
                Estos términos regulan el uso de <strong>RumeApp</strong>, una plataforma de gestión ganadera
                operada desde Colombia. Al crear una cuenta o usar la aplicación, aceptas estos términos.
                Si no estás de acuerdo, no uses RumeApp.
              </p>
            </section>

            <Section n="1" title="Qué es RumeApp">
              <p>
                RumeApp es un software como servicio (SaaS) para llevar el control de una o varias fincas
                ganaderas: hato, potreros, sanidad, reproducción, peso, producción, gastos e ingresos con
                reparto entre socios, inventario, tareas y equipo de trabajo. RumeApp no es una entidad
                financiera, no brinda asesoría veterinaria, zootécnica, contable ni legal, y los datos que
                registres son responsabilidad tuya y de las personas que autorices en tu finca.
              </p>
            </Section>

            <Section n="2" title="Cuentas, roles y equipo">
              <p>
                Para usar RumeApp necesitas crear una cuenta con tu correo y contraseña. La persona que crea
                una finca es su <strong>propietario (owner)</strong> y puede invitar y crear cuentas para
                empleados o socios directamente desde la sección Equipo, asignándoles un rol:
                administrador, operario o solo lectura. Cada plan tiene un límite de personas y de fincas
                (ver sección 3). Eres responsable de mantener segura tu contraseña y de todo lo que ocurra
                bajo tu cuenta y las cuentas que crees para tu equipo.
              </p>
            </Section>

            <Section n="3" title="Planes, precios y pagos">
              <p>
                RumeApp ofrece tres planes: <strong>Ranchero</strong> (gratis para siempre, con límites de
                animales y personas), <strong>Ganadero</strong> y <strong>Hacienda</strong> (planes pagos).
                Los planes pagos incluyen como obsequio la guía práctica «Ganadería rentable» (PDF), que se
                envía al correo registrado una vez confirmado el primer pago. Los precios se muestran en pesos
                colombianos y se pueden pagar mes a mes o por un año completo con descuento.
              </p>
              <p className="mt-3">
                Los planes pagos se pueden pagar en línea a través de la pasarela Bold (tarjeta, PSE, Nequi
                o Botón Bancolombia); el plan se activa en cuanto Bold aprueba el pago y dura el período
                pagado (un mes o un año). También se puede transferir el valor a la cuenta indicada en la
                app y subir el comprobante; en ese caso el equipo de RumeApp activa el plan una vez
                confirmado el pago, lo que puede tardar hasta 24-48 horas hábiles. Mientras tanto la finca
                sigue funcionando con el plan Ranchero.
              </p>
              <p className="mt-3">
                No se realizan cobros automáticos ni recurrentes sin tu autorización explícita. RumeApp no
                almacena datos de tarjetas de crédito o débito en ningún momento.
              </p>
            </Section>

            <Section n="4" title="Tus datos siguen siendo tuyos">
              <p>
                Toda la información que registras sobre tu finca (animales, gastos, sanidad, producción,
                fotos, comprobantes, etc.) te pertenece a ti. RumeApp la aloja y la procesa únicamente para
                prestarte el servicio, y no la vende ni la usa con fines distintos a los descritos en
                nuestra{" "}
                <Link href="/privacidad" className="underline" style={{ color: "var(--fg)" }}>
                  Política de Privacidad
                </Link>
                . Si cancelas tu cuenta, puedes solicitar la exportación o eliminación de tus datos según lo
                indicado en esa misma política.
              </p>
            </Section>

            <Section n="5" title="Uso aceptable">
              <p>Al usar RumeApp te comprometes a:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1.5">
                <li>Registrar información veraz sobre tu operación ganadera.</li>
                <li>No usar la plataforma para actividades ilegales o fraudulentas.</li>
                <li>No intentar vulnerar la seguridad de la plataforma ni acceder a datos de otras fincas.</li>
                <li>
                  No compartir tu contraseña ni las credenciales que crees para tu equipo con personas ajenas
                  a tu finca.
                </li>
              </ul>
              <p className="mt-3">
                Podemos suspender o cancelar cuentas que incumplan estas reglas, especialmente si comprometen
                la seguridad o los datos de otros usuarios.
              </p>
            </Section>

            <Section n="6" title="Disponibilidad del servicio">
              <p>
                Nos esforzamos por mantener RumeApp disponible en todo momento, pero no garantizamos un
                servicio ininterrumpido o libre de errores. Puede haber mantenimientos programados,
                interrupciones de nuestros proveedores de infraestructura (hosting, base de datos, correo)
                o fallas fuera de nuestro control. RumeApp está pensada para funcionar bien con señal
                intermitente en el campo, pero requiere conexión a internet para sincronizar los datos.
              </p>
            </Section>

            <Section n="7" title="Cancelación y terminación">
              <p>
                Puedes dejar de usar RumeApp cuando quieras. Si quieres eliminar tu cuenta y tus datos,
                contáctanos por los medios indicados en la sección 10. Podemos suspender o cerrar cuentas
                que incumplan estos términos, que estén inactivas por un periodo prolongado en el plan
                gratuito, o por falta de pago sostenida en un plan pago, previo aviso razonable.
              </p>
            </Section>

            <Section n="8" title="Propiedad intelectual">
              <p>
                El software, el diseño, la marca RumeApp y los contenidos de la plataforma son propiedad de
                sus creadores. Esto no incluye los datos que tú registras sobre tu finca, que siguen siendo
                tuyos conforme a la sección 4.
              </p>
            </Section>

            <Section n="9" title="Limitación de responsabilidad">
              <p>
                RumeApp se ofrece &ldquo;tal cual&rdquo;. En la medida permitida por la ley, no somos
                responsables por pérdidas económicas, decisiones de manejo del hato, o daños indirectos que
                resulten del uso o la imposibilidad de uso de la plataforma. Las decisiones sobre tu
                operación ganadera (sanidad, reproducción, ventas, reparto de gastos) siguen siendo tuyas;
                RumeApp es una herramienta de registro y organización, no un sustituto del criterio
                profesional (veterinario, contable o legal).
              </p>
            </Section>

            <Section n="10" title="Cambios a estos términos">
              <p>
                Podemos actualizar estos términos para reflejar cambios en el servicio o en la normativa
                aplicable. Si el cambio es sustancial, te avisaremos por correo o dentro de la app. Seguir
                usando RumeApp después de un cambio implica que lo aceptas.
              </p>
            </Section>

            <Section n="11" title="Ley aplicable">
              <p>
                Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se
                resolverá ante los jueces competentes de Colombia, salvo que la ley disponga otra cosa.
              </p>
            </Section>

            <Section n="12" title="Contacto">
              <p>
                Para preguntas sobre estos términos, escríbenos a{" "}
                <a href="mailto:soporte@rumea.app" className="underline" style={{ color: "var(--fg)" }}>
                  soporte@rumea.app
                </a>
                .
              </p>
            </Section>
          </div>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "var(--subtle)" }}>
          RumeApp &middot; Gestión ganadera para fincas de Colombia
        </p>
      </main>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="display-md flex items-baseline gap-2">
        <span className="eyebrow" style={{ color: "var(--primary)" }}>
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-2.5" style={{ color: "var(--muted)" }}>
        {children}
      </div>
    </section>
  );
}
