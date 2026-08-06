// Pure game logic for the Baraja Española engine.
// No side effects — every function takes state, returns new state.

import type {
  ApuestasRound,
  ApuestasRoundResult,
  ApuestasState,
  BarajaGameId,
  BarajaNaipe,
  BarajaPlayer,
  BarajaPlayerPublic,
  BarajaRoom,
  BarajaRoomState,
  BGameResult,
  MentirosoState,
  OcaState,
  ParchisColor,
  ParchisState,
  PokerCard,
  PokerState,
  Palo,
} from "./barajaTypes";
import { PALOS, VALORES } from "./barajaTypes";
import { getPokerCard, initPoker } from "./pokerGame";

const PARCHIS_COLORS: ParchisColor[] = ["rojo", "amarillo", "verde", "azul"];
const OCA_COLORS = ["rojo", "amarillo", "verde", "azul", "morado", "naranja"];
const PARCHIS_SAFE_TRACKS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const OCA_POSITIONS = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];

function initParchis(room: BarajaRoom): ParchisState {
  const playerOrder = room.players.map((player) => player.id);
  const colors: Record<string, ParchisColor> = {};
  const pieces: Record<string, number[]> = {};
  playerOrder.forEach((id, index) => {
    colors[id] = PARCHIS_COLORS[index];
    pieces[id] = [-1, -1, -1, -1];
  });
  return {
    type: "parchis",
    phase: "playing",
    playerOrder,
    colors,
    currentIdx: 0,
    dice: null,
    lastDice: null,
    canMove: false,
    pieces,
    consecutiveSixes: 0,
    lastMove: null,
    winnerId: null,
  };
}

function initOca(room: BarajaRoom): OcaState {
  const playerOrder = room.players.map((player) => player.id);
  const colors: Record<string, string> = {};
  const positions: Record<string, number> = {};
  const turnsToSkip: Record<string, number> = {};
  playerOrder.forEach((id, index) => {
    colors[id] = OCA_COLORS[index];
    positions[id] = 0;
    turnsToSkip[id] = 0;
  });
  return {
    type: "oca",
    phase: "playing",
    playerOrder,
    colors,
    currentIdx: 0,
    positions,
    dice: null,
    lastDice: null,
    turnsToSkip,
    lastMove: null,
    winnerId: null,
  };
}

function nextPlayer(currentIdx: number, length: number): number {
  return (currentIdx + 1) % length;
}

function parchisTrackPosition(color: ParchisColor, progress: number): number {
  const offsets: Record<ParchisColor, number> = {
    rojo: 0, amarillo: 13, verde: 26, azul: 39,
  };
  return (offsets[color] + progress) % 52;
}

function parchisOccupied(
  gs: ParchisState,
  ignorePlayerId?: string,
): Map<number, { playerId: string; count: number }> {
  const occupied = new Map<number, { playerId: string; count: number }>();
  for (const playerId of gs.playerOrder) {
    if (playerId === ignorePlayerId) continue;
    for (const piece of gs.pieces[playerId] ?? []) {
      if (piece < 1 || piece >= 68) continue;
      const track = parchisTrackPosition(gs.colors[playerId], piece);
      const current = occupied.get(track);
      occupied.set(track, { playerId, count: (current?.count ?? 0) + 1 });
    }
  }
  return occupied;
}

function canMoveParchis(
  gs: ParchisState,
  playerId: string,
  pieceIndex: number,
  dice: number,
): boolean {
  const piece = gs.pieces[playerId]?.[pieceIndex];
  if (piece === undefined) return false;
  if (piece === -1 && dice !== 5) return false;
  const target = piece === -1 ? 1 : piece + dice;
  if (target > 68) return false;
  if (target >= 68) return target === 68;
  const occupied = parchisOccupied(gs, playerId);
  const targetTrack = parchisTrackPosition(gs.colors[playerId], target);
  const targetOccupant = occupied.get(targetTrack);
  if (targetOccupant && targetOccupant.count >= 2) return false;
  const barriers = new Set<number>();
  const all = parchisOccupied(gs);
  for (const [track, occupant] of all) {
    if (occupant.count >= 2) barriers.add(track);
  }
  const start = piece === -1 ? 0 : piece;
  for (let progress = Math.max(1, start + 1); progress < target; progress++) {
    if (barriers.has(parchisTrackPosition(gs.colors[playerId], progress))) return false;
  }
  return true;
}

export function applyParchisRoll(
  room: BarajaRoom,
  playerId: string,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as ParchisState | null;
  if (!gs || gs.type !== "parchis") return { error: "Estado de Parchís incorrecto" };
  if (gs.phase !== "playing") return { error: "La partida ha terminado" };
  if (gs.playerOrder[gs.currentIdx] !== playerId) return { error: "No es tu turno" };
  if (gs.dice !== null) return { error: "Ya has tirado el dado" };
  const value = Math.floor(Math.random() * 6) + 1;
  gs.dice = value;
  gs.lastDice = value;
  const color = gs.colors[playerId];
  gs.canMove = gs.pieces[playerId].some((_, index) =>
    canMoveParchis(gs, playerId, index, value),
  );
  gs.consecutiveSixes = value === 6 ? gs.consecutiveSixes + 1 : 0;
  gs.lastMove = `${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} sacó un ${value}`;
  if (!gs.canMove) {
    gs.dice = null;
    if (value === 6 && gs.consecutiveSixes < 3) {
      gs.consecutiveSixes = gs.consecutiveSixes;
    } else {
      gs.currentIdx = nextPlayer(gs.currentIdx, gs.playerOrder.length);
      gs.consecutiveSixes = 0;
    }
  }
  room.version += 1;
  room.log.push(gs.lastMove);
  return { room };
}

export function applyParchisMove(
  room: BarajaRoom,
  playerId: string,
  pieceIndex: number,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as ParchisState | null;
  if (!gs || gs.type !== "parchis") return { error: "Estado de Parchís incorrecto" };
  if (gs.playerOrder[gs.currentIdx] !== playerId || gs.dice === null) return { error: "Tira el dado primero" };
  const pieces = gs.pieces[playerId] ?? [];
  const piece = pieces[pieceIndex];
  if (piece === undefined) return { error: "Ficha no válida" };
  const dice = gs.dice;
  if (!canMoveParchis(gs, playerId, pieceIndex, dice)) return { error: "Esa ficha no puede moverse" };
  let next = piece === -1 ? 1 : piece + dice;
  pieces[pieceIndex] = next;
  const color = gs.colors[playerId];
  const track = parchisTrackPosition(color, next);
  let captured = false;
  for (const otherId of gs.playerOrder) {
    if (otherId === playerId) continue;
    const otherColor = gs.colors[otherId];
    gs.pieces[otherId] = gs.pieces[otherId].map((otherPiece) => {
      if (otherPiece < 1 || otherPiece >= 68) return otherPiece;
      if (
        parchisTrackPosition(otherColor, otherPiece) !== track ||
        PARCHIS_SAFE_TRACKS.has(track)
      ) return otherPiece;
      captured = true;
      return -1;
    });
  }
  if (captured && next + 20 <= 68) next += 20;
  if (captured) pieces[pieceIndex] = next;
  const reachedGoal = next === 68;
  if (reachedGoal) {
    const bonusIndex = pieces.findIndex((position, index) =>
      index !== pieceIndex && position >= 0 && position < 58 &&
      canMoveParchis(gs, playerId, index, 10),
    );
    if (bonusIndex >= 0) pieces[bonusIndex] += 10;
  }
  const won = pieces.every((position) => position >= 68);
  gs.winnerId = won ? playerId : null;
  gs.phase = won ? "ended" : "playing";
  const extraTurn = dice === 6 && gs.consecutiveSixes < 3;
  gs.dice = null;
  gs.canMove = false;
  if (!extraTurn && !won) {
    gs.currentIdx = nextPlayer(gs.currentIdx, gs.playerOrder.length);
    gs.consecutiveSixes = 0;
  }
  gs.lastMove = `${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} movió su ficha ${pieceIndex + 1}`;
  room.version += 1;
  room.log.push(gs.lastMove);
  return { room };
}

function ocaSpecial(position: number): { next?: number; skip?: number; reset?: boolean; extraTurn?: boolean } {
  const ocaIndex = OCA_POSITIONS.indexOf(position);
  if (ocaIndex >= 0 && ocaIndex < OCA_POSITIONS.length - 1) {
    return { next: OCA_POSITIONS[ocaIndex + 1], extraTurn: true };
  }
  if (position === 6) return { next: 12, extraTurn: true };
  if (position === 19) return { skip: 1 };
  if (position === 31) return { skip: 1 };
  if (position === 42) return { next: 30 };
  if (position === 56) return { skip: 2 };
  if (position === 58) return { reset: true };
  return {};
}

function ocaDestination(start: number, steps: number): number {
  const target = start + steps;
  return target <= 63 ? target : 63 - (target - 63);
}

export function applyOcaRoll(
  room: BarajaRoom,
  playerId: string,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as OcaState | null;
  if (!gs || gs.type !== "oca") return { error: "Estado de La Oca incorrecto" };
  if (gs.phase !== "playing") return { error: "La partida ha terminado" };
  if (gs.playerOrder[gs.currentIdx] !== playerId) return { error: "No es tu turno" };
  if (gs.dice) return { error: "Ya has tirado" };
  const first = Math.floor(Math.random() * 6) + 1;
  const second = Math.floor(Math.random() * 6) + 1;
  gs.dice = [first, second];
  gs.lastDice = [first, second];
  const player = room.players.find((p) => p.id === playerId)?.name ?? "Jugador";
  let extraTurn = false;
  if ((gs.turnsToSkip[playerId] ?? 0) > 0) {
    gs.turnsToSkip[playerId] -= 1;
    gs.lastMove = `${player} pierde turno`;
  } else {
    const start = gs.positions[playerId];
    let position = ocaDestination(start, first + second);
    const special = ocaSpecial(position);
    extraTurn = special.extraTurn ?? false;
    if (special.reset) position = 1;
    if (special.next) position = Math.min(63, special.next);
    gs.positions[playerId] = position;
    if (special.skip) gs.turnsToSkip[playerId] = special.skip;
    gs.lastMove = `${player} avanzó a la casilla ${position}`;
    if (position === 63) {
      gs.phase = "ended";
      gs.winnerId = playerId;
    }
  }
  gs.dice = null;
  if (gs.phase !== "ended" && !extraTurn) {
    gs.currentIdx = nextPlayer(gs.currentIdx, gs.playerOrder.length);
  }
  room.version += 1;
  room.log.push(gs.lastMove);
  return { room };
}

// ─── Deck helpers ─────────────────────────────────────────────────────────────

export function createDeck(): BarajaNaipe[] {
  const deck: BarajaNaipe[] = [];
  for (const palo of PALOS) {
    for (const valor of VALORES) {
      deck.push({ id: `${palo}-${valor}`, palo, valor });
    }
  }
  return deck;
}

const _deckMap: Map<string, BarajaNaipe> = new Map(
  createDeck().map((c) => [c.id, c]),
);

export function getBarajaCard(id: string): BarajaNaipe | null {
  return _deckMap.get(id) ?? null;
}

/** Fisher-Yates shuffle — returns a NEW array */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function generateBarajaCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

// ─── Card rank for trick resolution ──────────────────────────────────────────
// As > 3 > Rey(12) > Caballo(11) > Sota(10) > 7 > 6 > 5 > 4 > 2

const RANK: Record<number, number> = {
  1: 10, 3: 9, 12: 8, 11: 7, 10: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1,
};
function cardRank(valor: number): number {
  return RANK[valor] ?? 0;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const PALO_EMOJI: Record<Palo, string> = {
  oros: "🟡", copas: "🍷", espadas: "⚔️", bastos: "🪵",
};

const VALOR_LABEL: Record<number, string> = {
  1: "As", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
  10: "Sota", 11: "Caballo", 12: "Rey",
};

export function cardLabel(id: string): string {
  const c = getBarajaCard(id);
  if (!c) return id;
  return `${PALO_EMOJI[c.palo]} ${VALOR_LABEL[c.valor]}`;
}

export function valorLabel(v: number): string {
  const labels: Record<number, string> = {
    1: "Ases", 2: "Doses", 3: "Treses", 4: "Cuatros", 5: "Cincos",
    6: "Seises", 7: "Sietes", 10: "Sotas", 11: "Caballos", 12: "Reyes",
  };
  return labels[v] ?? String(v);
}

// ─── Serialise room for client ────────────────────────────────────────────────

export function serializeBarajaRoom(
  room: BarajaRoom,
  playerId: string,
): BarajaRoomState {
  const me = room.players.find((p) => p.id === playerId);

  // Determine if this is the "forehead" round (round 1 of Las Apuestas)
  const gs = room.gameState;
  const isForehead =
    gs?.type === "apuestas" &&
    (gs.phase === "betting" || gs.phase === "playing") &&
    gs.currentRound.roundNum === 1;

  const myHand: BarajaNaipe[] = isForehead
    ? [] // player cannot see their own card
    : (me?.hand ?? [])
        .map((id) => getBarajaCard(id))
        .filter((c): c is BarajaNaipe => !!c);

  const myPokerHand: PokerCard[] =
    gs?.type === "poker"
      ? (gs.hands[playerId] ?? [])
          .map((id) => getPokerCard(id))
          .filter((card): card is PokerCard => !!card)
      : [];

  // Mask private game data before sending the state to a player.
  let serializedGs = gs;
  if (
    isForehead &&
    gs?.type === "apuestas" &&
    gs.currentRound.foreheadCards[playerId]
  ) {
    const gsClone: ApuestasState = JSON.parse(JSON.stringify(gs));
    delete gsClone.currentRound.foreheadCards[playerId];
    serializedGs = gsClone;
  }
  if (gs?.type === "poker") {
    const pokerClone: PokerState = JSON.parse(JSON.stringify(gs));
    pokerClone.hands = {};
    pokerClone.deck = [];
    serializedGs = pokerClone;
  }

  const players: BarajaPlayerPublic[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    handCount: gs?.type === "poker"
      ? (gs.hands[p.id]?.length ?? 0)
      : p.hand.length,
    connected: p.connected,
  }));

  return {
    code: room.code,
    gameId: room.gameId,
    gameTitle: room.gameTitle,
    status: room.status,
    ownerId: room.ownerId,
    livesPerPlayer: room.livesPerPlayer,
    tableConfig: room.tableConfig,
    players,
    myHand,
    myPokerHand,
    gameState: serializedGs ?? null,
    log: room.log.slice(-30), // last 30 events
    version: room.version,
  };
}

// ─── Room creation ────────────────────────────────────────────────────────────

export function createBarajaRoom(opts: {
  code: string;
  gameId: BarajaGameId;
  gameTitle: string;
  playerId: string;
  name: string;
  avatar: string;
  livesPerPlayer?: 3 | 5;
  tableConfig?: BarajaRoom["tableConfig"];
}): BarajaRoom {
  return {
    code: opts.code.toUpperCase(),
    gameId: opts.gameId,
    gameTitle: opts.gameTitle,
    status: "lobby",
    ownerId: opts.playerId,
    livesPerPlayer: opts.livesPerPlayer ?? 5,
    tableConfig: opts.tableConfig,
    players: [
      {
        id: opts.playerId,
        name: opts.name,
        avatar: opts.avatar,
        hand: [],
        connected: true,
        lastSeen: Date.now(),
      },
    ],
    drawPile: [],
    gameState: null,
    log: [`${opts.name} creó la sala`],
    version: 1,
    createdAt: Date.now(),
  };
}

// ─── Join ─────────────────────────────────────────────────────────────────────

export function applyBarajaJoin(
  room: BarajaRoom,
  name: string,
  avatar: string,
): BGameResult<{ room: BarajaRoom; playerId: string }> {
  if (room.status !== "lobby") return { error: "La sala ya está en partida" };
  const maxPlayers = room.tableConfig?.maxPlayers ?? 8;
  if (room.players.length >= maxPlayers) return { error: `Sala llena (máx ${maxPlayers} jugadores)` };

  // Rejoin by name
  const existing = room.players.find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    existing.connected = true;
    existing.lastSeen = Date.now();
    room.version += 1;
    return { room: { ...room }, playerId: existing.id };
  }

  const playerId = uid();
  room.players.push({
    id: playerId,
    name,
    avatar,
    hand: [],
    connected: true,
    lastSeen: Date.now(),
  });
  room.version += 1;
  room.log.push(`${name} se unió`);
  return { room: { ...room }, playerId };
}

// ─── Start game ───────────────────────────────────────────────────────────────

export function applyBarajaStartGame(
  room: BarajaRoom,
  playerId: string,
): BGameResult<{ room: BarajaRoom }> {
  if (room.ownerId !== playerId) return { error: "Solo el host puede iniciar" };
  if (room.status !== "lobby") return { error: "Ya está en partida" };
  if (room.players.length < 2) return { error: "Mínimo 2 jugadores" };

  if (room.gameId === "apuestas") {
    room.gameState = initApuestas(room);
  } else if (room.gameId === "mentiroso") {
    room.gameState = initMentiroso(room);
  } else if (room.gameId === "poker") {
    room.gameState = initPoker(room);
  } else if (room.gameId === "parchis") {
    room.gameState = initParchis(room);
  } else if (room.gameId === "oca") {
    room.gameState = initOca(room);
  }

  room.status = "active";
  room.version += 1;
  room.log.push("🃏 ¡Juego iniciado!");
  return { room };
}

// ─── LAS APUESTAS ─────────────────────────────────────────────────────────────

function initApuestas(room: BarajaRoom): ApuestasState {
  const playerOrder = shuffle(room.players.map((p) => p.id));
  const scores: Record<string, number> = {};
  const lives: Record<string, number> = {};
  for (const p of room.players) {
    scores[p.id] = 0;
    lives[p.id] = room.livesPerPlayer ?? 5;
  }
  // Dealer starts at index 0; mano (left of dealer) starts first
  const dealerIdx = 0;
  const currentRound = buildApuestasRound(room.players, playerOrder, 5, dealerIdx);
  return {
    type: "apuestas",
    phase: "betting",
    roundNum: 5,
    totalRounds: 5,
    currentRound,
    scores,
    lives,
    playerOrder,
    dealerIdx,
    lastRoundResults: [],
    gameStartedAt: Date.now(),
  };
}

/**
 * Build a new round.
 * dealerIdx = index in playerOrder of the current dealer (postre).
 * mano (first to bet and lead first trick) = (dealerIdx + 1) % n.
 */
function buildApuestasRound(
  players: BarajaPlayer[],
  playerOrder: string[],
  roundNum: number,
  dealerIdx: number,
): ApuestasRound {
  const deck = shuffle(createDeck().map((c) => c.id));
  let ptr = 0;

  for (const pid of playerOrder) {
    const p = players.find((x) => x.id === pid)!;
    p.hand = deck.slice(ptr, ptr + roundNum);
    ptr += roundNum;
  }

  // Round 1: forehead cards
  const foreheadCards: Record<string, string> = {};
  if (roundNum === 1) {
    for (const pid of playerOrder) {
      const p = players.find((x) => x.id === pid)!;
      if (p.hand[0]) foreheadCards[pid] = p.hand[0];
    }
  }

  const n = playerOrder.length;
  const manoIdx = (dealerIdx + 1) % n;

  // Betting order: starts from mano, dealer (postre) is last
  const bettingOrder = [
    ...playerOrder.slice(manoIdx),
    ...playerOrder.slice(0, manoIdx),
  ];

  // First trick leader = mano
  const trickLeader = playerOrder[manoIdx];

  const bazasWon: Record<string, number> = {};
  for (const pid of playerOrder) bazasWon[pid] = 0;

  return {
    roundNum,
    cardsDealt: roundNum,
    bettingOrder,
    bettingIdx: 0,
    bets: {},
    betsDone: false,
    currentTrick: [],
    trickLeader,
    bazasWon,
    tricksDone: 0,
    foreheadCards,
  };
}

// ── Place bet ─────────────────────────────────────────────────────────────────

export function applyApuestasBet(
  room: BarajaRoom,
  playerId: string,
  bet: number,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as ApuestasState | null;
  if (!gs || gs.type !== "apuestas") return { error: "Estado incorrecto" };
  if (gs.phase !== "betting") return { error: "No es la fase de apuestas" };
  const r = gs.currentRound;
  if (r.bettingOrder[r.bettingIdx] !== playerId)
    return { error: "No es tu turno de apostar" };
  if (bet < 0 || bet > r.cardsDealt)
    return { error: `La apuesta debe estar entre 0 y ${r.cardsDealt}` };

  // Last bettor constraint: sum cannot equal cardsDealt
  if (r.bettingIdx === r.bettingOrder.length - 1) {
    const sumOthers = Object.values(r.bets).reduce((a, b) => a + b, 0);
    if (bet === r.cardsDealt - sumOthers)
      return {
        error: `No puedes apostar ${bet} (la suma total no puede ser exactamente ${r.cardsDealt})`,
      };
  }

  r.bets[playerId] = bet;
  r.bettingIdx += 1;
  const name = room.players.find((p) => p.id === playerId)?.name ?? playerId;
  room.log.push(`${name} apuesta ${bet} baza${bet !== 1 ? "s" : ""}`);

  if (r.bettingIdx >= r.bettingOrder.length) {
    r.betsDone = true;
    gs.phase = "playing";
  }

  room.version += 1;
  return { room };
}

// ── Play card ─────────────────────────────────────────────────────────────────

export function applyApuestasPlayCard(
  room: BarajaRoom,
  playerId: string,
  cardId: string,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as ApuestasState | null;
  if (!gs || gs.type !== "apuestas") return { error: "Estado incorrecto" };
  if (gs.phase !== "playing") return { error: "No es la fase de juego" };

  const r = gs.currentRound;
  const played = new Set(r.currentTrick.map((c) => c.playerId));
  const order = getTrickOrder(r);
  const nextPlayer = order.find((pid) => !played.has(pid));
  if (nextPlayer !== playerId) return { error: "No es tu turno" };

  const player = room.players.find((p) => p.id === playerId)!;
  if (!player.hand.includes(cardId)) return { error: "No tienes esa carta" };

  player.hand = player.hand.filter((id) => id !== cardId);
  r.currentTrick.push({ playerId, cardId });
  room.log.push(`${player.name} juega ${cardLabel(cardId)}`);

  // Trick complete?
  if (r.currentTrick.length === gs.playerOrder.length) {
    const winnerId = resolveTrick(r.currentTrick);
    r.bazasWon[winnerId] = (r.bazasWon[winnerId] ?? 0) + 1;
    r.tricksDone += 1;
    // Winner of trick leads the next one
    r.trickLeader = winnerId;
    const wName = room.players.find((p) => p.id === winnerId)?.name ?? winnerId;
    room.log.push(`${wName} gana la baza`);
    r.currentTrick = [];

    // Round over?
    if (r.tricksDone >= r.cardsDealt) {
      const roundResults = scoreApuestasRound(gs, room.players);
      gs.lastRoundResults = roundResults;
      for (const result of roundResults) {
        const name = room.players.find((p) => p.id === result.playerId)?.name ?? result.playerId;
        room.log.push(
          result.difference === 0
            ? `✅ ${name}: ${result.predicted} apostadas / ${result.actual} ganadas · acierto exacto · 0 vidas`
            : `❌ ${name}: ${result.predicted} apostadas / ${result.actual} ganadas · −1 vida`,
        );
      }
      room.log.push("📊 Fin de ronda");

      const allOut = gs.playerOrder.every((pid) => (gs.lives[pid] ?? 0) <= 0);
      if (allOut || gs.roundNum <= 1) {
        gs.phase = "ended";
        room.status = "ended";
        room.log.push("🏆 Fin del juego");
      } else {
        gs.roundNum -= 1;
        // Rotate dealer to the left
        const newDealerIdx = (gs.dealerIdx + 1) % gs.playerOrder.length;
        gs.dealerIdx = newDealerIdx;
        gs.currentRound = buildApuestasRound(
          room.players,
          gs.playerOrder,
          gs.roundNum,
          newDealerIdx,
        );
        gs.phase = "betting";
        const newDealer = room.players.find((p) => p.id === gs.playerOrder[newDealerIdx]);
        room.log.push(
          `🃏 Ronda ${gs.roundNum} · ${gs.roundNum} carta${gs.roundNum > 1 ? "s" : ""} · Reparte: ${newDealer?.name ?? ""}`,
        );
      }
    }
  }

  room.version += 1;
  return { room };
}

function getTrickOrder(r: ApuestasRound): string[] {
  const idx = r.bettingOrder.indexOf(r.trickLeader);
  return [
    ...r.bettingOrder.slice(idx),
    ...r.bettingOrder.slice(0, idx),
  ];
}

/**
 * Resolve a trick with pure rank-based rules (no suit following, no trump).
 * Highest rank wins (As > 3 > Rey > Caballo > Sota > 7 > 6 > 5 > 4 > 2).
 * Tiebreak: first card played wins (lower index in trick array).
 */
function resolveTrick(trick: { playerId: string; cardId: string }[]): string {
  let winIdx = 0;
  let winRank = -1;

  for (let i = 0; i < trick.length; i++) {
    const card = getBarajaCard(trick[i].cardId);
    if (!card) continue;
    const rank = cardRank(card.valor);
    // Strictly greater only: on tie, the first player played wins (winIdx unchanged)
    if (rank > winRank) {
      winIdx = i;
      winRank = rank;
    }
  }
  return trick[winIdx].playerId;
}

function scoreApuestasRound(
  gs: ApuestasState,
  players: BarajaPlayer[],
): ApuestasRoundResult[] {
  const r = gs.currentRound;
  const results: ApuestasRoundResult[] = [];
  for (const pid of gs.playerOrder) {
    const predicted = r.bets[pid] ?? 0;
    const actual = r.bazasWon[pid] ?? 0;
    const difference = Math.abs(predicted - actual);
    const livesBefore = gs.lives[pid] ?? 5;
    const livesAfter = Math.max(0, livesBefore - (difference === 0 ? 0 : 1));

    // Las Apuestas uses one strict resource: exact hits cost nothing;
    // every missed trick costs exactly the absolute prediction error.
    gs.lives[pid] = livesAfter;
    gs.scores[pid] = livesAfter;
    results.push({
      playerId: pid,
      predicted,
      actual,
      difference,
      livesBefore,
      livesAfter,
    });
  }
  return results;
}

// ─── EL MENTIROSO ─────────────────────────────────────────────────────────────

function initMentiroso(room: BarajaRoom): MentirosoState {
  const playerOrder = shuffle(room.players.map((p) => p.id));
  const deck = shuffle(createDeck().map((c) => c.id));
  const perPlayer = Math.floor(deck.length / room.players.length);

  for (let i = 0; i < room.players.length; i++) {
    const p = room.players.find((x) => x.id === playerOrder[i])!;
    p.hand = deck.slice(i * perPlayer, (i + 1) * perPlayer);
  }
  // Give leftover to first player
  const leftover = deck.slice(room.players.length * perPlayer);
  if (leftover.length > 0) {
    const first = room.players.find((x) => x.id === playerOrder[0])!;
    first.hand.push(...leftover);
  }

  return {
    type: "mentiroso",
    phase: "playing",
    playerOrder,
    currentIdx: 0,
    declaredValue: 1,
    firstPlayDone: false,
    pile: [],
    lastPlay: null,
    winner: null,
    log: ["🃏 ¡Empieza El Mentiroso! · Primera declaración: Ases"],
  };
}

// ── Play cards ────────────────────────────────────────────────────────────────

export function applyMentirosoPlay(
  room: BarajaRoom,
  playerId: string,
  cardIds: string[],
  declaredValue?: number,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as MentirosoState | null;
  if (!gs || gs.type !== "mentiroso") return { error: "Estado incorrecto" };
  if (gs.phase !== "playing") return { error: "El juego ha terminado" };
  if (gs.playerOrder[gs.currentIdx] !== playerId)
    return { error: "No es tu turno" };
  if (cardIds.length < 1 || cardIds.length > 4)
    return { error: "Debes jugar entre 1 y 4 cartas" };
  const isFirstPlay = gs.firstPlayDone !== true && gs.lastPlay === null && gs.pile.length === 0;
  const playValue = isFirstPlay ? declaredValue : gs.declaredValue;
  if (playValue === undefined || !VALORES.includes(playValue)) {
    return { error: "El primer jugador debe elegir qué valor declara" };
  }
  if (!isFirstPlay && declaredValue !== undefined && declaredValue !== gs.declaredValue) {
    return { error: `Debes declarar ${valorLabel(gs.declaredValue)}` };
  }

  const player = room.players.find((p) => p.id === playerId)!;
  for (const cid of cardIds) {
    if (!player.hand.includes(cid)) return { error: "No tienes esa carta" };
  }

  player.hand = player.hand.filter((id) => !cardIds.includes(id));
  gs.pile.push(...cardIds);
  gs.firstPlayDone = true;

  gs.lastPlay = {
    playerId,
    count: cardIds.length,
    declaredValue: playValue,
    cardIds: [...cardIds],
    timestamp: Date.now(),
  };

  room.log.push(
    `${player.name} pone ${cardIds.length} carta${cardIds.length > 1 ? "s" : ""} (declara: ${valorLabel(playValue)})`,
  );

  autoDiscardPoker(player, gs, room);

  // Advance to next player (skip empty-handed ones)
  gs.currentIdx = (gs.currentIdx + 1) % gs.playerOrder.length;
  let skips = 0;
  while (
    skips < gs.playerOrder.length &&
    (room.players.find((p) => p.id === gs.playerOrder[gs.currentIdx])?.hand.length ?? 0) === 0
  ) {
    gs.currentIdx = (gs.currentIdx + 1) % gs.playerOrder.length;
    skips++;
  }

  // Advance declared value
  const idx = VALORES.indexOf(gs.declaredValue);
  gs.declaredValue = VALORES[(idx + 1) % VALORES.length];

  // Check winner
  if (player.hand.length === 0) {
    gs.winner = playerId;
    gs.phase = "ended";
    room.status = "ended";
    room.log.push(`🏆 ${player.name} gana la partida!`);
  }

  room.version += 1;
  return { room };
}

function autoDiscardPoker(
  player: BarajaPlayer,
  gs: MentirosoState,
  room: BarajaRoom,
): void {
  let discarded = true;
  while (discarded) {
    discarded = false;
    for (const valor of VALORES) {
      const poker = player.hand.filter((id) => getBarajaCard(id)?.valor === valor);
      if (poker.length === 4) {
        player.hand = player.hand.filter((id) => !poker.includes(id));
        gs.pile.push(...poker);
        room.log.push(`${player.name} descarta automáticamente un póker de ${valorLabel(valor)}`);
        discarded = true;
        break;
      }
    }
  }
}

// ── Call bluff ────────────────────────────────────────────────────────────────

export function applyMentirosoCallMentira(
  room: BarajaRoom,
  callerId: string,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as MentirosoState | null;
  if (!gs || gs.type !== "mentiroso") return { error: "Estado incorrecto" };
  if (gs.phase !== "playing") return { error: "El juego ha terminado" };
  if (!gs.lastPlay) return { error: "No hay jugada que cuestionar" };
  if (gs.lastPlay.playerId === callerId)
    return { error: "No puedes cuestionar tu propia jugada" };

  const { lastPlay } = gs;
  const caller = room.players.find((p) => p.id === callerId)!;
  const mentiroso = room.players.find((p) => p.id === lastPlay.playerId)!;

  // Reveal: any card that doesn't match the declared value → mentiroso lied
  const isMentira = lastPlay.cardIds.some((id) => {
    const card = getBarajaCard(id);
    return card?.valor !== lastPlay.declaredValue;
  });

  const pileSize = gs.pile.length;
  if (isMentira) {
    mentiroso.hand.push(...gs.pile);
    autoDiscardPoker(mentiroso, gs, room);
    room.log.push(
      `¡MENTIRA! ${caller.name} acertó → ${mentiroso.name} recoge ${pileSize} carta${pileSize > 1 ? "s" : ""}`,
    );
  } else {
    caller.hand.push(...gs.pile);
    autoDiscardPoker(caller, gs, room);
    room.log.push(
      `¡MENTIRA! ${caller.name} se equivocó → recoge ${pileSize} carta${pileSize > 1 ? "s" : ""}`,
    );
  }

  gs.pile = [];
  gs.lastPlay = null;
  room.version += 1;
  return { room };
}
