export type CardCategory =
  | "reto"
  | "beber"
  | "ligar"
  | "fisico"
  | "poder"
  | "social";

export type CardTag = "abstemio" | "pareja" | "hardcore";

export type PackId =
  | "banco"
  | "after"
  | "tercer-tiempo"
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
  /** Si true, el reto es secreto (modo Infiltrado: si nadie lo descubre, x3 puntos). */
  secret?: boolean;
}

/** Estado del reto en el "Tribunal del Caos". */
export type ThrowStatus =
  | "pending"      // recibido, pendiente de aceptar/rechazar/marcar hecho
  | "verifying"    // marcado como hecho, esperando votos del grupo
  | "resolved";    // ya cerrado (no debería persistirse, se elimina)

/** Voto en la verificación de un reto: true = sí lo hizo, false = no lo hizo. */
export interface VerificationVote {
  voterId: string;
  ok: boolean;
}

export interface PendingThrow {
  id: string;
  fromPlayerId: string;
  fromName: string;
  toPlayerId: string;
  cardId: string;
  card: GameCard;
  createdAt: number;
  status: ThrowStatus;
  /** Votos contra el reto en modo pánico. */
  panicAgainst: string[];
  /** Deadline ms del pánico (2 min desde lanzamiento). */
  panicEndsAt: number;
  /** Votos de verificación cuando el reto está en `verifying`. */
  verifyVotes: VerificationVote[];
  /** Deadline ms de la verificación (10 min desde "Hecho"). */
  verifyEndsAt: number;
  /** URL de prueba subida por el Fotógrafo (opcional). */
  evidenceUrl?: string;
  /** Marcado como secreto al lanzar (modo infiltrado). */
  secret?: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
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
  packs?: PackId[];
  status: "lobby" | "active" | "ended";
  players: RoomPlayer[];
  log: string[];
  myHand: GameCard[];
  myInbox: PendingThrow[];
  /** Retos en verificación de cualquier jugador (para el Tribunal). */
  tribunal: PendingThrow[];
  cooldowns: Record<string, number>;
  version: number;
  silentUntil: number;
  customCards: GameCard[];
  trophies: Trophy[];
  endedAt: number;
}

// ----- Internal (what is stored in supabase JSONB) -----

export interface PlayerInternal {
  avatar?: string;
  role?: string;
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
  packs?: PackId[];
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
