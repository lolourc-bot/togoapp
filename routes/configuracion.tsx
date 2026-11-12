import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Pencil,
} from "lucide-react";
import { Sidebar } from "@/components/togo/Sidebar";
import { supabase } from "@/lib/supabase";
import { getCoachId } from "@/lib/programs";
import {
  fetchCoachAccount, updateCoachAccountPrefs, changePassword,
  fetchCoachNotificationPrefs, setCoachNotificationPrefs,
} from "@/lib/coach-settings";
import { PRICING_TIERS, resolveTier, type TierKey } from "@/lib/billing-pricing";
import { startStripeCheckout, createStripePortalSession, changeStripeTier } from "@/lib/billing-stripe";
import { startMpSubscription, cancelMpSubscription, changeMpTier } from "@/lib/billing-mp";
import {
  fetchMyPaymentAccountStatus, startStripeConnectOnboarding, refreshStripeAccountStatus,
  startMercadoPagoMarketplaceOAuth, createStripeExpressDashboardLink,
  fetchMyProgramPurchases, type PaymentAccountStatus, type CoachProgramPurchase,
} from "@/lib/marketplace-payments";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración del coach — TOGO" },
      {
        name: "description",
        content:
          "Gestioná tu perfil público, cuenta, cobros, notificaciones y suscripción de coach en TOGO.",
      },
      { property: "og:title", content: "Configuración del coach — TOGO" },
      {
        property: "og:description",
        content: "Perfil, cuenta, pagos, notificaciones y plan en un solo lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfiguracionPage,
});

const TABS = ["Mi perfil", "Cuenta", "Pagos", "Notificaciones", "Suscripción"] as const;
type Tab = (typeof TABS)[number];

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#94A3B8",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 12,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #E2E8F0",
  background: "#FFFFFF",
  padding: "0 14px",
  fontSize: 13,
  color: "#111827",
  outline: "none",
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 6,
  display: "block",
};

const PRIMARY_BUTTON: React.CSSProperties = {
  background: "#111827",
  color: "#FFFFFF",
  borderRadius: 10,
  height: 40,
  padding: "0 24px",
  fontSize: 13,
  fontWeight: 600,
};

const SMALL_BUTTON: React.CSSProperties = {
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: "6px 14px",
  fontSize: 12,
  color: "#374151",
  background: "#FFFFFF",
};

function Divider() {
  return <div style={{ height: 1, background: "#E2E8F0", margin: "4px 0" }} />;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        background: on ? "#111827" : "#E2E8F0",
        display: "flex",
        alignItems: "center",
        padding: 2,
        transition: "background 0.2s",
      }}
      aria-pressed={on}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "#FFFFFF",
          transform: on ? "translateX(16px)" : "translateX(0)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

function ConfiguracionPage() {
  const search = useSearch({ strict: false }) as { tab?: string };
  const initialTab = (TABS as readonly string[]).includes(search.tab ?? "") ? (search.tab as Tab) : "Mi perfil";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [coachId, setCoachId] = useState<string | null>(null);
  useEffect(() => { getCoachId().then(setCoachId); }, []);

  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAFC" }}>
      <Sidebar active="Configuración" />
      <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
            Configuración
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 16 }}>
            Gestioná tu cuenta, perfil y preferencias.
          </p>

          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #E2E8F0",
              marginBottom: 32,
            }}
          >
            {TABS.map((t) => {
              const active = t === tab;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    padding: "10px 20px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: active ? "#111827" : "#94A3B8",
                    borderBottom: `2px solid ${active ? "#111827" : "transparent"}`,
                    marginBottom: -1,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {tab === "Mi perfil" ? <PerfilTab coachId={coachId} /> : null}
          {tab === "Cuenta" ? <CuentaTab coachId={coachId} /> : null}
          {tab === "Pagos" ? <PagosTab coachId={coachId} /> : null}
          {tab === "Notificaciones" ? <NotificacionesTab coachId={coachId} /> : null}
          {tab === "Suscripción" ? <SuscripcionTab coachId={coachId} /> : null}
        </div>
      </main>
    </div>
  );
}

/* ---------------- TAB 1 — MI PERFIL ---------------- */

function PerfilTab({ coachId }: { coachId: string | null }) {
  return (
    <div style={{ maxWidth: 560 }}>
      <p style={LABEL_STYLE}>Perfil público (marketplace)</p>
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          padding: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Bio, especialidad, modalidad y programas</p>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
            Tu nombre, bio, especialidad, días disponibles y los programas que publicás en el marketplace se editan desde tu perfil público — así solo hay un lugar con esa información.
          </p>
        </div>
        {coachId ? (
          <Link
            to="/perfil-coach/$coachId"
            params={{ coachId }}
            style={{ ...PRIMARY_BUTTON, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" }}
          >
            <Pencil size={14} /> Editar perfil público
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- TAB 2 — CUENTA ---------------- */

function CuentaTab({ coachId }: { coachId: string | null }) {
  const [changing, setChanging] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [nueva, setNueva] = useState("");
  const [confirmNueva, setConfirmNueva] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [moneda, setMoneda] = useState("ARS $");
  const [zona, setZona] = useState("América/Buenos Aires (UTC-3)");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!coachId) return;
    fetchCoachAccount(coachId).then((acc) => {
      if (!acc) return;
      setEmail(acc.email);
      setMoneda(acc.currency === "USD" ? "USD $" : "ARS $");
      setZona(acc.timezone === "America/Argentina/Buenos_Aires" ? "América/Buenos Aires (UTC-3)" : acc.timezone);
    });
  }, [coachId]);

  const strength = Math.min(4, Math.floor(nueva.length / 3));

  return (
    <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={LABEL_STYLE}>Información de acceso</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={FIELD_LABEL}>Email</label>
            <div style={{ position: "relative" }}>
              <input
                readOnly
                value={email}
                style={{ ...INPUT_STYLE, background: "#F8FAFC", color: "#94A3B8" }}
              />
              <Lock
                size={14}
                color="#CBD5E1"
                style={{ position: "absolute", right: 14, top: 14 }}
              />
            </div>
            <p style={{ fontSize: 11, color: "#CBD5E1", marginTop: 6 }}>
              Contactá a soporte para cambiar tu email.
            </p>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "#FFFFFF",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Contraseña</p>
                <p style={{ fontSize: 11, color: "#94A3B8" }}>Última actualización: hace 3 meses</p>
              </div>
              <button type="button" style={SMALL_BUTTON} onClick={() => setChanging((v) => !v)}>
                {changing ? "Cerrar" : "Cambiar"}
              </button>
            </div>

            <div
              style={{
                maxHeight: changing ? 320 : 0,
                overflow: "hidden",
                transition: "max-height 0.25s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: "16px 2px 0",
                }}
              >
                <div>
                  <label style={FIELD_LABEL}>Contraseña actual</label>
                  <div style={{ position: "relative" }}>
                    <input type={showCurrent ? "text" : "password"} style={INPUT_STYLE} />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      style={{ position: "absolute", right: 12, top: 13 }}
                    >
                      {showCurrent ? (
                        <EyeOff size={15} color="#CBD5E1" />
                      ) : (
                        <Eye size={15} color="#CBD5E1" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={FIELD_LABEL}>Nueva contraseña</label>
                  <input
                    type="password"
                    style={INPUT_STYLE}
                    value={nueva}
                    onChange={(e) => setNueva(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: i < strength ? "#111827" : "#E2E8F0",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={FIELD_LABEL}>Confirmar nueva contraseña</label>
                  <input type="password" style={INPUT_STYLE} value={confirmNueva} onChange={(e) => setConfirmNueva(e.target.value)} />
                  {confirmNueva && confirmNueva !== nueva ? (
                    <p style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>Las contraseñas no coinciden.</p>
                  ) : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    disabled={savingPassword || !nueva || nueva !== confirmNueva}
                    style={{ ...PRIMARY_BUTTON, opacity: !nueva || nueva !== confirmNueva ? 0.5 : 1 }}
                    onClick={async () => {
                      setSavingPassword(true);
                      try {
                        await changePassword(nueva);
                        toast.success("Contraseña actualizada ✓");
                        setChanging(false);
                        setNueva("");
                        setConfirmNueva("");
                      } catch {
                        toast.error("No se pudo actualizar la contraseña");
                      } finally {
                        setSavingPassword(false);
                      }
                    }}
                  >
                    {savingPassword ? "Guardando…" : "Guardar contraseña"}
                  </button>
                  <button
                    type="button"
                    style={{ fontSize: 12, color: "#94A3B8" }}
                    onClick={() => { setChanging(false); setNueva(""); setConfirmNueva(""); }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      <div>
        <p style={LABEL_STYLE}>Preferencias regionales</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={FIELD_LABEL}>Moneda de cobro</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["ARS $", "USD $"].map((m) => {
                const sel = m === moneda;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMoneda(m);
                      if (coachId) updateCoachAccountPrefs(coachId, { currency: m.startsWith("USD") ? "USD" : "ARS" }).catch(() => toast.error("No se pudo guardar"));
                    }}
                    style={{
                      background: sel ? "#111827" : "#F1F5F9",
                      color: sel ? "#FFFFFF" : "#94A3B8",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={FIELD_LABEL}>Zona horaria</label>
            <select
              style={INPUT_STYLE}
              value={zona}
              onChange={(e) => {
                setZona(e.target.value);
                if (coachId) updateCoachAccountPrefs(coachId, { timezone: e.target.value }).catch(() => toast.error("No se pudo guardar"));
              }}
            >
              <option>América/Buenos Aires (UTC-3)</option>
              <option>América/Santiago (UTC-4)</option>
              <option>América/Montevideo (UTC-3)</option>
              <option>América/Bogotá (UTC-5)</option>
              <option>Europa/Madrid (UTC+2)</option>
            </select>
          </div>
        </div>
      </div>

      <Divider />

      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
            }}
          >
            <span style={{ fontSize: 13, color: "#374151" }}>Cerrar sesión en este dispositivo</span>
            <button type="button" style={SMALL_BUTTON} onClick={() => supabase.auth.signOut().finally(() => { window.location.href = "/ingresar"; })}>
              Cerrar sesión
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderRadius: 10,
              border: "1px solid #FEE2E2",
              background: "#FFF5F5",
            }}
          >
            <span style={{ fontSize: 13, color: "#EF4444" }}>
              Eliminar mi cuenta permanentemente
            </span>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{
                border: "1px solid #FECACA",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                color: "#EF4444",
                background: "#FFFFFF",
              }}
            >
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>

      {confirmDelete ? (
        <Modal onClose={() => setConfirmDelete(false)}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
            Eliminar cuenta
          </p>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
            Borrar tu cuenta elimina en cascada todos tus atletas, programas y equipos — todavía no lo podemos hacer automáticamente desde acá. Escribinos a soporte para procesarlo.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" style={SMALL_BUTTON} onClick={() => setConfirmDelete(false)}>
              Cerrar
            </button>
            <a
              href="mailto:soporte@togo.app"
              style={{
                background: "#EF4444",
                color: "#FFFFFF",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Escribir a soporte
            </a>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          padding: 24,
          width: 380,
          boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------------- TAB 3 — PAGOS ---------------- */

const PAYMENT_STATUS_LABEL: Record<PaymentAccountStatus["status"], string> = {
  pending: "Todavía no conectaste tu cuenta de cobros",
  onboarding: "Completá tu verificación",
  active: "Listo para cobrar",
  restricted: "Hay un problema con tu cuenta — revisá los detalles en Stripe",
  disabled: "Cuenta deshabilitada",
};

function CobrosMarketplaceSection({ coachId }: { coachId: string | null }) {
  const search = useSearch({ strict: false }) as { stripe?: string; mp?: string };
  const [currency, setCurrency] = useState<string>("ARS");
  const [account, setAccount] = useState<PaymentAccountStatus>({ processor: null, status: "pending" });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const load = async () => {
    if (!coachId) return;
    const [acc, prof] = await Promise.all([
      fetchMyPaymentAccountStatus({ data: { coachId } }),
      fetchCoachAccount(coachId),
    ]);
    setAccount(acc);
    if (prof?.currency) setCurrency(prof.currency);
    setLoading(false);
  };

  useEffect(() => {
    if (!coachId) return;
    (async () => {
      if (search.stripe === "return") await refreshStripeAccountStatus({ data: { coachId } });
      if (search.mp === "connected") toast.success("Mercado Pago conectado ✓");
      await load();
    })();
  }, [coachId]);

  const connect = async () => {
    if (!coachId) return;
    setConnecting(true);
    try {
      const { url } = currency !== "ARS"
        ? await startStripeConnectOnboarding({ data: { coachId } })
        : await startMercadoPagoMarketplaceOAuth({ data: { coachId } });
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar la conexión de cobros");
      setConnecting(false);
    }
  };

  const manage = async () => {
    if (!coachId) return;
    setConnecting(true);
    try {
      if (account.processor === "stripe") {
        const { url } = await createStripeExpressDashboardLink({ data: { coachId } });
        if (url) window.open(url, "_blank");
      } else {
        window.open("https://www.mercadopago.com.ar/", "_blank");
      }
    } catch {
      toast.error("No se pudo abrir tu cuenta de cobros");
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return null;

  const badgeColor = account.status === "active" ? "#16A34A" : account.status === "restricted" || account.status === "disabled" ? "#DC2626" : "#94A3B8";
  const badgeBg = account.status === "active" ? "#DCFCE7" : account.status === "restricted" || account.status === "disabled" ? "#FEE2E2" : "#F1F5F9";

  return (
    <div>
      <p style={LABEL_STYLE}>Cobros del marketplace</p>
      <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
            {currency !== "ARS" ? "Stripe" : "Mercado Pago"}
          </p>
          <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 600, color: badgeColor, background: badgeBg, borderRadius: 6, padding: "2px 8px" }}>
            {PAYMENT_STATUS_LABEL[account.status]}
          </span>
        </div>
        {account.status === "active" ? (
          <button type="button" onClick={manage} disabled={connecting} style={{ fontSize: 12, color: "#94A3B8", display: "flex", alignItems: "center", gap: 4, background: "none", border: 0, cursor: "pointer" }}>
            {account.processor === "stripe" ? "Ver mi cuenta de Stripe" : "Ir a Mercado Pago"}
            <ChevronRight size={14} color="#CBD5E1" />
          </button>
        ) : (
          <button type="button" onClick={connect} disabled={connecting} style={{ ...PRIMARY_BUTTON, height: 38, opacity: connecting ? 0.7 : 1 }}>
            {connecting ? "Un momento…" : currency !== "ARS" ? "Conectar con Stripe" : "Conectar con Mercado Pago"}
          </button>
        )}
      </div>
      {account.status === "active" ? (
        <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>
          {account.processor === "stripe"
            ? "Tu cuenta bancaria y tus retiros se gestionan directamente en Stripe, no acá."
            : "Tu cuenta bancaria y tus retiros se gestionan directamente en Mercado Pago, no acá."}
        </p>
      ) : null}
    </div>
  );
}

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  paid: "Acreditado", pending: "Pendiente de pago", failed: "Falló",
  refunded: "Reembolsado", partially_refunded: "Reembolso parcial",
};
const PURCHASE_STATUS_COLOR: Record<string, string> = {
  paid: "#10B981", pending: "#D97706", failed: "#EF4444", refunded: "#EF4444", partially_refunded: "#EF4444",
};

function PagosTab({ coachId }: { coachId: string | null }) {
  const [purchases, setPurchases] = useState<CoachProgramPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    fetchMyProgramPurchases(coachId).then((rows) => { setPurchases(rows); setLoading(false); });
  }, [coachId]);

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      <CobrosMarketplaceSection coachId={coachId} />
      <Divider />

      <div>
        <p style={LABEL_STYLE}>Historial de cobros</p>
        {loading ? null : purchases.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94A3B8" }}>Todavía no tenés ventas de programas del marketplace.</p>
        ) : (
          <div>
            <div style={{ background: "#F8FAFC", borderRadius: "8px 8px 0 0", padding: "8px 16px", display: "flex", fontSize: 12, fontWeight: 500, color: "#94A3B8" }}>
              <span style={{ flex: 1 }}>Programa</span>
              <span style={{ width: 120 }}>Neto para vos</span>
              <span style={{ width: 120 }}>Estado</span>
            </div>
            {purchases.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", background: "#FFFFFF", borderBottom: "1px solid #F1F5F9", padding: "12px 16px", fontSize: 12, color: "#374151" }}>
                <span style={{ flex: 1 }}>
                  {p.programName}
                  <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>
                    {new Date(p.createdAt).toLocaleDateString("es-AR")}{p.buyerName ? ` · ${p.buyerName}` : ""}
                  </span>
                </span>
                <span style={{ width: 120 }}>{(p.netAmount / 100).toLocaleString("es-AR")} {p.currency}</span>
                <span style={{ width: 120, display: "flex", alignItems: "center", gap: 4, color: PURCHASE_STATUS_COLOR[p.status] ?? "#94A3B8" }}>
                  <CheckCircle size={12} color={PURCHASE_STATUS_COLOR[p.status] ?? "#94A3B8"} />
                  {PURCHASE_STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- TAB 4 — NOTIFICACIONES ---------------- */

const EMAIL_ROWS = [
  ["Nuevo atleta", "Cuando alguien se une a uno de tus programas.", true],
  ["Mensaje recibido", "Cuando un atleta te envía un mensaje.", true],
  ["Pago recibido", "Confirmación de cada cobro acreditado.", true],
  ["Retiro procesado", "Cuando un retiro es acreditado en tu cuenta.", true],
  ["Novedades de TOGO", "Tips, nuevas funciones y actualizaciones.", false],
] as const;

const PUSH_ROWS = [
  ["Semana sin planificar", "Avisá cuando un atleta está por empezar una semana nueva y no tiene ninguna sesión asignada.", true],
  ["Actividad de atletas", "Cuando un atleta completa una sesión.", false],
  ["Mensajes", "Nuevos mensajes de tus atletas.", true],
] as const;

function NotificacionesTab({ coachId }: { coachId: string | null }) {
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    [...EMAIL_ROWS, ...PUSH_ROWS].forEach(([label, , on]) => {
      initial[label as string] = on as boolean;
    });
    return initial;
  });

  useEffect(() => {
    if (!coachId) return;
    fetchCoachNotificationPrefs(coachId).then((prefs) => {
      if (prefs) setState((s) => ({ ...s, ...prefs }));
    });
  }, [coachId]);

  const toggle = (label: string, v: boolean) => {
    setState((s) => {
      const next = { ...s, [label]: v };
      if (coachId) setCoachNotificationPrefs(coachId, next).catch(() => toast.error("No se pudo guardar"));
      return next;
    });
  };

  const rows = (list: typeof EMAIL_ROWS | typeof PUSH_ROWS) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {list.map(([label, desc]) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 0",
            borderBottom: "1px solid #F8FAFC",
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{label}</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{desc}</p>
          </div>
          <Toggle
            on={state[label] ?? false}
            onChange={(v) => toggle(label as string, v)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 520 }}>
      <p style={LABEL_STYLE}>Por email</p>
      {rows(EMAIL_ROWS)}
      <div style={{ height: 1, background: "#E2E8F0", margin: "20px 0" }} />
      <p style={LABEL_STYLE}>Push (app móvil)</p>
      {rows(PUSH_ROWS)}
    </div>
  );
}

/* ---------------- TAB 5 — SUSCRIPCIÓN ---------------- */

type CoachSubscriptionRow = {
  processor: "stripe" | "mercadopago"; status: string; tier_key: string;
  monthly_price_usd: number; charge_currency: string; charge_amount: number | null;
  current_period_end: string | null;
};

const SUB_STATUS_LABEL: Record<string, string> = {
  free: "Plan gratis", active: "ACTIVO", past_due: "Pago pendiente", canceled: "Cancelado", incomplete: "Pendiente de confirmación",
};

function SuscripcionTab({ coachId }: { coachId: string | null }) {
  const search = useSearch({ strict: false }) as { stripe?: string };
  const [sub, setSub] = useState<CoachSubscriptionRow | null>(null);
  const [athleteCount, setAthleteCount] = useState(0);
  const [currency, setCurrency] = useState("ARS");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  const load = async () => {
    if (!coachId) return;
    const [{ data: row }, { data: count }, account] = await Promise.all([
      supabase.from("coach_subscriptions").select("*").eq("coach_id", coachId).maybeSingle(),
      supabase.rpc("coach_athlete_count", { target_coach_id: coachId }),
      fetchCoachAccount(coachId),
    ]);
    setSub(row as CoachSubscriptionRow | null);
    setAthleteCount(Number(count ?? 0));
    setPreviewCount(Number(count ?? 0));
    if (account?.currency) setCurrency(account.currency);
    setLoading(false);
  };

  useEffect(() => {
    if (!coachId) return;
    if (search.stripe === "success") toast.success("Suscripción activada ✓");
    load();
  }, [coachId]);

  if (loading || !coachId) return null;

  const liveTier = resolveTier(athleteCount);
  const isArs = currency === "ARS";
  const status = sub?.status ?? "free";
  const hasSub = status === "active" || status === "past_due" || status === "incomplete";
  // Tramo mostrado en la tarjeta principal: el persistido por el servidor si ya hay suscripción
  // (puede ser más grande que el uso real, porque el coach lo eligió así), si no el tramo en vivo.
  const displayTier = sub?.tier_key ? (PRICING_TIERS.find((t) => t.key === sub.tier_key) ?? liveTier) : liveTier;
  const displayPriceUsd = displayTier.flatPriceUsd ?? Number((displayTier.perAthleteUsd! * Math.max(athleteCount, displayTier.minAthletes)).toFixed(2));
  const displayPriceArs = displayTier.flatPriceArs ?? Math.round(displayTier.perAthleteArs! * Math.max(athleteCount, displayTier.minAthletes));
  const liveIdx = PRICING_TIERS.indexOf(liveTier);

  const choosePlan = async (tierKey: TierKey) => {
    if (!coachId) return;
    setBusy(true);
    try {
      if (hasSub) {
        if (sub?.processor === "stripe") await changeStripeTier({ data: { coachId, tierKey } });
        else await changeMpTier({ data: { coachId, tierKey } });
        toast.success("Plan actualizado ✓");
        load();
      } else {
        const { url } = isArs
          ? await startMpSubscription({ data: { coachId, athleteCount, tierKey } })
          : await startStripeCheckout({ data: { coachId, athleteCount, tierKey } });
        if (url) window.location.href = url;
        return;
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el plan");
    } finally {
      setBusy(false);
    }
  };

  const manage = async () => {
    if (!coachId) return;
    setBusy(true);
    try {
      if (sub?.processor === "stripe") {
        const { url } = await createStripePortalSession({ data: { coachId } });
        if (url) window.location.href = url;
      } else {
        setCancel(true);
        setBusy(false);
      }
    } catch {
      toast.error("No se pudo abrir la gestión de suscripción");
      setBusy(false);
    }
  };

  const confirmCancelMp = async () => {
    if (!coachId) return;
    setBusy(true);
    try {
      await cancelMpSubscription({ data: { coachId } });
      toast.success("Suscripción cancelada");
      setCancel(false);
      load();
    } catch {
      toast.error("No se pudo cancelar la suscripción");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 16, border: "2px solid #111827", padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            {athleteCount} {athleteCount === 1 ? "atleta" : "atletas"}
          </span>
          <span style={{ background: status === "active" ? "#DCFCE7" : status === "past_due" ? "#FEF9C3" : "#F1F5F9", color: status === "active" ? "#16A34A" : status === "past_due" ? "#D97706" : "#94A3B8", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 8px" }}>
            {SUB_STATUS_LABEL[status] ?? status.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginTop: 8 }}>
          {isArs ? `$${displayPriceArs.toLocaleString("es-AR")} ARS` : `$${displayPriceUsd} USD`} <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 400 }}>/mes</span>
        </p>
        {sub?.current_period_end ? <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>· próxima renovación: {new Date(sub.current_period_end).toLocaleDateString("es-AR")}</p> : null}

        {hasSub ? (
          <button type="button" onClick={manage} disabled={busy} style={{ display: "inline-block", fontSize: 13, color: "#94A3B8", marginTop: 16, background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }}>
            Administrar suscripción
          </button>
        ) : athleteCount < 4 ? (
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 16 }}>Estás en el plan gratis — elegí un plan abajo si querés activar la suscripción de todas formas.</p>
        ) : null}
      </div>

      <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>
        Podés elegir cualquier plan, incluso uno más grande del que necesitás hoy — nunca te vamos a bajar de categoría automáticamente, solo subir si tu cantidad de atletas lo supera.
      </p>

      {(() => {
        const SLIDER_MAX = 120;
        const previewTier = resolveTier(previewCount);
        const previewPriceUsd = previewTier.flatPriceUsd ?? Number((previewTier.perAthleteUsd! * Math.max(previewCount, previewTier.minAthletes)).toFixed(2));
        const previewPriceArs = previewTier.flatPriceArs ?? Math.round(previewTier.perAthleteArs! * Math.max(previewCount, previewTier.minAthletes));
        return (
          <div style={{ background: "#F8FAFC", borderRadius: 14, border: "1px solid #E2E8F0", padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Cantidad de clientes</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
                {previewCount}{previewCount >= 101 ? "+" : ""}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={SLIDER_MAX}
              value={Math.min(previewCount, SLIDER_MAX)}
              onChange={(e) => setPreviewCount(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#111827" }}
            />
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 10 }}>
              Con {previewCount} {previewCount === 1 ? "cliente" : "clientes"} pagarías{" "}
              <strong style={{ color: "#111827" }}>
                {isArs ? `$${previewPriceArs.toLocaleString("es-AR")} ARS` : `$${previewPriceUsd} USD`}/mes
              </strong>{" "}
              ({previewTier.key === "free" ? "plan gratis" : `plan ${previewTier.minAthletes}${previewTier.maxAthletes ? `–${previewTier.maxAthletes}` : "+"}`}). Movela para ver qué plan te conviene, y tocá "Elegir este plan" abajo para confirmarlo.
            </p>
          </div>
        );
      })()}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {PRICING_TIERS.map((t, idx) => {
          const isCurrent = t.key === displayTier.key;
          const belowLive = idx < liveIdx;
          const isPreview = t.key === resolveTier(previewCount).key;
          const priceLabel = t.flatPriceUsd !== null
            ? (isArs ? `$${t.flatPriceArs!.toLocaleString("es-AR")}` : `$${t.flatPriceUsd}`)
            : (isArs ? `$${t.perAthleteArs} c/u` : `$${t.perAthleteUsd} c/u`);
          const rangeLabel = t.key === "free" ? "Hasta 3 atletas" : t.maxAthletes ? `De ${t.minAthletes} a ${t.maxAthletes} atletas` : `Desde ${t.minAthletes} atletas`;
          const muted = belowLive && !isCurrent;
          return (
            <div
              key={t.key}
              onClick={() => setPreviewCount(t.minAthletes)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "16px 20px",
                borderRadius: 14,
                border: isCurrent ? "2px solid #111827" : isPreview ? "2px solid #CBD5E1" : "1px solid #E2E8F0",
                background: muted ? "#F8FAFC" : "#FFFFFF",
                opacity: muted ? 0.55 : 1,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: muted ? "#94A3B8" : "#111827" }}>
                    {t.key === "free" ? "Gratis" : `${t.minAthletes}${t.maxAthletes ? `–${t.maxAthletes}` : "+"} atletas`}
                  </span>
                  {isCurrent ? (
                    <span style={{ background: "#111827", color: "#FFFFFF", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>Tu plan actual</span>
                  ) : null}
                </div>
                <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{rangeLabel}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: muted ? "#94A3B8" : "#111827" }}>
                  {priceLabel}
                  <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>{t.flatPriceUsd === 0 ? "" : isArs ? " ARS/mes" : " USD/mes"}</span>
                </p>
                {!isCurrent ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      choosePlan(t.key);
                    }}
                    style={{
                      marginTop: 4,
                      background: muted ? "#F1F5F9" : "#111827",
                      color: muted ? "#CBD5E1" : "#FFFFFF",
                      borderRadius: 6,
                      padding: "4px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      border: 0,
                      cursor: "pointer",
                    }}
                  >
                    Elegir este plan
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {status === "active" && sub?.processor === "mercadopago" ? (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button type="button" onClick={() => setCancel(true)} style={{ fontSize: 12, color: "#94A3B8" }}>
            Cancelar suscripción
          </button>
        </div>
      ) : null}

      {cancel ? (
        <Modal onClose={() => setCancel(false)}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Cancelar suscripción</p>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>¿Querés cancelar tu suscripción de Mercado Pago?</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" style={SMALL_BUTTON} onClick={() => setCancel(false)}>Mantener plan</button>
            <button type="button" onClick={confirmCancelMp} disabled={busy} style={{ background: "#EF4444", color: "#FFFFFF", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600 }}>
              Sí, cancelar
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

