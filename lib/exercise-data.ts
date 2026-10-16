export type MovementPattern =
  | "Core"
  | "Sentadilla"
  | "Estocada"
  | "Bisagra"
  | "Empuje vertical"
  | "Empuje horizontal"
  | "Tracción vertical"
  | "Tracción horizontal"
  | "Isométricos"
  | "Pliométricos"
  | "DLO";

export type Laterality = "Bilateral" | "Unilateral";

export type LibraryExercise = {
  name: string;
  pattern: MovementPattern;
  equipment: string;
  laterality: Laterality;
  source: "TOGO" | "Coach";
};

/** Nombre registrado de la cuenta: coach individual, marca o club. */
export const COACH_BADGE = "Pablo R.";

export const sourceLabel = (source: LibraryExercise["source"]) =>
  source === "TOGO" ? "TOGO" : COACH_BADGE;

export const MOVEMENT_PATTERNS = [
  "Todos",
  "Core",
  "Sentadilla",
  "Estocada",
  "Bisagra",
  "Empuje vertical",
  "Empuje horizontal",
  "Tracción vertical",
  "Tracción horizontal",
  "Isométricos",
  "Pliométricos",
  "DLO",
];

export const EQUIPMENT_OPTIONS = [
  "Todo",
  "Barra",
  "Mancuernas",
  "Kettlebell",
  "Máquinas",
  "Peso corporal",
  "Bandas",
  "Poleas",
];

export const LATERALITY_OPTIONS = ["Todos", "Bilateral", "Unilateral"];

export const LIBRARY_EXERCISES: LibraryExercise[] = [
  { name: "Sentadilla con barra", pattern: "Sentadilla", equipment: "Barra", laterality: "Bilateral", source: "TOGO" },
  { name: "Press de banca", pattern: "Empuje horizontal", equipment: "Barra", laterality: "Bilateral", source: "TOGO" },
  { name: "Peso muerto", pattern: "Bisagra", equipment: "Barra", laterality: "Bilateral", source: "TOGO" },
  { name: "Dominadas", pattern: "Tracción vertical", equipment: "Peso corporal", laterality: "Bilateral", source: "TOGO" },
  { name: "Curl de bíceps", pattern: "Tracción horizontal", equipment: "Mancuernas", laterality: "Unilateral", source: "TOGO" },
  { name: "Press militar", pattern: "Empuje vertical", equipment: "Barra", laterality: "Bilateral", source: "TOGO" },
  { name: "Remo con mancuerna", pattern: "Tracción horizontal", equipment: "Mancuernas", laterality: "Unilateral", source: "TOGO" },
  { name: "Extensión de tríceps", pattern: "Empuje vertical", equipment: "Poleas", laterality: "Bilateral", source: "TOGO" },
  { name: "Hip thrust", pattern: "Bisagra", equipment: "Barra", laterality: "Bilateral", source: "TOGO" },
  { name: "Plancha", pattern: "Isométricos", equipment: "Peso corporal", laterality: "Bilateral", source: "TOGO" },
  { name: "Curl femoral", pattern: "Bisagra", equipment: "Máquinas", laterality: "Bilateral", source: "TOGO" },
  { name: "Sentadilla búlgara", pattern: "Estocada", equipment: "Mancuernas", laterality: "Unilateral", source: "Coach" },
];

export const PICKER_PATTERN_CHIPS = [
  "Todos",
  "Sentadilla",
  "Bisagra",
  "Empuje horizontal",
  "Empuje vertical",
  "Tracción horizontal",
  "Tracción vertical",
  "Core",
  "Estocada",
];
