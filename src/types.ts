export const FRENCH_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type FrenchLevel = typeof FRENCH_LEVELS[number];

export interface Message {
  role: "user" | "model";
  text: string;
}
