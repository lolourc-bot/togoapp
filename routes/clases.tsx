import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, CalendarCheck, CheckCircle, ChevronLeft, Clock, MapPin, User, Users } from "lucide-react";
import { AthleteBottomNav } from "@/components/togo/AthleteBottomNav";
import { useInstitutionMemberAuth } from "@/hooks/useInstitutionMemberAuth";
import { fetchInstitutionById, type Institution } from "@/lib/institutions";
import { fetchInstitutionClasses, type InstitutionClass } from "@/lib/institution-classes";
import { fetchClassOccupancyBulk, fetchMyClassBookings, createClassBooking, deleteClassBooking, type MyBooking } from "@/lib/institution-class-bookings";
import { CLASS_TYPES, type ClassType, DAY_ABBR, dayLabel, endTime, initials, iso, parseIso, shortName, toMin } from "@/lib/gym-classes";

export const Route = createFileRoute("/clases")({
  head: () => ({
    meta: [
      { title: "Clases — TOGO" },
      { name: "description", content: "Reservá tu lugar en las clases de tu gimnasio y anotate en lista de espera." },
      { property: "og:title", content: "Clases — TOGO" },
      { property: "og:description", content: "Horario de clases, cupos disponibles y tus turnos reservados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClasesPage,
});

const groupOf = (s: string) => { const m = toMin(s); return m < 12 * 60 ? "Mañana" : m < 15 * 60 ? "Mediodía" : m < 19 * 60 ? "Tarde" : "Noche"; };

type Sheet = { kind: "book"; c: InstitutionClass; done?: boolean } | { kind: "cancel"; c: InstitutionClass; bookingId: string };

function ClasesPage() {
  const { member, loading: authLoading } = useInstitutionMemberAuth();

  if (authLoading) return <div style={{ minHeight: "100vh", background: "#F1F5F9" }} />;
  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
        <div style={{ width: 375, background: "#F8FAFC", borderRadius: 24, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <p style={{ fontSize: 14, color: "#374151" }}>Necesitás iniciar sesión con tu cuenta de socio para ver y reservar clases.</p>
          <Link to="/ingresar-socio" style={{ background: "#111827", color: "#FFF", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ingresar</Link>
        </div>
      </div>
    );
  }
  return <ClasesContent memberId={member.id} institutionId={member.institution_id} />;
}

function ClasesContent({ memberId, institutionId }: { memberId: string; institutionId: string }) {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [classes, setClasses] = useState<InstitutionClass[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, { confirmed: number; waitlisted: number }>>({});
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(() => iso(new Date()));
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mine, setMine] = useState(false);

  const load = () => Promise.all([
    fetchInstitutionById(institutionId),
    fetchInstitutionClasses(institutionId),
    fetchMyClassBookings(memberId),
  ]).then(async ([inst, cl, mb]) => {
    setInstitution(inst);
    setClasses(cl);
    setMyBookings(mb);
    setOccupancy(await fetchClassOccupancyBulk(cl.map((c) => c.id)));
    setLoading(false);
  });
  useEffect(() => { load(); }, [institutionId, memberId]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => iso(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + i))), []);
  const todayIso = iso(new Date());
  const byDay = useMemo(() => classes.filter((c) => c.date === day).sort((a, b) => toMin(a.start) - toMin(b.start)), [classes, day]);
  const bookingFor = (classId: string) => myBookings.find((b) => b.classId === classId) ?? null;

  const confirmBook = async (c: InstitutionClass) => {
    const occ = occupancy[c.id]?.confirmed ?? 0;
    const status = occ < c.capacity ? "confirmed" : "waitlisted";
    await createClassBooking(c.id, memberId, status);
    if (status === "confirmed") setSheet({ kind: "book", c, done: true });
    else setSheet(null);
    load();
  };
  const cancelBooking = async (bookingId: string) => {
    await deleteClassBooking(bookingId);
    setSheet(null);
    load();
  };

  const myList = classes
    .filter((c) => bookingFor(c.id))
    .filter((c) => c.date >= todayIso)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  let lastGroup = "";

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F1F5F9", padding: 24 }}>
      <div className="relative flex flex-col" style={{ width: 375, height: 812, backgroundColor: "#F8FAFC", borderRadius: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div className="flex-1 overflow-y-auto" style={{ paddingTop: 28 }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Cargando...</div>
          ) : mine ? (
            <div style={{ padding: "16px 20px 100px" }}>
              <button onClick={() => setMine(false)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94A3B8", marginBottom: 8 }}><ChevronLeft size={14} />Clases</button>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 14 }}>Mis turnos</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myList.length === 0 && <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: 30 }}>No tenés turnos reservados.</div>}
                {myList.map((c) => {
                  const booking = bookingFor(c.id)!;
                  const color = CLASS_TYPES[(c.classType as ClassType) ?? "Personalizada"] ?? "#94A3B8";
                  return (
                    <div key={c.id} style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0", borderLeft: `4px solid ${color}`, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{dayLabel(c.date, false)} · {c.start} hs{c.coachName ? ` · ${shortName(c.coachName)}` : ""}{booking.status === "waitlisted" ? " · En espera" : ""}</div>
                      </div>
                      <button onClick={() => setSheet({ kind: "cancel", c, bookingId: booking.id })} style={{ fontSize: 11, color: "#EF4444" }}>Cancelar</button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Clases</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{institution?.name ?? ""}</div>
                </div>
                <button onClick={() => setMine(true)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#3B82F6", marginTop: 6 }}><CalendarCheck size={13} />Mis turnos</button>
              </div>
              <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
                {days.map((d) => {
                  const dt = parseIso(d);
                  const on = d === day;
                  const types = [...new Set(classes.filter((c) => c.date === d).map((c) => c.classType).filter(Boolean))].slice(0, 3) as string[];
                  return (
                    <button key={d} onClick={() => setDay(d)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 12px", borderRadius: 10, gap: 2, background: on ? "#111827" : "transparent", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 500, color: on ? "#FFF" : "#94A3B8" }}>{DAY_ABBR[(dt.getDay() + 6) % 7]}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: on ? "#FFF" : "#374151", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: d === todayIso && !on ? "#F1F5F9" : "transparent" }}>{dt.getDate()}</span>
                      <span style={{ display: "flex", gap: 2, height: 4 }}>{types.map((t) => <span key={t} style={{ width: 4, height: 4, borderRadius: 2, background: CLASS_TYPES[t as ClassType] ?? "#94A3B8" }} />)}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 100px" }}>
                {byDay.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <Calendar size={40} color="#E2E8F0" style={{ margin: "0 auto" }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginTop: 10 }}>Sin clases este día</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Elegí otro día para ver el horario.</div>
                  </div>
                )}
                {byDay.map((c) => {
                  const g = groupOf(c.start);
                  const label = g !== lastGroup ? g : null;
                  lastGroup = g;
                  const booking = bookingFor(c.id);
                  return (
                    <div key={c.id}>
                      {label && <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", padding: "8px 0 4px" }}>{label}</div>}
                      <ClassCard c={c} occ={occupancy[c.id] ?? { confirmed: 0, waitlisted: 0 }} booking={booking}
                        onBook={() => setSheet({ kind: "book", c })}
                        onCancel={() => booking && setSheet({ kind: "cancel", c, bookingId: booking.id })}
                        onWait={() => setSheet({ kind: "book", c })} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {sheet && <BottomSheet sheet={sheet} onClose={() => setSheet(null)} onConfirm={confirmBook} onCancelBook={cancelBooking} occ={occupancy} />}
        <AthleteBottomNav active="Clases" />
      </div>
    </div>
  );
}

function ClassCard({ c, occ, booking, onBook, onCancel, onWait }: { c: InstitutionClass; occ: { confirmed: number; waitlisted: number }; booking: MyBooking | null; onBook: () => void; onCancel: () => void; onWait: () => void }) {
  const left = c.capacity - occ.confirmed;
  const full = left <= 0;
  const color = CLASS_TYPES[(c.classType as ClassType) ?? "Personalizada"] ?? "#94A3B8";
  const isBooked = booking?.status === "confirmed";
  const isWaiting = booking?.status === "waitlisted";
  const chip = isBooked ? ["#F1F5F9", "#94A3B8", "Reservado ✓"]
    : isWaiting ? ["#EFF6FF", "#3B82F6", "En espera"]
    : full && c.waitlistEnabled ? ["#EFF6FF", "#3B82F6", "Lista de espera"]
    : full ? ["#FEE2E2", "#EF4444", "Completo"]
    : left <= 3 ? ["#FEF9C3", "#D97706", left === 1 ? "¡Último!" : `¡Últimos ${left}!`]
    : ["#DCFCE7", "#16A34A", `${left} lugares`];
  const btn = { borderRadius: 10, height: 38, fontSize: 12, whiteSpace: "nowrap" as const };
  return (
    <div style={{ background: "#FFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", display: "flex" }}>
      <div style={{ width: 5, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "14px 12px 14px 14px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
          <span style={{ borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, background: chip[0], color: chip[1], whiteSpace: "nowrap" }}>{chip[2]}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 2, marginTop: 6, fontSize: 12, color: "#374151" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} color="#CBD5E1" />{c.start} – {endTime({ start: c.start, duration: c.durationMinutes })} hs</span>
          {c.coachName ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={11} color="#CBD5E1" />{shortName(c.coachName)}</span> : null}
          {c.room ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} color="#CBD5E1" />{c.room}</span> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#F1F5F9" }}><div style={{ width: `${Math.min(100, (occ.confirmed / c.capacity) * 100)}%`, height: 4, borderRadius: 2, background: color }} /></div>
          <span style={{ fontSize: 10, color: "#94A3B8" }}>{occ.confirmed}/{c.capacity}</span>
          {isBooked ? <button onClick={onCancel} style={{ ...btn, border: "1px solid #E2E8F0", color: "#374151", padding: "0 12px" }}>Reservado ✓</button>
            : isWaiting ? <button onClick={onCancel} style={{ ...btn, border: "1px solid #E2E8F0", color: "#94A3B8", padding: "0 10px", fontSize: 11 }}>En espera</button>
            : full && c.waitlistEnabled ? <button onClick={onWait} style={{ ...btn, border: "1px solid #3B82F6", color: "#3B82F6", padding: "0 10px", fontWeight: 600 }}>Anotarme en espera</button>
            : full ? <button disabled style={{ ...btn, border: "1px solid #E2E8F0", color: "#94A3B8", padding: "0 12px" }}>Completo</button>
            : <button onClick={onBook} style={{ ...btn, background: "#111827", color: "#FFF", padding: "0 16px", fontSize: 13, fontWeight: 600 }}>Reservar</button>}
        </div>
      </div>
    </div>
  );
}

function BottomSheet({ sheet, onClose, onConfirm, onCancelBook, occ }: { sheet: Sheet; onClose: () => void; onConfirm: (c: InstitutionClass) => void; onCancelBook: (bookingId: string) => void; occ: Record<string, { confirmed: number; waitlisted: number }> }) {
  const c = sheet.c;
  const o = occ[c.id] ?? { confirmed: 0, waitlisted: 0 };
  const left = c.capacity - o.confirmed;
  const color = CLASS_TYPES[(c.classType as ClassType) ?? "Personalizada"] ?? "#94A3B8";
  const when = `${dayLabel(c.date)} · ${c.start} – ${endTime({ start: c.start, duration: c.durationMinutes })} hs${c.room ? ` · ${c.room}` : ""}`;
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 150, display: "flex", alignItems: "flex-end" }}>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#FFF", borderRadius: "20px 20px 0 0", overflow: "hidden", animation: "sheetUp .25s ease-out" }}>
        <div style={{ height: 6, background: color }} />
        <div style={{ padding: "12px 20px 32px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E2E8F0", margin: "0 auto 16px" }} />
          {sheet.kind === "book" && sheet.done ? (
            <div style={{ textAlign: "center" }}>
              <CheckCircle size={48} color="#22C55E" style={{ margin: "0 auto" }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 12 }}>¡Reserva confirmada!</div>
              <div style={{ fontSize: 13, color: "#94A3B8" }}>{dayLabel(c.date)} · {c.start} hs</div>
              <a href={icsHref(c)} download={`${c.name}.ics`} style={{ marginTop: 20, border: "1px solid #E2E8F0", borderRadius: 12, height: 44, width: "100%", fontSize: 13, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", boxSizing: "border-box" }}><Calendar size={14} />Agregar al calendario</a>
              <button onClick={onClose} style={{ marginTop: 8, background: "#111827", color: "#FFF", borderRadius: 12, height: 44, width: "100%", fontSize: 13, fontWeight: 600 }}>Listo</button>
            </div>
          ) : sheet.kind === "book" ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{when}</div>
              {c.coachName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#F1F5F9", color: "#94A3B8", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(c.coachName)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.coachName}</span>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>Coach</span>
                </div>
              ) : null}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, marginTop: 16 }}>
                <Users size={16} color="#94A3B8" />
                <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{left > 0 ? `Quedan ${left} lugares libres` : "Clase completa — te anotás en lista de espera"}</span>
                {left > 0 && left <= 3 && <span style={{ fontSize: 11, color: "#D97706" }}>⚡ ¡Últimos {left}!</span>}
              </div>
              <button onClick={() => onConfirm(c)} style={{ marginTop: 20, width: "100%", background: "#111827", color: "#FFF", borderRadius: 14, height: 52, fontSize: 15, fontWeight: 700 }}>{left > 0 ? "Confirmar reserva" : "Anotarme en lista de espera"}</button>
              <button onClick={onClose} style={{ display: "block", margin: "12px auto 0", fontSize: 12, color: "#94A3B8" }}>Cancelar</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>¿Cancelar reserva?</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{c.name} · {when}</div>
              <button onClick={() => onCancelBook(sheet.bookingId)} style={{ marginTop: 20, width: "100%", background: "#EF4444", color: "#FFF", borderRadius: 14, height: 52, fontSize: 15, fontWeight: 700 }}>Sí, cancelar</button>
              <button onClick={onClose} style={{ display: "block", margin: "12px auto 0", fontSize: 12, color: "#94A3B8" }}>Volver</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function icsHref(c: InstitutionClass) {
  const s = `${c.date.replace(/-/g, "")}T${c.start.replace(":", "")}00`;
  const e = `${c.date.replace(/-/g, "")}T${endTime({ start: c.start, duration: c.durationMinutes }).replace(":", "")}00`;
  const body = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${c.name}\nDTSTART:${s}\nDTEND:${e}\nLOCATION:${c.room ?? ""}\nEND:VEVENT\nEND:VCALENDAR`;
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}
