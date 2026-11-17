import { useEffect, useRef, useState } from "react";
import { NAME_TAKEN_MSG, isNameTaken } from "@/lib/unique-name";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ImagePlus, X } from "lucide-react";
import {
  PROGRAM_SPORTS,
  fetchProgramPublishState,
  publishMyMarketplaceProfile,
  saveProgramListing,
  type ProgramLevel,
} from "@/lib/marketplace";
import { COVER_MAX_MB, uploadProgramCover } from "@/lib/program-covers";
import { PROGRAM_CURRENCIES, formatProgramPrice, isProgramCurrency, parsePriceInput, type ProgramCurrency } from "@/lib/program-price";

/**
 * Lab → program menu → "Publicar en marketplace": name, sport/discipline (athletes filter by it), level, price and
 * cover, then publish or hide. Programs are one-time purchases and can't be free (same rule as the coach profile).
 * If the coach's own profile isn't public yet, it offers to publish it too: the marketplace only lists programs of
 * coaches with a public profile.
 */
export function PublishProgramModal({
  program,
  coachId,
  onClose,
  onSaved,
  takenNames,
}: {
  program: { id: string; name: string };
  coachId: string;
  onClose: () => void;
  onSaved: () => void;
  /** Names of the coach's other programs. */
  takenNames: string[];
}) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(program.name);
  const [sport, setSport] = useState("");
  const [level, setLevel] = useState<ProgramLevel>("Intermedio");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<ProgramCurrency>("ARS");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [published, setPublished] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  const [alsoPublishProfile, setAlsoPublishProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameTaken = isNameTaken(name, takenNames);

  useEffect(() => {
    fetchProgramPublishState(program.id, coachId)
      .then((s) => {
        if (s.name) setName(s.name);
        setSport(s.sport ?? "");
        setLevel(s.level ?? "Intermedio");
        // Show the stored amount the way it's typed here ("8500" → "8.500").
        const n = parsePriceInput(s.price);
        setPrice(n ? n.toLocaleString("es-AR") : "");
        if (isProgramCurrency(s.currency)) setCurrency(s.currency);
        setCoverUrl(s.coverUrl);
        setPublished(s.visible);
        setProfileVisible(s.profileVisible);
      })
      .catch(() => toast.error("No se pudo cargar el programa"))
      .finally(() => setLoading(false));
  }, [program.id, coachId]);

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setCoverUrl(await uploadProgramCover(coachId, file));
    } catch (e) {
      toast.error(e instanceof Error && e.message.startsWith("La ") ? e.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async (visible: boolean) => {
    if (nameTaken) return;
    if (!name.trim()) {
      toast.error("Ponele un nombre al programa");
      return;
    }
    const priceNum = parsePriceInput(price);
    if (visible && !priceNum) {
      toast.error("Poné un precio para publicar el programa: no hay programas gratis en el marketplace");
      return;
    }
    setSaving(true);
    try {
      const complete = await saveProgramListing(program.id, {
        name: name.trim(),
        level,
        price: priceNum ? String(priceNum) : null,
        currency,
        sport: sport || null,
        coverUrl,
        visible,
      });
      if (visible && !profileVisible && alsoPublishProfile) await publishMyMarketplaceProfile(coachId);
      if (!complete) toast.warning("Se guardó, pero el deporte y la portada necesitan una actualización de la base de datos (migración 0048).");
      toast.success(visible ? "Programa publicado en el marketplace" : "Programa oculto del marketplace");
      onSaved();
      onClose();
    } catch {
      toast.error("No se pudo guardar. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const label = "block text-[12px] font-medium";
  const field = "w-full rounded-[10px] border px-3 text-[13px] outline-none focus:border-[#0272B7]";
  const fieldStyle = { height: 40, borderColor: "#E2E8F0", color: "#111827", backgroundColor: "#FFFFFF" } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.35)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-[16px] bg-white"
        style={{ width: 480, maxWidth: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        role="dialog"
        aria-label="Publicar en marketplace"
      >
        <div className="flex flex-row items-start justify-between" style={{ padding: "24px 28px 12px" }}>
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: "#111827" }}>
              {published ? "Editar publicación" : "Publicar en marketplace"}
            </h2>
            <p className="text-[12px]" style={{ color: "#64748B", marginTop: 2 }}>Así lo van a ver los atletas al buscar programas.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} style={{ color: "#94A3B8" }} />
          </button>
        </div>

        {loading ? (
          <div className="text-[13px]" style={{ color: "#94A3B8", padding: "24px 28px 32px" }}>Cargando…</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto" style={{ padding: "8px 28px 4px" }}>
              {/* Cover */}
              <span className={label} style={{ color: "#374151", marginBottom: 6 }}>Imagen de portada</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickCover(e.target.files?.[0])} />
              {coverUrl ? (
                <div className="relative overflow-hidden rounded-[12px]" style={{ height: 150, marginBottom: 16, border: "1px solid #E2E8F0" }}>
                  <img src={coverUrl} alt="Portada del programa" className="h-full w-full object-cover" />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="rounded-[8px] bg-white/95 px-3 text-[12px] font-medium shadow-sm" style={{ height: 30, color: "#111827" }}>
                      {uploading ? "Subiendo…" : "Cambiar"}
                    </button>
                    <button type="button" onClick={() => setCoverUrl(null)}
                      className="rounded-[8px] bg-white/95 px-3 text-[12px] font-medium shadow-sm" style={{ height: 30, color: "#B91C1C" }}>
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex w-full flex-col items-center justify-center gap-1.5 rounded-[12px] transition-colors hover:bg-[#F8FAFC]"
                  style={{ height: 120, border: "1.5px dashed #CBD5E1", marginBottom: 16 }}>
                  <ImagePlus size={22} color="#64748B" />
                  <span className="text-[13px] font-medium" style={{ color: "#374151" }}>{uploading ? "Subiendo…" : "Subir imagen"}</span>
                  <span className="text-[11px]" style={{ color: "#94A3B8" }}>JPG, PNG o WebP · hasta {COVER_MAX_MB} MB · ideal horizontal</span>
                </button>
              )}

              <label className={label} style={{ color: "#374151", marginBottom: 6 }} htmlFor="pub-name">Nombre</label>
              <input id="pub-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-invalid={nameTaken} className={field} style={{ ...fieldStyle, marginBottom: nameTaken ? 6 : 16, ...(nameTaken ? { borderColor: "#EF4444" } : {}) }} />
              {nameTaken ? <p className="text-[12px]" style={{ color: "#DC2626", marginBottom: 16 }}>{NAME_TAKEN_MSG}</p> : null}

              <label className={label} style={{ color: "#374151", marginBottom: 6 }} htmlFor="pub-sport">¿Es para algún deporte o disciplina?</label>
              <select id="pub-sport" value={sport} onChange={(e) => setSport(e.target.value)} className={field} style={{ ...fieldStyle, marginBottom: 4 }}>
                <option value="">General (sirve para cualquiera)</option>
                {PROGRAM_SPORTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p className="text-[11px]" style={{ color: "#94A3B8", marginBottom: 16 }}>Los atletas van a poder filtrar por esto al buscar.</p>

              <label className={label} style={{ color: "#374151", marginBottom: 6 }} htmlFor="pub-level">Nivel</label>
              <select id="pub-level" value={level} onChange={(e) => setLevel(e.target.value as ProgramLevel)} className={field} style={{ ...fieldStyle, marginBottom: 16 }}>
                {(["Principiante", "Intermedio", "Avanzado"] as ProgramLevel[]).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>

              <label className={label} style={{ color: "#374151", marginBottom: 6 }} htmlFor="pub-price">Precio (pago único)</label>
              <div className="flex gap-2" style={{ marginBottom: 4 }}>
                <select
                  aria-label="Moneda"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as ProgramCurrency)}
                  className="rounded-[10px] border px-3 text-[13px] outline-none focus:border-[#0272B7]"
                  style={{ ...fieldStyle, width: 190, flexShrink: 0 }}
                >
                  {PROGRAM_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  id="pub-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={currency === "ARS" ? "8.500" : "25"}
                  inputMode="decimal"
                  className={field}
                  style={fieldStyle}
                />
              </div>
              <p className="text-[11px]" style={{ color: "#94A3B8", marginBottom: 16 }}>
                {parsePriceInput(price) ? `Los atletas van a ver ${formatProgramPrice(price, currency)}. ` : ""}
                {PROGRAM_CURRENCIES.find((c) => c.code === currency)?.note}.
              </p>

              {!profileVisible ? (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] text-[12px]" style={{ backgroundColor: "#FFFBEB", color: "#92400E", padding: "10px 12px", marginBottom: 12, lineHeight: 1.5 }}>
                  <input type="checkbox" checked={alsoPublishProfile} onChange={(e) => setAlsoPublishProfile(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    <b>Publicar también mi perfil de coach.</b> El marketplace solo muestra programas de coaches con perfil público; sin esto, nadie va a ver el programa.
                  </span>
                </label>
              ) : null}
            </div>

            <div style={{ padding: "12px 28px 24px", borderTop: "1px solid #F1F5F9" }}>
              <button
                type="button"
                disabled={saving || uploading || nameTaken}
                onClick={() => save(true)}
                className="w-full rounded-[10px] text-[13px] font-semibold"
                style={{ height: 42, backgroundColor: "#111827", color: "#FFFFFF", opacity: saving || uploading ? 0.6 : 1 }}
              >
                {saving ? "Guardando…" : published ? "Guardar cambios" : "Publicar"}
              </button>
              {published ? (
                <button
                  type="button"
                  disabled={saving || nameTaken}
                  onClick={() => save(false)}
                  className="mt-2 w-full rounded-[10px] text-[13px] font-medium"
                  style={{ height: 38, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", color: "#374151" }}
                >
                  Ocultar del marketplace
                </button>
              ) : null}
              <Link
                to="/perfil-coach/$coachId"
                params={{ coachId }}
                search={{ vista: "atleta" }}
                className="mt-3 block text-center text-[12px] font-medium hover:underline"
                style={{ color: "#0272B7" }}
              >
                Ver cómo me ven los atletas →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
