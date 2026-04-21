// Re-export types from API contract so existing imports keep working.
export type {
  CardCategory,
  CardTag,
  GameCard,
  PackId,
  PendingThrow,
  RoomPlayer,
  RoomState,
} from "@workspace/api-client-react";

export interface PackInfo {
  id: "clasico" | "discoteca" | "cena" | "gimnasio" | "allin";
  name: string;
  description: string;
}

export const PACKS: PackInfo[] = [
  {
    id: "clasico",
    name: "Clásico",
    description: "Mezcla equilibrada para cualquier ocasión.",
  },
  {
    id: "discoteca",
    name: "Discoteca",
    description: "Ligar, bailar, beber, cantar. Modo fiesta total.",
  },
  {
    id: "cena",
    name: "Cena de Amigos",
    description: "Más social, menos físico. Ideal para sobremesas.",
  },
  {
    id: "gimnasio",
    name: "Gimnasio",
    description: "Modo bestia: solo retos físicos y de superación.",
  },
  {
    id: "allin",
    name: "All In",
    description: "Todas las cartas mezcladas. Caos absoluto.",
  },
];
