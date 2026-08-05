// Types for the Baraja Española multiplayer game engine.

export type Palo = "oros" | "copas" | "espadas" | "bastos";
export const PALOS: readonly Palo[] = ["oros", "copas", "espadas", "bastos"];
// 40-card deck: values 1-7, 10-12 (8 and 9 omitted)
export const VALORES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export interface BarajaNaipe {
  id: string;    // e.g. "oros-1", "copas-12"
  palo: Palo;
  valor: number;
}

// ── Player stored in room (hand is private) ───────────────────────────────────
export interface BarajaPlayer {
  id: string;
  name: string;
  avatar: string;
  hand: string[];     // card IDs
  connected: boolean;
  lastSeen: number;
}

// ── Public player info sent to all clients ────────────────────────────────────
export interface BarajaPlayerPublic {
  id: string;
  name: string;
  avatar: string;
  handCount: number;
  connected: boolean;
}

// ── Las Apuestas ──────────────────────────────────────────────────────────────

export interface ApuestasTrickCard {
  playerId: string;
  cardId: string;
}

export interface ApuestasRound {
  roundNum: number;         // 5 downto 1
  cardsDealt: number;       // == roundNum
  /** bettingOrder[0] = mano (left of dealer); dealer is last */
  bettingOrder: string[];
  bettingIdx: number;       // index of next bettor
  bets: Record<string, number>;
  betsDone: boolean;
  currentTrick: ApuestasTrickCard[];
  trickLeader: string;      // who leads current trick (mano for first trick, winner thereafter)
  bazasWon: Record<string, number>;
  tricksDone: number;
  /** Round 1 only: playerId → cardId, visible to everyone EXCEPT the owner */
  foreheadCards: Record<string, string>;
}

export interface ApuestasState {
  type: "apuestas";
  phase: "betting" | "playing" | "scoring" | "ended";
  roundNum: number;
  totalRounds: number;
  currentRound: ApuestasRound;
  scores: Record<string, number>;
  lives: Record<string, number>;
  /** Shuffled once at game start; never changes. */
  playerOrder: string[];
  /** Index into playerOrder of the current dealer; rotates left each round. */
  dealerIdx: number;
  gameStartedAt: number;
}

// ── El Mentiroso ──────────────────────────────────────────────────────────────

export interface MentirosoPlay {
  playerId: string;
  count: number;
  declaredValue: number;
  cardIds: string[];    // revealed only when challenged
  timestamp: number;
}

export interface MentirosoState {
  type: "mentiroso";
  phase: "playing" | "ended";
  playerOrder: string[];
  currentIdx: number;
  declaredValue: number;  // current value players must declare
  pile: string[];          // cards on table (face down)
  lastPlay: MentirosoPlay | null;
  winner: string | null;
  log: string[];
}

// ── Generic Baraja Room ───────────────────────────────────────────────────────

export type BarajaGameId = string;
export type BarajaGameState = ApuestasState | MentirosoState;
export type BGameResult<T = { room: BarajaRoom }> =
  | T
  | { error: string };

export interface BarajaRoom {
  code: string;
  gameId: BarajaGameId;
  gameTitle: string;
  status: "lobby" | "active" | "ended";
  ownerId: string;
  players: BarajaPlayer[];
  drawPile: string[];
  gameState: BarajaGameState | null;
  log: string[];
  version: number;
  createdAt: number;
}

/** Serialized state sent to each client (hand is filtered). */
export interface BarajaRoomState {
  code: string;
  gameId: BarajaGameId;
  gameTitle: string;
  status: "lobby" | "active" | "ended";
  ownerId: string;
  players: BarajaPlayerPublic[];
  myHand: BarajaNaipe[];
  gameState: BarajaGameState | null;
  log: string[];
  version: number;
}
