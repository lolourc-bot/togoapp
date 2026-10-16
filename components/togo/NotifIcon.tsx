import { AlertCircle, Bell, Calendar, CheckCircle, Clock, CreditCard, Dumbbell, MessageCircle, Star, UserCheck, UserPlus, Users } from "lucide-react";
import { NOTIF_STYLE } from "@/lib/notifications";

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  session: Dumbbell, message: MessageCircle, done: CheckCircle, class: Calendar, fee: CreditCard,
  coach: UserCheck, team: Users, reminder: Clock, newAthlete: UserPlus, inactive: AlertCircle, request: Star, noWeek: Calendar,
};

export function NotifIcon({ kind, size }: { kind: string; size: number }) {
  const I = ICONS[kind] ?? Bell;
  const s = NOTIF_STYLE[kind] ?? { bg: "#F1F5F9", fg: "#64748B" };
  return (
    <span className="flex items-center justify-center" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: s.bg }}>
      <I size={Math.round(size * 0.45)} color={s.fg} />
    </span>
  );
}
