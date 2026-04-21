export type CardCategory =
  | "reto"
  | "beber"
  | "ligar"
  | "fisico"
  | "poder"
  | "social";

export type CardTag = "abstemio" | "pareja" | "hardcore";

export type PackId = "clasico" | "discoteca" | "cena" | "gimnasio" | "allin";

export interface GameCard {
  id: string;
  title: string;
  effect: string;
  power: string;
  category: CardCategory;
  points: number;
  blockedBy?: CardTag[];
  isPower?: boolean;
}

export const ALL_CARDS: GameCard[] = [
  {
    id: "hidalgo",
    title: "Hidalgo",
    effect: "El receptor debe beber un trago largo de su bebida.",
    power: "Si lo cumple, gana inmunidad por 1 turno.",
    category: "beber",
    points: 10,
    blockedBy: ["abstemio"],
  },
  {
    id: "pregunta-incomoda",
    title: "Pregunta Incómoda",
    effect:
      "El que tira la carta hace una pregunta personal. El receptor debe responder con la verdad.",
    power: "Si miente y le pillan, recibe x2 castigo.",
    category: "social",
    points: 15,
  },
  {
    id: "bailar-desconocido",
    title: "Bailar con Desconocido",
    effect:
      "El receptor debe bailar 30 segundos con alguien que no conozca del lugar.",
    power: "Si lo logra, gana 25 puntos extra.",
    category: "social",
    points: 30,
    blockedBy: ["pareja"],
  },
  {
    id: "burpees",
    title: "20 Burpees",
    effect: "El receptor hace 20 burpees aquí y ahora.",
    power: "Si los hace sin pausa, doble puntos.",
    category: "fisico",
    points: 20,
  },
  {
    id: "reversa",
    title: "Reversa",
    effect: "Devuelve el reto al jugador que te lo lanzó.",
    power: "El emisor original debe cumplirlo sin posibilidad de rechazar.",
    category: "poder",
    points: 5,
    isPower: true,
  },
  {
    id: "bloqueo",
    title: "Bloqueo",
    effect: "Inmunidad temporal: nadie te puede lanzar cartas por 5 minutos.",
    power: "Activa un escudo neón sobre tu perfil.",
    category: "poder",
    points: 5,
    isPower: true,
  },
  {
    id: "espejo",
    title: "Espejo",
    effect: "Quien lanzó la carta debe cumplir el reto él mismo.",
    power: "El receptor gana los puntos del reto sin hacer nada.",
    category: "poder",
    points: 10,
    isPower: true,
  },
  {
    id: "shot-grupal",
    title: "Shot Grupal",
    effect: "El receptor elige a 2 amigos y todos beben un chupito.",
    power: "El receptor gana puntos por cada uno que acepte.",
    category: "beber",
    points: 15,
    blockedBy: ["abstemio"],
  },
  {
    id: "confesion",
    title: "Confesión Pública",
    effect:
      "El receptor confiesa algo vergonzoso (no peligroso) frente al grupo.",
    power: "Si todos ríen, gana puntos extra.",
    category: "social",
    points: 20,
  },
  {
    id: "ligoteo",
    title: "Modo Galán",
    effect: "Pídele el número a alguien del local en menos de 2 minutos.",
    power: "Si lo consigue, ranking +50.",
    category: "ligar",
    points: 50,
    blockedBy: ["pareja"],
  },
  {
    id: "plancha",
    title: "Plancha 60s",
    effect: "Mantén una plancha durante 60 segundos.",
    power: "El que aguante más, +10 puntos extra.",
    category: "fisico",
    points: 15,
  },
  {
    id: "imitacion",
    title: "Imitación",
    effect:
      "El receptor imita a otro jugador hasta que el grupo adivine quién es.",
    power: "Si nadie adivina en 30s, doble puntos.",
    category: "social",
    points: 15,
  },
  {
    id: "karaoke",
    title: "Karaoke Express",
    effect: "Canta el estribillo de la última canción que sonó.",
    power: "Si lo borda, +20 puntos.",
    category: "social",
    points: 20,
  },
  {
    id: "sentadillas",
    title: "30 Sentadillas",
    effect: "Hazlas sin parar, ahora mismo.",
    power: "Doble puntos si las haces con peso extra.",
    category: "fisico",
    points: 20,
  },
  {
    id: "shot-mezcla",
    title: "Shot Misterioso",
    effect:
      "El grupo mezcla 3 ingredientes seguros (sin riesgo) y el receptor lo bebe.",
    power: "Si no hace mueca, +25.",
    category: "beber",
    points: 25,
    blockedBy: ["abstemio"],
  },
  {
    id: "robo-carta",
    title: "Robo de Mano",
    effect: "Roba una carta aleatoria de la mano de cualquier jugador.",
    power: "La carta robada queda en tu mano.",
    category: "poder",
    points: 5,
    isPower: true,
  },
];

interface PackDef {
  id: PackId;
  cardIds: string[];
}

export const PACKS: PackDef[] = [
  { id: "clasico", cardIds: ALL_CARDS.map((c) => c.id) },
  {
    id: "discoteca",
    cardIds: [
      "hidalgo",
      "bailar-desconocido",
      "shot-grupal",
      "ligoteo",
      "karaoke",
      "shot-mezcla",
      "reversa",
      "bloqueo",
      "espejo",
      "confesion",
    ],
  },
  {
    id: "cena",
    cardIds: [
      "pregunta-incomoda",
      "confesion",
      "imitacion",
      "karaoke",
      "hidalgo",
      "shot-grupal",
      "reversa",
      "bloqueo",
      "espejo",
      "robo-carta",
    ],
  },
  {
    id: "gimnasio",
    cardIds: [
      "burpees",
      "plancha",
      "sentadillas",
      "imitacion",
      "reversa",
      "bloqueo",
      "espejo",
      "robo-carta",
    ],
  },
  { id: "allin", cardIds: ALL_CARDS.map((c) => c.id) },
];

export function getCard(id: string): GameCard | undefined {
  return ALL_CARDS.find((c) => c.id === id);
}

export function getPackCardIds(pack: PackId): string[] {
  return PACKS.find((p) => p.id === pack)?.cardIds ?? [];
}
