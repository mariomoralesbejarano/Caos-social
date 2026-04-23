// Re-export types from API contract so existing imports keep working.
export type {
  CardCategory,
  CardTag,
  GameCard,
  PackId,
  PendingThrow,
  RoomPlayer,
  RoomState,
  Trophy,
} from "@workspace/api-client-react";

import type { PackId } from "@workspace/api-client-react";

export interface PackInfo {
  id: PackId;
  name: string;
  emoji: string;
  description: string;
}

export const PACKS: PackInfo[] = [
  {
    id: "banco",
    name: "Banco / Parque",
    emoji: "🌳",
    description:
      "Modo chill para cuando estáis sentados sin nada que hacer. Observación, palabras y confesiones suaves.",
  },
  {
    id: "tardeo",
    name: "Tardeo / Bar",
    emoji: "🍺",
    description:
      "Retos rápidos, posavasos, camareros y caña. Ideal para tardeos sin pasarse.",
  },
  {
    id: "feria",
    name: "Feria / Romería",
    emoji: "💃",
    description:
      "Sevillanas, rebujito, faralaes y caballos. La caseta arde.",
  },
  {
    id: "familiar",
    name: "Familiar",
    emoji: "👨‍👩‍👧",
    description:
      "Retos blancos, mímica y anécdotas. Sin alcohol agresivo.",
  },
  {
    id: "noche",
    name: "Noche / Hardcore",
    emoji: "🔥",
    description:
      "Discoteca, desconocidos, valor. Solo para los más atrevidos.",
  },
  {
    id: "estrategico",
    name: "Estratégico",
    emoji: "🧠",
    description:
      "Solo cartas de poder: comodines, robos, silencio y más.",
  },
  {
    id: "allin",
    name: "All In",
    emoji: "🎲",
    description: "Las 100+ cartas mezcladas. Caos absoluto.",
  },
  {
    id: "clasico",
    name: "Clásico",
    emoji: "🎴",
    description: "Mezcla equilibrada original.",
  },
  {
    id: "discoteca",
    name: "Discoteca",
    emoji: "🪩",
    description: "Pista de baile y modo galán.",
  },
  {
    id: "cena",
    name: "Cena de Amigos",
    emoji: "🍷",
    description: "Más social, menos físico.",
  },
  {
    id: "gimnasio",
    name: "Gimnasio",
    emoji: "💪",
    description: "Modo bestia: solo físicos.",
  },
];
