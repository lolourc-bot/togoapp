type Group = {
  label: string;
  headerColor: string;
  border: string;
  avatarBg: string;
  avatarText: string;
  names: string[];
};

const groups: Group[] = [
  {
    label: "Atención",
    headerColor: "#DC2626",
    border: "#FEF2F2",
    avatarBg: "#FEE2E2",
    avatarText: "#DC2626",
    names: ["Agustina Ruiz", "Santiago Pérez"],
  },
  {
    label: "Precaución",
    headerColor: "#D97706",
    border: "#FFFBEB",
    avatarBg: "#FEF3C7",
    avatarText: "#D97706",
    names: ["Camila Sánchez", "Valentina García"],
  },
  {
    label: "En forma",
    headerColor: "#94A3B8",
    border: "#F1F5F9",
    avatarBg: "#F1F5F9",
    avatarText: "#64748B",
    names: ["Federico Díaz", "Lucía Torres", "Matías López", "Tomás Fernández"],
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function LoadControlCard() {
  return (
    <section className="card-surface p-4">
      <h2 className="text-[0.875rem] font-semibold text-foreground">Control de carga</h2>

      <div className="mt-2">
        {groups.map((group, gi) => (
          <div key={group.label} style={{ marginTop: gi === 0 ? 0 : 12 }}>
            <p
              className="text-[11px] font-semibold uppercase"
              style={{ color: group.headerColor, letterSpacing: "0.05em", marginBottom: 4 }}
            >
              {group.label}
            </p>
            {group.names.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2"
                style={{ padding: "7px 0", borderBottom: `1px solid ${group.border}` }}
              >
                <div
                  className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: group.avatarBg, color: group.avatarText }}
                >
                  {initials(name)}
                </div>
                <p className="whitespace-nowrap text-[13px] font-medium text-[#0F172A]">{name}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
