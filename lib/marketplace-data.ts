export const CATEGORIES = [
  "Todas",
  "Fuerza",
  "Cardio",
  "Movilidad",
  "Crossfit",
  "Rehabilitación",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Program = {
  name: string;
  meta: string;
  tags: string[];
  price: string;
  priceValue: number;
  rating: string;
  weeks: number;
  category: Category;
};

export type Coach = {
  id: string;
  initials: string;
  name: string;
  specialty: string;
  rating: string;
  reviews: number;
  category: Category;
  price: string;
  priceValue: number;
};

export const PROGRAMS: Program[] = [
  {
    name: "Fuerza Total",
    meta: "Coach Pablo · 8 semanas",
    tags: ["Fuerza", "3 días/sem"],
    price: "$19.99/mes",
    priceValue: 19.99,
    rating: "4.9",
    weeks: 8,
    category: "Fuerza",
  },
  {
    name: "Definición Verano",
    meta: "Coach Laura · 6 semanas",
    tags: ["Cardio", "4 días/sem"],
    price: "$14.99/mes",
    priceValue: 14.99,
    rating: "4.7",
    weeks: 6,
    category: "Cardio",
  },
  {
    name: "Movilidad y Flexibilidad",
    meta: "Coach Laura · 4 semanas",
    tags: ["Movilidad", "2 días/sem"],
    price: "$9.99/mes",
    priceValue: 9.99,
    rating: "4.8",
    weeks: 4,
    category: "Movilidad",
  },
  {
    name: "WOD Intensivo",
    meta: "Coach Martín · 12 semanas",
    tags: ["Crossfit", "5 días/sem"],
    price: "$24.99/mes",
    priceValue: 24.99,
    rating: "4.6",
    weeks: 12,
    category: "Crossfit",
  },
  {
    name: "Cardio Progresivo",
    meta: "Coach Diego · 4 semanas",
    tags: ["Cardio", "3 días/sem"],
    price: "$12.99/mes",
    priceValue: 12.99,
    rating: "4.5",
    weeks: 4,
    category: "Cardio",
  },
  {
    name: "Vuelta a Entrenar",
    meta: "Kine. Juan · 6 semanas",
    tags: ["Rehabilitación", "2 días/sem"],
    price: "$54.99/mes",
    priceValue: 54.99,
    rating: "4.9",
    weeks: 6,
    category: "Rehabilitación",
  },
  {
    name: "Core y Estabilidad",
    meta: "Coach Ana · 8 semanas",
    tags: ["Movilidad", "3 días/sem"],
    price: "$29.99/mes",
    priceValue: 29.99,
    rating: "4.8",
    weeks: 8,
    category: "Movilidad",
  },
];

export const COACHES: Coach[] = [
  {
    id: "pablo",
    initials: "CP",
    name: "Coach Pablo Rodríguez",
    specialty: "Fuerza e hipertrofia",
    rating: "4.9",
    reviews: 38,
    category: "Fuerza",
    price: "Desde $80/mes",
    priceValue: 80,
  },
  {
    id: "laura",
    initials: "CL",
    name: "Coach Laura Méndez",
    specialty: "Movilidad y flexibilidad",
    rating: "4.8",
    reviews: 24,
    category: "Movilidad",
    price: "Desde $65/mes",
    priceValue: 65,
  },
  {
    id: "martin",
    initials: "MA",
    name: "Coach Martín Álvarez",
    specialty: "Crossfit y acondicionamiento",
    rating: "4.7",
    reviews: 15,
    category: "Crossfit",
    price: "Desde $70/mes",
    priceValue: 70,
  },
  {
    id: "sofia",
    initials: "SG",
    name: "Coach Sofía Gómez",
    specialty: "Fuerza para principiantes",
    rating: "4.9",
    reviews: 42,
    category: "Fuerza",
    price: "Desde $50/mes",
    priceValue: 50,
  },
  {
    id: "juan",
    initials: "JP",
    name: "Kine. Juan Pereyra",
    specialty: "Rehabilitación y prevención",
    rating: "4.8",
    reviews: 19,
    category: "Rehabilitación",
    price: "Desde $90/mes",
    priceValue: 90,
  },
  {
    id: "ana",
    initials: "AC",
    name: "Coach Ana Caruso",
    specialty: "Movilidad y core",
    rating: "4.6",
    reviews: 11,
    category: "Movilidad",
    price: "Desde $45/mes",
    priceValue: 45,
  },
  {
    id: "diego",
    initials: "DF",
    name: "Coach Diego Ferrari",
    specialty: "Running y cardio",
    rating: "4.7",
    reviews: 27,
    category: "Cardio",
    price: "Desde $55/mes",
    priceValue: 55,
  },
];

export const SORTS = [
  "Relevancia",
  "Mejor valorados",
  "Precio: menor a mayor",
  "Precio: mayor a menor",
  "Más recientes",
] as const;

export const COACH_SORTS = [
  "Relevancia",
  "Mejor valorados",
  "Precio: menor a mayor",
  "Precio: mayor a menor",
] as const;

export type Sort = (typeof SORTS)[number];

export const DURATIONS = ["1-4 sem", "5-8 sem", "+8 sem"] as const;
export const PRICES = ["Hasta $20", "$20-$50", "+$50"] as const;

export function sortItems<T extends { priceValue: number; rating: string }>(
  items: T[],
  sort: Sort,
): T[] {
  const copy = [...items];
  switch (sort) {
    case "Mejor valorados":
      return copy.sort((a, b) => Number(b.rating) - Number(a.rating));
    case "Precio: menor a mayor":
      return copy.sort((a, b) => a.priceValue - b.priceValue);
    case "Precio: mayor a menor":
      return copy.sort((a, b) => b.priceValue - a.priceValue);
    case "Más recientes":
      return copy.reverse();
    default:
      return copy;
  }
}
