import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { EditPriceModal } from "@/components/togo/MarketplacePricing";
import { ProgramCalendar } from "@/components/togo/ProgramCalendar";

export type EditorProgram = {
  id: string;
  name: string;
  category: string;
  duration: string;
  frequency: string;
  status: "Publicado" | "Borrador" | "Archivado";
  subscribers: number;
  rating: string | null;
  price: string;
  revenue: string;
  payment: string;
};


const editorCss = `
.pe-benefit{background:#FFFFFF;border-radius:10px;border:1px solid #E2E8F0;padding:10px 12px;display:flex;align-items:center;gap:10px}
.pe-benefit:hover{border-color:#94A3B8}
.pe-benefit input{flex:1;border:none;background:transparent;font-size:13px;color:#374151;outline:none;border-bottom:1px solid transparent}
.pe-benefit:hover input{border-bottom:1px dashed #CBD5E1}
.pe-dashed{border:1px dashed #E2E8F0;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;background:#F8FAFC;font-size:13px;color:#94A3B8;width:100%}
.pe-dashed:hover{border-color:#111827;color:#111827}
.pe-cal-btn:hover{background:#111827 !important;color:#FFFFFF !important}
.pe-cal-btn:hover *{color:#FFFFFF !important}
.pe-cal-btn:hover svg{color:#FFFFFF !important;stroke:#FFFFFF !important}
.pe-icon-danger:hover svg{color:#EF4444;stroke:#EF4444}
.pe-icon-dark:hover svg{color:#111827;stroke:#111827}
.pe-link:hover{color:#111827 !important}
`;

const PREVIEW_SESSIONS = [
  {
    day: "Día 1",
    name: "Fuerza tren superior",
    minutes: 55,
    exercises: [
      { label: "A1", name: "Press de banca", reps: "4×8" },
      { label: "B1", name: "Remo con barra", reps: "4×8" },
      { label: "B2", name: "Curl bíceps", reps: "3×10" },
      { label: "C1", name: "Fondos", reps: "3×12" },
      { label: "C2", name: "Face pull", reps: "3×15" },
      { label: "D1", name: "Plancha", reps: "3×45s" },
    ],
  },
  {
    day: "Día 3",
    name: "Fuerza tren inferior",
    minutes: 50,
    exercises: [
      { label: "A1", name: "Sentadilla con barra", reps: "4×6" },
      { label: "B1", name: "Peso muerto rumano", reps: "3×10" },
      { label: "B2", name: "Curl femoral", reps: "3×12" },
      { label: "C1", name: "Prensa", reps: "3×12" },
      { label: "C2", name: "Extensión cuádriceps", reps: "3×15" },
      { label: "D1", name: "Gemelos", reps: "4×20" },
    ],
  },
  {
    day: "Día 5",
    name: "Full body",
    minutes: 60,
    exercises: [
      { label: "A1", name: "Peso muerto", reps: "4×5" },
      { label: "B1", name: "Press militar", reps: "4×8" },
      { label: "B2", name: "Dominadas", reps: "4×6" },
      { label: "C1", name: "Sentadilla frontal", reps: "3×8" },
      { label: "C2", name: "Hip thrust", reps: "3×12" },
      { label: "D", name: "Circuito metabólico", reps: "AMRAP 10'" },
    ],
  },
];

const LEVELS = ["Principiante", "Intermedio", "Avanzado"];
const EQUIPMENT = [
  "Barra",
  "Mancuernas",
  "Kettlebell",
  "Máquinas",
  "Peso corporal",
  "Bandas",
  "Poleas",
  "Banco",
  "Rack",
];

const sectionTitle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#111827",
  marginBottom: 8,
} as const;

export function ProgramEditor({
  program,
  onBack,
}: {
  program: EditorProgram;
  onBack: () => void;
}) {
  const [published, setPublished] = useState(program.status === "Publicado");
  const [benefits, setBenefits] = useState<string[]>([
    "Ganá fuerza y masa muscular en 12 semanas",
    "Sesiones diseñadas para cualquier nivel intermedio",
    "Progresión estructurada semana a semana",
  ]);
  const [levels, setLevels] = useState<string[]>(["Intermedio"]);
  const [equipment, setEquipment] = useState<string[]>(["Barra", "Mancuernas"]);
  const [noEquipment, setNoEquipment] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [slogan, setSlogan] = useState("");

  const [fullCalendar, setFullCalendar] = useState(false);



  const toggle = (list: string[], value: string, set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const chipStyle = (active: boolean, outlined = false) => ({
    height: 34,
    borderRadius: 8,
    padding: "0 16px",
    fontSize: 12,
    fontWeight: 500,
    background: active ? "#111827" : outlined ? "#FFFFFF" : "#F1F5F9",
    border: active ? "none" : outlined ? "1px solid #E2E8F0" : "none",
    color: active ? "#FFFFFF" : "#64748B",
  });

  if (fullCalendar) {
    return <ProgramCalendar programName={program.name} onBack={() => setFullCalendar(false)} />;
  }

  return (
    <div style={{ flex: 1, background: "#F8FAFC", minWidth: 0 }}>
      <style dangerouslySetInnerHTML={{ __html: editorCss }} />
      <div
        style={{
          padding: "20px 40px",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "#FFFFFF",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <ChevronLeft size={20} color="#94A3B8" />
          <span style={{ fontSize: 13, color: "#94A3B8" }}>Volver al marketplace</span>
        </button>
        <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: "#111827" }}>
          {program.name}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            padding: "4px 10px",
            background: published ? "#F0FDF4" : "#FFFBEB",
            color: published ? "#16A34A" : "#D97706",
          }}
        >
          {published ? "Publicado" : "Borrador"}
        </span>
        <button
          type="button"
          onClick={() => setPublished(true)}
          style={{
            background: "#111827",
            color: "#FFFFFF",
            borderRadius: 10,
            fontSize: 13,
            padding: "8px 18px",
          }}
        >
          {published ? "Ver en marketplace" : "Publicar"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: "32px 24px 32px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <section>
            <p style={sectionTitle}>Portada</p>
            <div
              style={{
                width: "100%",
                height: 200,
                borderRadius: 14,
                border: "2px dashed #E2E8F0",
                background: "#F8FAFC",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <ImageIcon size={32} color="#CBD5E1" />
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Subir imagen de portada</span>
            </div>
          </section>

          <section>
            <p style={{ ...sectionTitle, marginBottom: 6 }}>Slogan</p>
            <input
              value={slogan}
              maxLength={80}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Una frase corta y memorable que enganche al atleta."
              style={{
                width: "100%",
                height: 40,
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "0 14px",
                fontSize: 13,
                color: "#374151",
                outline: "none",
              }}
            />
            <div style={{ textAlign: "right", fontSize: 10, color: "#CBD5E1", marginTop: 4 }}>
              {slogan.length}/80
            </div>
          </section>

          <section>
            <p style={sectionTitle}>¿De qué se trata este programa?</p>
            <textarea
              placeholder="Contá en detalle qué van a trabajar, para quién es ideal, qué resultados pueden esperar..."
              style={{
                width: "100%",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 14,
                minHeight: 120,
                fontSize: 13,
                color: "#374151",
                resize: "vertical",
              }}
            />
          </section>

          <section>
            <p style={sectionTitle}>¿Qué vas a obtener?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {benefits.map((b, i) => (
                <div key={`benefit-${i}`} className="pe-benefit">
                  <ChevronRight size={14} color="#111827" style={{ flexShrink: 0 }} />
                  <input
                    value={b}
                    aria-label="Beneficio"
                    placeholder="Escribí un beneficio…"
                    onChange={(e) =>
                      setBenefits(benefits.map((v, j) => (j === i ? e.target.value : v)))
                    }
                  />
                  <GripVertical size={14} color="#CBD5E1" style={{ cursor: "grab" }} />
                  <button
                    type="button"
                    className="pe-icon-danger"
                    aria-label="Eliminar beneficio"
                    onClick={() => setBenefits(benefits.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={14} color="#CBD5E1" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="pe-dashed"
                onClick={() => setBenefits([...benefits, ""])}
              >
                <Plus size={14} /> Agregar beneficio
              </button>
            </div>
          </section>


          <section>
            <p style={sectionTitle}>Para quién es</p>
            <div style={{ display: "flex", gap: 8 }}>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggle(levels, l, setLevels)}
                  style={chipStyle(levels.includes(l))}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p style={sectionTitle}>Equipamiento necesario</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, opacity: noEquipment ? 0.5 : 1 }}>
              {EQUIPMENT.map((e) => (
                <button
                  key={e}
                  type="button"
                  disabled={noEquipment}
                  onClick={() => toggle(equipment, e, setEquipment)}
                  style={chipStyle(equipment.includes(e), true)}
                >
                  {e}
                </button>
              ))}
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#374151",
                marginTop: 10,
              }}
            >
              <input
                type="checkbox"
                checked={noEquipment}
                onChange={(e) => {
                  setNoEquipment(e.target.checked);
                  if (e.target.checked) setEquipment([]);
                }}
              />
              Sin equipamiento especial
            </label>
          </section>

          <section>
            <p style={sectionTitle}>Muestra de lo que van a entrenar</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>
              Las sesiones de la Semana 1 del programa.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 14,
                overflowX: "auto",
                paddingBottom: 8,
              }}
            >
              {PREVIEW_SESSIONS.map((s) => (
                <div
                  key={s.day}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 12,
                    border: "1px solid #E2E8F0",
                    width: 200,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #F8FAFC" }}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#94A3B8",
                        background: "#F1F5F9",
                        borderRadius: 6,
                        padding: "2px 7px",
                        marginBottom: 6,
                      }}
                    >
                      {s.day}
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                      {s.exercises.length} ejercicios · ~{s.minutes} min
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "8px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {s.exercises.map((ex) => (
                      <div
                        key={ex.label + ex.name}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <span
                          style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", width: 20 }}
                        >
                          {ex.label}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "#374151",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ex.name}
                        </span>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{ex.reps}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "8px 14px", borderTop: "1px solid #F8FAFC" }}>
                    <button
                      type="button"
                      className="pe-link"
                      onClick={() => setFullCalendar(true)}
                      style={{ fontSize: 11, color: "#94A3B8", cursor: "pointer" }}
                    >
                      Ver sesión completa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p style={{ ...sectionTitle, marginBottom: 4 }}>Calendario del programa</p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 14 }}>
              Organizá las sesiones semana por semana. El atleta verá este calendario al comprar.
            </p>
            <button
              type="button"
              className="pe-cal-btn"
              onClick={() => setFullCalendar(true)}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 14,
                border: "2px solid #111827",
                background: "#FFFFFF",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                marginTop: 4,
                padding: "0 18px",
              }}
            >
              <CalendarDays size={20} color="#111827" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                Ver y editar calendario del programa
              </span>
              <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: "auto" }} />
            </button>
          </section>
        </div>


        <div
          style={{
            width: 300,
            flexShrink: 0,
            padding: "32px 40px 32px 24px",
            borderLeft: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            position: "sticky",
            top: 80,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              padding: 20,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 14 }}>
              Resumen
            </p>
            {[
              ["Duración", program.duration],
              ["Frecuencia", program.frequency],
              ["Categoría", program.category],
              ["Nivel", levels.join(", ") || "—"],
              ["Equipamiento", noEquipment ? "Sin equipamiento" : equipment.join(", ") || "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  borderBottom: "1px solid #F8FAFC",
                  padding: "8px 0",
                  gap: 12,
                }}
              >
                <span style={{ color: "#94A3B8" }}>{k}</span>
                <span style={{ color: "#374151", textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 12,
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Precio</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{program.price}</span>
            </div>
            <button
              type="button"
              onClick={() => setPriceOpen(true)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "right",
                fontSize: 12,
                color: "#94A3B8",
                marginTop: 4,
              }}
            >
              Editar precio
            </button>
          </div>

          {published ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid #E2E8F0",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Estadísticas rápidas</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#94A3B8" }}>Suscriptores</span>
                <span style={{ color: "#111827", fontWeight: 600 }}>{program.subscribers}</span>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "#16A34A",
                }}
              >
                <TrendingUp size={12} color="#16A34A" /> +3 esta semana
              </span>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#94A3B8" }}>Ingresos</span>
                <span style={{ color: "#111827", fontWeight: 600 }}>
                  {program.revenue.replace("= ", "")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#94A3B8" }}>Valoración</span>
                <span style={{ color: "#111827", fontWeight: 600 }}>
                  ⭐ {program.rating ?? "—"} (21 reseñas)
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {priceOpen ? <EditPriceModal program={program} onClose={() => setPriceOpen(false)} /> : null}
    </div>
  );
}
