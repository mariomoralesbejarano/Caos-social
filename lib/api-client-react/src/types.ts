export type CardCategory =
  | "reto"
  | "beber"
  | "ligar"
  | "fisico"
  | "poder"
  | "social";

export type CardTag = "abstemio" | "pareja" | "hardcore";

export type PackId =
  | "clasico"
  | "discoteca"
  | "cena"
  | "gimnasio"
  | "allin"
  | "tardeo"
  | "feria"
  | "familiar"
  | "noche"
  | "estrategico";

export interface GameCard {
  id: string;
  title: string;
  effect: string;
  power: string;
  category: CardCategory;
  points: number;
  blockedBy?: CardTag[];
  isPower?: boolean;
  pack?: PackId;
  custom?: boolean;
}

export interface PendingThrow {
  id: string;
  fromPlayerId: string;
  fromName: string;
  toPlayerId: string;
  cardId: string;
  card: GameCard;
  createdAt: number;
  panicAgainst: string[];
}

export interface RoomPlayer {
  id: string;
  name: string;
  tags: CardTag[];
  handCount: number;
  score: number;
  multiplier: number;
  shieldUntil: number;
  challengesCompleted: number;
  connected: boolean;
}

export interface Trophy {
  playerId: string;
  playerName: string;
  title: string;
  description: string;
  emoji: string;
}

export interface RoomState {
  code: string;
  ownerId: string;
  pack: PackId;
  status: "lobby" | "active" | "ended";
  players: RoomPlayer[];
  log: string[];
  myHand: GameCard[];
  myInbox: PendingThrow[];
  cooldowns: Record<string, number>;
  version: number;
  silentUntil: number;
  customCards: GameCard[];
  trophies: Trophy[];
  endedAt: number;
}

// ----- Internal (what is stored in supabase JSONB) -----

export interface PlayerInternal {
  id: string;
  name: string;
  tags: CardTag[];
  hand: string[];
  inbox: PendingThrow[];
  score: number;
  multiplier: number;
  shieldUntil: number;
  challengesCompleted: number;
  challengesRejected: number;
  cardsThrown: number;
  powersUsed: number;
  panicShield: boolean;
  lastSeen: number;
}

export interface Room {
  code: string;
  ownerId: string;
  pack: PackId;
  status: "lobby" | "active" | "ended";
  players: PlayerInternal[];
  drawPile: string[];
  cooldowns: Record<string, number>;
  log: string[];
  customCards: GameCard[];
  silentUntil: number;
  trophies: Trophy[];
  endedAt: number;
  createdAt: number;
  version: number;
}

export type RespondAction =
  | "accept"
  | "reject"
  | "reversa"
  | "espejo"
  | "bloqueo"
  | "robo-carta"
  | "comodin";
