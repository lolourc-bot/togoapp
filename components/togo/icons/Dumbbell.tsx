import { createLucideIcon } from "lucide-react";

/**
 * TOGO's dumbbell: a level bar with big inner plates and small outer collars. Replaces lucide's diagonal
 * Dumbbell everywhere; built with createLucideIcon so it takes the same props (size, color, strokeWidth…).
 */
export const Dumbbell = createLucideIcon("TogoDumbbell", [
  ["path", { d: "M8 12h8", key: "bar" }],
  ["rect", { x: "4.5", y: "6", width: "3.5", height: "12", rx: "1.25", key: "plate-l" }],
  ["rect", { x: "16", y: "6", width: "3.5", height: "12", rx: "1.25", key: "plate-r" }],
  ["path", { d: "M2.5 9.5v5", key: "collar-l" }],
  ["path", { d: "M21.5 9.5v5", key: "collar-r" }],
]);
