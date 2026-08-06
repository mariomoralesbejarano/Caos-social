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

// ── Texas Hold'em ────────────────────────────────────────────────────────────

export type PokerSuit = "spades" | "hearts" | "diamonds" | "clubs";
export type PokerRank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface PokerCard {
  id: string;
  suit: PokerSuit;
  rank: PokerRank;
}

export type PokerStreet = "preflop" | "flop" | "turn" | "river" | "showdown";
export type PokerActionKind = "fold" | "check" | "call" | "raise";

export interface PokerAction {
  playerId: string;
  action: PokerActionKind;
  amount: number;
  timestamp: number;
}

export interface PokerHandResult {
  playerId: string;
  category: string;
  categoryRank: number;
  tiebreaker: number[];
  cards: string[];
}

export interface PokerState {
  type: "poker";
  phase: "playing" | "showdown" | "ended";
  street: PokerStreet;
  dealerIdx: number;
  playerOrder: string[];
  smallBlind: number;
  bigBlind: number;
  smallBlindId: string;
  bigBlindId: string;
  currentIdx: number;
  board: string[];
  pot: number;
  currentBet: number;
  minRaise: number;
  stacks: Record<string, number>;
  folded: string[];
  streetBets: Record<string, number>;
  contributions: Record<string, number>;
  acted: string[];
  actions: PokerAction[];
  winnerIds: string[];
  handResults: PokerHandResult[];
  showdownHands: Record<string, string[]>;
  payouts: Record<string, number>;
  hands: Record<string, string[]>;
  deck: string[];
  deckPos: number;
  roundNumber: number;
}

// ── Parchís ───────────────────────────────────────────────────────────────────

export type ParchisColor = "rojo" | "amarillo" | "verde" | "azul";
export type ParchisPiecePosition = -1 | number;

export interface ParchisState {
  type: "parchis";
  phase: "playing" | "ended";
  playerOrder: string[];
  colors: Record<string, ParchisColor>;
  currentIdx: number;
  dice: number | null;
  lastDice: number | null;
  canMove: boolean;
  pieces: Record<string, number[]>;
  consecutiveSixes: number;
  lastMove: string | null;
  winnerId: string | null;
}

// ── La Oca ────────────────────────────────────────────────────────────────────

export interface OcaState {
  type: "oca";
  phase: "playing" | "ended";
  playerOrder: string[];
  colors: Record<string, string>;
  currentIdx: number;
  positions: Record<string, number>;
  dice: [number, number] | null;
  lastDice: [number, number] | null;
  turnsToSkip: Record<string, number>;
  lastMove: string | null;
  winnerId: string | null;
}

// ── Blackjack 21 ──────────────────────────────────────────────────────────────

export type BlackjackHandStatus = "playing" | "stood" | "bust" | "blackjack" | "won" | "lost" | "push";

export interface BlackjackHand {
  cards: string[];
  bet: number;
  status: BlackjackHandStatus;
  doubled: boolean;
  split: boolean;
  payout: number;
}

export interface BlackjackState {
  type: "blackjack";
  phase: "playing" | "dealer" | "ended";
  playerOrder: string[];
  currentIdx: number;
  dealerHand: string[];
  hands: Record<string, BlackjackHand[]>;
  stacks: Record<string, number>;
  deck: string[];
  deckPos: number;
  winnerIds: string[];
  lastMove: string | null;
  roundNumber: number;
}

// ── Traditional Spanish card tables ──────────────────────────────────────────

export type TraditionalGameId =
  | "culo"
  | "mico"
  | "pesca"
  | "cuatrola"
  | "tute"
  | "7ymedio"
  | "chinchon"
  | "burro"
  | "escoba"
  | "brisca"
  | "remigio"
  | "chanchullo"
  | "golfo"
  | "cauca"
  | "rueda"
  | "cinquillo"
  | "pocha"
  | "relojito";

export interface TraditionalState {
  type: "traditional";
  variant: TraditionalGameId;
  phase: "playing" | "ended";
  playerOrder: string[];
  currentIdx: number;
  hands: Record<string, string[]>;
  drawPile: string[];
  discardPile: string[];
  playedCards: string[];
  winnerId: string | null;
  lastMove: string | null;
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

export interface ApuestasRoundResult {
  playerId: string;
  predicted: number;
  actual: number;
  difference: number;
  livesBefore: number;
  livesAfter: number;
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
  /** Results from the most recently completed round, shown in the scoreboard. */
  lastRoundResults: ApuestasRoundResult[];
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
  /** False until the opening player chooses the first value freely. */
  firstPlayDone?: boolean;
  pile: string[];          // cards on table (face down)
  lastPlay: MentirosoPlay | null;
  winner: string | null;
  log: string[];
}

// ── Generic Baraja Room ───────────────────────────────────────────────────────

export type BarajaGameId = string;
export type BarajaGameState =
  | ApuestasState
  | MentirosoState
  | PokerState
  | ParchisState
  | OcaState
  | BlackjackState
  | TraditionalState;
export type BGameResult<T = { room: BarajaRoom }> =
  | T
  | { error: string };

export interface BarajaRoom {
  code: string;
  gameId: BarajaGameId;
  gameTitle: string;
  status: "lobby" | "active" | "ended";
  ownerId: string;
  /** Starting lives for Las Apuestas; old rooms default to 5. */
  livesPerPlayer?: 3 | 5;
  /** Optional table configuration used by configurable multiplayer games. */
  tableConfig?: {
    startingStack?: number;
    smallBlind?: number;
    bigBlind?: number;
    maxPlayers?: number;
  };
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
  livesPerPlayer?: 3 | 5;
  tableConfig?: {
    startingStack?: number;
    smallBlind?: number;
    bigBlind?: number;
    maxPlayers?: number;
  };
  players: BarajaPlayerPublic[];
  myHand: BarajaNaipe[];
  myPokerHand: PokerCard[];
  myBlackjackHands: BlackjackHand[];
  gameState: BarajaGameState | null;
  log: string[];
  version: number;
}
