import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Términos y Privacidad · TOGO" },
      { name: "description", content: "Términos y condiciones de uso y política de privacidad de TOGO." },
    ],
  }),
  component: LegalPage,
});

const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: "#111827", marginTop: 32, marginBottom: 10 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 20, marginBottom: 6 };
const p: React.CSSProperties = { fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 10 };
const li: React.CSSProperties = { fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 6 };

function LegalPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <Link to="/" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none" }}>← Volver a TOGO</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginTop: 16 }}>Términos y Privacidad</h1>
        <p style={{ ...p, color: "#94A3B8", marginTop: 6 }}>Última actualización: noviembre de 2026</p>

        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 14, marginTop: 20 }}>
          <p style={{ fontSize: 13, color: "#92400E", lineHeight: 1.6, margin: 0 }}>
            Este texto cubre los puntos esenciales del servicio de buena fe. Antes de operar con pagos reales a gran escala,
            te recomendamos que un abogado lo revise y lo ajuste a tu situación específica (razón social, CUIT, domicilio legal).
          </p>
        </div>

        <h2 id="terminos" style={h2}>Términos y Condiciones de uso</h2>

        <h3 style={h3}>1. Aceptación</h3>
        <p style={p}>Al crear una cuenta o usar TOGO (la "Plataforma"), aceptás estos Términos y la Política de Privacidad descripta más abajo. Si no estás de acuerdo, no uses la Plataforma.</p>

        <h3 style={h3}>2. Qué es TOGO</h3>
        <p style={p}>TOGO es una plataforma de coaching deportivo que conecta coaches, atletas e instituciones (gimnasios/clubes) para planificar entrenamientos, hacer seguimiento de progreso, y —opcionalmente— comprar y vender programas de entrenamiento a través de un marketplace.</p>

        <h3 style={h3}>3. Cuentas</h3>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}>Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra en tu cuenta.</li>
          <li style={li}>Los datos que cargues (nombre, email, datos de entrenamiento) tienen que ser reales y propios, o de un atleta que esté bajo tu supervisión directa como coach.</li>
          <li style={li}>Si sos menor de edad, necesitás el consentimiento de un padre, madre o tutor para usar la Plataforma; el coach o la institución a cargo son responsables de gestionar ese consentimiento.</li>
        </ul>

        <h3 style={h3}>4. Planes, pagos y comisiones</h3>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}>Los pagos de suscripciones (coach/institución) y del marketplace se procesan a través de Stripe y/o Mercado Pago. TOGO no almacena números de tarjeta.</li>
          <li style={li}>La venta de programas en el marketplace tiene una comisión de plataforma sobre cada transacción, informada en el momento de la publicación del programa.</li>
          <li style={li}>Las suscripciones se renuevan automáticamente salvo que las canceles antes del próximo período de facturación.</li>
          <li style={li}>No hay reembolsos automáticos por períodos ya iniciados, salvo que la ley aplicable indique lo contrario.</li>
        </ul>

        <h3 style={h3}>5. Contenido</h3>
        <p style={p}>Los programas, sesiones, videos y textos que un coach carga en la Plataforma son de su autoría o cuentan con los derechos necesarios para publicarlos. Al publicar un programa en el marketplace, el coach le da a TOGO una licencia para mostrarlo y procesarlo dentro de la Plataforma, sin ceder la titularidad del contenido.</p>

        <h3 style={h3}>6. Toguito (asistente con inteligencia artificial)</h3>
        <p style={p}>Toguito es una herramienta de asistencia para planificar sesiones más rápido. Las sugerencias que genera no reemplazan el criterio profesional del coach, que sigue siendo el único responsable de revisar y validar cada sesión antes de que su atleta la reciba.</p>

        <h3 style={h3}>7. Integraciones de terceros</h3>
        <p style={p}>La Plataforma permite conectar servicios externos (Strava, Google Calendar, Mercado Pago, WhatsApp Business, entre otros). El uso de esos servicios está sujeto a sus propios términos y políticas; TOGO no controla ni es responsable de su funcionamiento.</p>

        <h3 style={h3}>8. Uso aceptable</h3>
        <p style={p}>No está permitido usar la Plataforma para actividades ilegales, para suplantar identidad, para subir contenido dañino u ofensivo, ni para intentar vulnerar su seguridad.</p>

        <h3 style={h3}>9. Cancelación</h3>
        <p style={p}>Podés dar de baja tu cuenta en cualquier momento escribiendo a soporte. TOGO puede suspender cuentas que incumplan estos Términos.</p>

        <h3 style={h3}>10. Responsabilidad</h3>
        <p style={p}>El entrenamiento físico conlleva riesgos. Cada coach es responsable del contenido y la seguridad de los programas que arma para sus atletas. TOGO provee la herramienta de planificación y seguimiento, pero no supervisa ni valida médicamente los programas cargados por los coaches. Usá la Plataforma bajo tu propio criterio y consultá a un profesional de la salud ante cualquier duda médica.</p>

        <h3 style={h3}>11. Cambios a estos Términos</h3>
        <p style={p}>Podemos actualizar estos Términos. Si el cambio es significativo, te vamos a avisar dentro de la Plataforma antes de que entre en vigencia.</p>

        <h3 style={h3}>12. Ley aplicable</h3>
        <p style={p}>Estos Términos se rigen por las leyes de la República Argentina.</p>

        <h2 id="privacidad" style={h2}>Política de Privacidad</h2>

        <h3 style={h3}>1. Qué datos recolectamos</h3>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}><strong>De cuenta:</strong> nombre, email, rol (coach/atleta/institución).</li>
          <li style={li}><strong>De perfil y entrenamiento:</strong> peso, altura, fecha de nacimiento, sesiones, progreso, check-ins de bienestar (energía, sueño, estado del cuerpo) — los carga el propio usuario o su coach.</li>
          <li style={li}><strong>De pago:</strong> procesado directamente por Stripe/Mercado Pago; TOGO guarda solo el estado de la transacción, nunca el número de tarjeta completo.</li>
          <li style={li}><strong>De integraciones conectadas:</strong> si conectás Strava, traemos tus actividades para reflejarlas en tus sesiones de campo. Podés desconectarlo cuando quieras desde tu perfil.</li>
        </ul>

        <h3 style={h3}>2. Para qué los usamos</h3>
        <p style={p}>Para darte el servicio (mostrarte tus sesiones, calcular tu progreso, procesar pagos), para comunicarnos con vos (notificaciones, soporte), y para mejorar la Plataforma.</p>

        <h3 style={h3}>3. Con quién los compartimos</h3>
        <p style={p}>No vendemos tus datos. Los compartimos únicamente con los proveedores que hacen funcionar la Plataforma: Supabase (base de datos), Stripe y Mercado Pago (pagos), Anthropic (el modelo de IA detrás de Toguito), Strava, Google y Meta/WhatsApp (solo si vos activás esas integraciones).</p>

        <h3 style={h3}>4. Seguridad</h3>
        <p style={p}>Usamos conexiones cifradas y control de acceso por fila en la base de datos, de forma que cada usuario solo puede ver los datos que le corresponden.</p>

        <h3 style={h3}>5. Tus derechos</h3>
        <p style={p}>Conforme a la Ley 25.326 de Protección de Datos Personales de Argentina, podés pedirnos acceder, corregir o eliminar tus datos escribiéndonos a soporte. El titular de los datos personales tiene la facultad de ejercer el derecho de acceso de forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo.</p>

        <h3 style={h3}>6. Retención</h3>
        <p style={p}>Guardamos tus datos mientras tu cuenta esté activa. Si la eliminás, borramos o anonimizamos tus datos salvo que debamos conservar algo por obligación legal (ej: registros de facturación).</p>

        <h3 style={h3}>7. Menores de edad</h3>
        <p style={p}>Los atletas menores de edad usan la Plataforma bajo la supervisión de su coach o institución, que es responsable de contar con el consentimiento correspondiente de madres, padres o tutores.</p>

        <h3 style={h3}>8. Cambios a esta política</h3>
        <p style={p}>Si hacemos cambios importantes, te vamos a avisar dentro de la Plataforma.</p>

        <h3 style={h3}>9. Contacto</h3>
        <p style={p}>Para cualquier consulta sobre estos Términos o tus datos personales, escribinos a <a href="mailto:soporte@togo.app" style={{ color: "#2563EB" }}>soporte@togo.app</a>.</p>
      </div>
    </div>
  );
}
