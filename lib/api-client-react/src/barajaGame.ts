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
  ArenaState,
  ArenaRound,
  BlackjackState,
  MonopolyBoardSpace,
  MonopolyCard,
  MonopolyDeck,
  MentirosoState,
  MonopolyProperty,
  MonopolyState,
  OcaState,
  PartyPromptKind,
  PartyState,
  PartyVote,
  ParchisColor,
  ParchisState,
  PokerCard,
  PokerState,
  Palo,
  TraditionalGameId,
  TraditionalState,
} from "./barajaTypes";
import { PALOS, VALORES } from "./barajaTypes";
import { getPokerCard, initPoker } from "./pokerGame";
import { initBlackjack } from "./blackjackGame";

const PARCHIS_COLORS: ParchisColor[] = ["rojo", "amarillo", "verde", "azul"];
const OCA_COLORS = ["rojo", "amarillo", "verde", "azul", "morado", "naranja"];
const PARCHIS_SAFE_TRACKS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const OCA_POSITIONS = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];
const PARTY_PROMPTS: Record<PartyPromptKind, string[]> = {
  "incómoda": [
    "¿Cuál es la última mentira piadosa que has contado?",
    "¿A quién de la sala llamarías para una aventura imposible?",
    "¿Qué secreto absurdo nunca habías contado en voz alta?",
    "¿Cuál ha sido tu peor cita o mensaje enviado por error?",
  ],
  "yo-nunca": [
    "Yo nunca he enviado un mensaje a la persona equivocada.",
    "Yo nunca he fingido entender una conversación.",
    "Yo nunca he cotilleado un chat que no era mío.",
    "Yo nunca he bailado solo cuando nadie miraba.",
  ],
};
const TRADITIONAL_VARIANTS = new Set<TraditionalGameId>([
  "culo", "mico", "pesca", "cuatrola", "tute", "7ymedio", "chinchon",
  "burro", "escoba", "brisca", "remigio", "chanchullo", "golfo", "cauca",
  "rueda", "cinquillo", "pocha", "relojito",
]);

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
    partyMode: room.tableConfig?.partyMode ?? false,
    partyEvent: null,
  };
}

const MONOPOLY_SPACE_DEFS: Array<Omit<MonopolyBoardSpace, "ownerId" | "houseCount">> = [
  { id: 0, name: "SALIDA", type: "go" },
  { id: 1, name: "Lavapiés", type: "property", color: "brown", price: 60, rent: 8 },
  { id: 2, name: "Caja de Comunidad", type: "community" },
  { id: 3, name: "Ronda de Valencia", type: "property", color: "brown", price: 60, rent: 10 },
  { id: 4, name: "Impuesto de lujo", type: "tax" },
  { id: 5, name: "Cárcel / De visita", type: "jail" },
  { id: 6, name: "Estación Atocha", type: "railroad", price: 200, rent: 25 },
  { id: 7, name: "Suerte", type: "luck" },
  { id: 8, name: "Chueca", type: "property", color: "lightblue", price: 100, rent: 14 },
  { id: 9, name: "Atocha", type: "property", color: "lightblue", price: 120, rent: 16 },
  { id: 10, name: "De visita", type: "jail" },
  { id: 11, name: "Gran Vía", type: "property", color: "pink", price: 140, rent: 20 },
  { id: 12, name: "Compañía eléctrica", type: "utility", price: 150, rent: 30 },
  { id: 13, name: "Castellana", type: "property", color: "pink", price: 160, rent: 22 },
  { id: 14, name: "Sol", type: "property", color: "orange", price: 180, rent: 26 },
  { id: 15, name: "Estación Chamartín", type: "railroad", price: 200, rent: 25 },
  { id: 16, name: "Malasaña", type: "property", color: "orange", price: 200, rent: 28 },
  { id: 17, name: "Caja de Comunidad", type: "community" },
  { id: 18, name: "Goya", type: "property", color: "red", price: 220, rent: 32 },
  { id: 19, name: "Salamanca", type: "property", color: "red", price: 240, rent: 34 },
  { id: 20, name: "Parking gratuito", type: "free-parking" },
  { id: 21, name: "Retiro", type: "property", color: "yellow", price: 260, rent: 38 },
  { id: 22, name: "Suerte", type: "luck" },
  { id: 23, name: "Alcalá", type: "property", color: "yellow", price: 280, rent: 40 },
  { id: 24, name: "Prado", type: "property", color: "green", price: 300, rent: 46 },
  { id: 25, name: "Estación Delicias", type: "railroad", price: 200, rent: 25 },
  { id: 26, name: "Recoletos", type: "property", color: "green", price: 320, rent: 50 },
  { id: 27, name: "Diagonal", type: "property", color: "green", price: 320, rent: 50 },
  { id: 28, name: "Compañía de aguas", type: "utility", price: 150, rent: 30 },
  { id: 29, name: "Castelldefels", type: "property", color: "blue", price: 350, rent: 58 },
  { id: 30, name: "Ir a la cárcel", type: "go-to-jail" },
  { id: 31, name: "Plaza Mayor", type: "property", color: "blue", price: 400, rent: 70 },
  { id: 32, name: "Puerta del Sol", type: "property", color: "blue", price: 420, rent: 76 },
  { id: 33, name: "Caja de Comunidad", type: "community" },
  { id: 34, name: "Granada", type: "property", color: "blue", price: 440, rent: 82 },
  { id: 35, name: "Estación Sants", type: "railroad", price: 200, rent: 25 },
  { id: 36, name: "Suerte", type: "luck" },
  { id: 37, name: "Barcelona", type: "property", color: "blue", price: 460, rent: 90 },
  { id: 38, name: "Impuesto sobre el capital", type: "tax" },
  { id: 39, name: "Valencia", type: "property", color: "blue", price: 480, rent: 100 },
];

const MONOPOLY_PROPERTIES: Array<Omit<MonopolyProperty, "ownerId" | "houseCount">> =
  MONOPOLY_SPACE_DEFS
    .filter((space) => space.type === "property" && space.color && space.price && space.rent)
    .map((space) => ({
      id: space.id,
      name: space.name,
      price: space.price!,
      rent: space.rent!,
      color: space.color!,
    }));

const MONOPOLY_LUCK_CARDS: MonopolyCard[] = [
  { id: "luck-advance-go", deck: "luck", title: "Avanza hasta la salida", text: "Pasa por la salida y cobra 200€.", moveTo: 0, amount: 200 },
  { id: "luck-repair", deck: "luck", title: "Reparación urgente", text: "Paga 100€ al banco.", amount: -100 },
  { id: "luck-bonus", deck: "luck", title: "Premio del concurso", text: "Recibes 150€ del banco.", amount: 150 },
];

const MONOPOLY_COMMUNITY_CARDS: MonopolyCard[] = [
  { id: "community-birthday", deck: "community", title: "Cumpleaños", text: "Cada jugador te paga 25€.", amount: 25 },
  { id: "community-fine", deck: "community", title: "Multa de tráfico", text: "Paga 50€ al banco.", amount: -50 },
  { id: "community-inheritance", deck: "community", title: "Herencia", text: "Recibes 100€.", amount: 100 },
];

function initMonopoly(room: BarajaRoom): MonopolyState {
  const playerOrder = room.players.map((player) => player.id);
  const positions: Record<string, number> = {};
  const balances: Record<string, number> = {};
  const inJail: Record<string, number> = {};
  for (const id of playerOrder) { positions[id] = 0; balances[id] = 1500; inJail[id] = 0; }
  const spaces = MONOPOLY_SPACE_DEFS.map((space) => ({ ...space, ownerId: null, houseCount: 0 }));
  return {
    type: "monopoly", phase: "playing", playerOrder, currentIdx: 0, positions, balances,
    properties: MONOPOLY_PROPERTIES.map((property) => ({ ...property, ownerId: null, houseCount: 0 })),
    spaces, inJail, dice: null, lastMove: "La partida empieza. Tira los dados.", winnerId: null,
    luckDeck: MONOPOLY_LUCK_CARDS.map((card) => ({ ...card })),
    communityDeck: MONOPOLY_COMMUNITY_CARDS.map((card) => ({ ...card })),
    cardModal: null, canDraw: null,
    partyMode: room.tableConfig?.partyMode ?? false,
    partyEvent: null,
  };
}

function initArena(room: BarajaRoom): ArenaState {
  const playerOrder = room.players.map((player) => player.id);
  const scores: Record<string, number> = {};
  for (const id of playerOrder) scores[id] = 0;
  const now = Date.now();
  return {
    type: "arena", phase: "playing", playerOrder, scores, round: 1,
    roundType: "tap", flashAt: null, bombHolder: playerOrder[0] ?? null,
    memorySequence: [0, 2, 1], memoryInput: {}, roundStartedAt: now,
    roundDeadline: now + 5000, bombDeadline: null, roundWinnerId: null, winnerId: null,
    tapCounts: Object.fromEntries(playerOrder.map((id) => [id, 0])),
  };
}

function initParty(room: BarajaRoom): PartyState {
  const playerOrder = room.players.map((player) => player.id);
  return {
    type: "party",
    phase: "playing",
    playerOrder,
    currentIdx: 0,
    coinSide: null,
    coinStarterId: playerOrder[0] ?? null,
    sipPot: 0,
    promptKind: "incómoda",
    promptText: null,
    promptAuthorId: null,
    promptVotes: {},
    promptRound: 0,
    lastMove: "La sala Party está lista: lanza la moneda o roba una tarjeta.",
  };
}

function initTraditional(room: BarajaRoom, variant: TraditionalGameId): TraditionalState {
  const deck = createDeck().map((card) => card.id);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[randomIndex]] = [deck[randomIndex], deck[index]];
  }
  const playerOrder = room.players.map((player) => player.id);
  const hands: Record<string, string[]> = {};
  const cardsPerPlayer = ["remigio", "pesca", "tute", "cuatrola"].includes(variant) ? 7 : 5;
  for (const id of playerOrder) hands[id] = [];
  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (const id of playerOrder) {
      const card = deck.shift();
      if (card) hands[id].push(card);
    }
  }
  return {
    type: "traditional",
    variant,
    phase: "playing",
    playerOrder,
    currentIdx: 0,
    hands,
    drawPile: deck,
    discardPile: [],
    playedCards: [],
    winnerId: null,
    lastMove: null,
  };
}

function traditionalCard(id: string): BarajaNaipe | undefined {
  return getBarajaCard(id) ?? undefined;
}

function canPlayTraditional(state: TraditionalState, cardId: string): boolean {
  const card = traditionalCard(cardId);
  if (!card) return false;
  if (state.variant !== "cinquillo" || state.playedCards.length === 0) return true;
  const sameSuit = state.playedCards
    .map(traditionalCard)
    .filter((item): item is BarajaNaipe => !!item && item.palo === card.palo);
  if (card.valor === 5) return true;
  return sameSuit.some((played) => Math.abs(played.valor - card.valor) === 1);
}

export function applyTraditionalPlay(
  room: BarajaRoom,
  playerId: string,
  cardId: string,
): BGameResult<{ room: BarajaRoom }> {
  const state = room.gameState as TraditionalState | null;
  if (!state || state.type !== "traditional") return { error: "Estado de juego incorrecto" };
  if (state.phase !== "playing") return { error: "La partida ha terminado" };
  if (state.playerOrder[state.currentIdx] !== playerId) return { error: "No es tu turno" };
  const hand = state.hands[playerId] ?? [];
  if (!hand.includes(cardId)) return { error: "Esa carta no está en tu mano" };
  if (!canPlayTraditional(state, cardId)) {
    return { error: "En Cinquillo debes empezar con un 5 o continuar una escalera" };
  }
  state.hands[playerId] = hand.filter((id) => id !== cardId);
  state.playedCards.push(cardId);
  state.discardPile.push(cardId);
  const playerName = room.players.find((player) => player.id === playerId)?.name ?? "Jugador";
  state.lastMove = `${playerName} jugó ${cardLabel(cardId)}`;
  if (state.hands[playerId].length === 0) {
    state.phase = "ended";
    state.winnerId = playerId;
  } else {
    state.currentIdx = nextPlayer(state.currentIdx, state.playerOrder.length);
    while (
      state.playerOrder.length > 1 &&
      (state.hands[state.playerOrder[state.currentIdx]]?.length ?? 0) === 0
    ) {
      state.currentIdx = nextPlayer(state.currentIdx, state.playerOrder.length);
    }
    if (
      state.drawPile.length &&
      ["brisca", "pesca", "cuatrola", "tute", "pocha", "remigio"].includes(state.variant)
    ) {
      const nextId = state.playerOrder[state.currentIdx];
      state.hands[nextId].push(state.drawPile.shift()!);
    }
  }
  room.version += 1;
  room.log.push(state.lastMove);
  return { room };
}

function nextPlayer(currentIdx: number, length: number): number {
  return (currentIdx + 1) % length;
}

function parchisTrackPosition(color: ParchisColor, progress: number): number {
  const offsets: Record<ParchisColor, number> = {
    rojo: 0, amarillo: 13, verde: 26, azul: 39,
  };
  if (progress > 52) return -1;
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
      if (piece < 1 || piece > 52) continue;
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
  if (piece === -1 && dice !== 5 && dice !== 6) return false;
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
    gs.currentIdx = nextPlayer(gs.currentIdx, gs.playerOrder.length);
    gs.consecutiveSixes = 0;
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
      if (otherPiece < 1 || otherPiece > 52) return otherPiece;
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
    if (gs.partyMode) {
      const partyEvents: Record<number, string> = {
        5: "Oca: bebe y vuelve a tirar",
        6: "Puente: 1 sorbo",
        19: "Posada: bebe quien no esté jugando",
        31: "Pozo: bebe la persona de tu izquierda",
        52: "Cárcel: chupito para salir",
        58: "Muerte: fondo/chupito general",
      };
      gs.partyEvent = partyEvents[position] ?? null;
    }
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

export type MonopolyAction =
  | "roll"
  | "buy"
  | "end-turn"
  | "jail"
  | "draw-luck"
  | "draw-community";

function syncMonopolyProperty(gs: MonopolyState, space: MonopolyBoardSpace) {
  const property = gs.properties.find((item) => item.id === space.id);
  if (property) {
    property.ownerId = space.ownerId;
    property.houseCount = space.houseCount;
  }
}

function applyMonopolyCard(
  gs: MonopolyState,
  room: BarajaRoom,
  playerId: string,
  card: MonopolyCard,
) {
  if (card.moveTo !== undefined) gs.positions[playerId] = card.moveTo;
  if (card.amount) {
    if (card.deck === "community" && card.id === "community-birthday") {
      const gift = Math.min(25, ...Object.values(gs.balances).filter((_, index) => room.players[index]?.id !== playerId));
      for (const id of gs.playerOrder) {
        if (id !== playerId) gs.balances[id] = Math.max(0, gs.balances[id] - gift);
      }
      gs.balances[playerId] += gift * Math.max(0, gs.playerOrder.length - 1);
    } else {
      gs.balances[playerId] = Math.max(0, gs.balances[playerId] + card.amount);
    }
  }
}

export function applyMonopolyAction(
  room: BarajaRoom,
  playerId: string,
  action: MonopolyAction,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as MonopolyState | null;
  if (!gs || gs.type !== "monopoly") return { error: "Estado de Monopoly incorrecto" };
  if (gs.phase !== "playing") return { error: "La partida ha terminado" };
  if (gs.playerOrder[gs.currentIdx] !== playerId) return { error: "No es tu turno" };
  const position = gs.positions[playerId] ?? 0;
  if (action === "roll") {
    if (gs.dice) return { error: "Ya has tirado. Compra o termina turno." };
    const dice: [number, number] = [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
    gs.dice = dice;
    gs.cardModal = null;
    gs.canDraw = null;
    const rawNext = position + dice[0] + dice[1];
    const next = rawNext % 40;
    if (rawNext >= 40) gs.balances[playerId] += 200;
    gs.positions[playerId] = next;
    const space = gs.spaces.find((item) => item.id === next);
    if (space?.type === "go-to-jail") {
      gs.positions[playerId] = 5;
      gs.inJail[playerId] = 2;
      gs.lastMove = `${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} va a la cárcel`;
    } else if (space?.type === "luck" || space?.type === "community") {
      gs.canDraw = space.type === "luck" ? "luck" : "community";
      gs.lastMove = `${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} cae en ${space.name}`;
    } else if (space?.ownerId && space.ownerId !== playerId && space.rent) {
      const rent = Math.min(gs.balances[playerId], space.rent);
      gs.balances[playerId] -= rent;
      gs.balances[space.ownerId] += rent;
      gs.lastMove = `${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} paga ${rent}€ de alquiler`;
    } else {
      gs.lastMove = `${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} cae en ${space?.name ?? "una casilla especial"}`;
    }
    if (gs.partyMode) {
      const partyEvents: Record<number, string> = {
        0: "Salida: reparte 2 sorbos",
        4: "Impuesto de lujo: 2 sorbos",
        5: "Cárcel: 1 chupito para entrar",
        7: "Suerte: roba carta y bebe 1 sorbo si no te gusta",
        10: "De visita: elige a alguien para que beba 1 sorbo",
        20: "Parking gratuito: todos beben 1 sorbo",
        22: "Suerte: el jugador de tu izquierda bebe 1 sorbo",
        30: "Ir a la cárcel: 2 sorbos y pierdes el próximo turno",
        38: "Impuesto: 2 sorbos",
      };
      gs.partyEvent = partyEvents[next] ?? null;
      if (space?.type === "go-to-jail") gs.partyEvent = "Ir a la cárcel: 2 sorbos y pierdes el próximo turno";
    } else {
      gs.partyEvent = null;
    }
  } else if (action === "buy") {
    if (!gs.dice) return { error: "Tira primero" };
    const space = gs.spaces.find((item) => item.id === position);
    if (!space || !["property", "railroad", "utility"].includes(space.type) || space.ownerId || !space.price || gs.balances[playerId] < space.price) {
      return { error: "No puedes comprar esta casilla" };
    }
    space.ownerId = playerId;
    gs.balances[playerId] -= space.price;
    syncMonopolyProperty(gs, space);
    gs.lastMove = `${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} compra ${space.name}`;
  } else if (action === "jail") {
    if (!gs.inJail[playerId]) return { error: "No estás en la cárcel" };
    if (gs.balances[playerId] < 50) return { error: "Necesitas 50€ para salir" };
    gs.balances[playerId] -= 50;
    gs.inJail[playerId] = 0;
    gs.lastMove = "Pagas 50€ y sales de la cárcel";
  } else if (action === "draw-luck" || action === "draw-community") {
    const deck: MonopolyDeck = action === "draw-luck" ? "luck" : "community";
    if (!gs.dice || gs.canDraw !== deck) return { error: "No hay una carta disponible en esta casilla" };
    const cards = deck === "luck" ? gs.luckDeck : gs.communityDeck;
    const card = cards.shift();
    if (!card) return { error: "El mazo está vacío" };
    cards.push(card);
    applyMonopolyCard(gs, room, playerId, card);
    gs.cardModal = card;
    gs.canDraw = null;
    gs.lastMove = `${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} roba ${card.title}`;
  } else {
    if (!gs.dice || gs.canDraw) return { error: gs.canDraw ? "Roba la carta antes de terminar" : "Tira primero" };
    gs.dice = null;
    gs.cardModal = null;
    gs.currentIdx = (gs.currentIdx + 1) % gs.playerOrder.length;
    gs.lastMove = `Turno de ${room.players.find((p) => p.id === gs.playerOrder[gs.currentIdx])?.name ?? "otro jugador"}`;
  }
  room.version += 1;
  room.log.push(gs.lastMove ?? "Movimiento");
  return { room };
}

export function applyArenaAction(
  room: BarajaRoom,
  playerId: string,
  action: "tap" | "pass-bomb" | "memory-input" | "score" | "pass" | "stopwatch" | "stroop" | "target" | "answer",
  points = 1,
  value?: number,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as ArenaState | null;
  if (!gs || gs.type !== "arena") return { error: "Estado de arena incorrecto" };
  if (!gs.playerOrder.includes(playerId)) return { error: "Jugador no encontrado" };
  if (gs.phase !== "playing") return { error: "La arena ha terminado" };
  const now = Date.now();
  const finishRound = (winnerId: string | null, awardedPoints = 0) => {
    if (winnerId) gs.scores[winnerId] = (gs.scores[winnerId] ?? 0) + awardedPoints;
    gs.roundWinnerId = winnerId;
    gs.round += 1;
    if (gs.round > 9) {
      gs.phase = "ended";
      gs.winnerId = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return;
    }
    const rounds: ArenaRound[] = ["tap", "bomba", "reflejos", "cronometro", "stroop", "memoria", "diana", "calculo"];
    gs.roundType = rounds[(gs.round - 1) % rounds.length];
    gs.roundStartedAt = now;
    gs.roundDeadline = now + (gs.roundType === "tap" ? 5000 : gs.roundType === "diana" ? 10000 : 8000);
    gs.flashAt = gs.roundType === "reflejos" ? now + 1200 + Math.floor(Math.random() * 1800) : null;
    gs.bombHolder = gs.roundType === "bomba" ? gs.playerOrder[gs.round % gs.playerOrder.length] : null;
    gs.bombDeadline = gs.roundType === "bomba" ? now + 2500 + Math.floor(Math.random() * 3500) : null;
    gs.memorySequence = gs.roundType === "memoria"
      ? Array.from({ length: 3 + (gs.round - 1) % 2 }, () => Math.floor(Math.random() * 4))
      : [];
    gs.memoryInput = {};
    gs.tapCounts = Object.fromEntries(gs.playerOrder.map((id) => [id, 0]));
    gs.stopwatchStops = {};
    gs.stopwatchTarget = 5000;
    gs.stroopWord = gs.roundType === "stroop" ? ["ROJO", "AZUL", "VERDE", "AMARILLO"][Math.floor(Math.random() * 4)] : undefined;
    gs.stroopInk = gs.roundType === "stroop" ? Math.floor(Math.random() * 4) : undefined;
    gs.stroopOptions = ["ROJO", "AZUL", "VERDE", "AMARILLO"];
    gs.mathQuestion = gs.roundType === "calculo" ? "3 + 4 × 2" : undefined;
    gs.mathOptions = gs.roundType === "calculo" ? [11, 14, 10] : undefined;
    gs.targetPosition = gs.roundType === "diana" ? { x: 25 + Math.floor(Math.random() * 50), y: 25 + Math.floor(Math.random() * 50) } : null;
  };
  if (action === "tap") {
    if (gs.roundType === "tap") {
      if (now >= gs.roundDeadline) {
        const winner = Object.entries(gs.tapCounts ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        finishRound(winner, 3);
      } else {
        gs.tapCounts = { ...(gs.tapCounts ?? {}), [playerId]: (gs.tapCounts?.[playerId] ?? 0) + 1 };
      }
    } else {
      if (gs.roundType !== "reflejos") return { error: "Esta ronda no admite toques" };
      if (gs.flashAt === null || now < gs.flashAt) return { error: "Demasiado pronto: espera el cambio" };
      finishRound(playerId, 3);
    }
  } else if (action === "pass-bomb" || action === "pass") {
    if (gs.roundType !== "bomba" || gs.bombHolder !== playerId) return { error: "La bomba no está contigo" };
    if ((gs.bombDeadline ?? 0) <= now) {
      gs.scores[playerId] = Math.max(0, (gs.scores[playerId] ?? 0) - 1);
      finishRound(null);
    } else {
      const next = nextPlayer(gs.playerOrder.indexOf(playerId), gs.playerOrder.length);
      gs.bombHolder = gs.playerOrder[next];
      gs.bombDeadline = now + 2500 + Math.floor(Math.random() * 3500);
    }
  } else if (action === "memory-input") {
    if (gs.roundType !== "memoria" || value === undefined || value < 0 || value > 3) return { error: "Entrada de memoria no válida" };
    const input = [...(gs.memoryInput[playerId] ?? []), value];
    gs.memoryInput[playerId] = input;
    const expected = gs.memorySequence[input.length - 1];
    if (value !== expected) {
      finishRound(null);
    } else if (input.length === gs.memorySequence.length) {
      finishRound(playerId, 4);
    }
  } else if (action === "stopwatch") {
    if (gs.roundType !== "cronometro") return { error: "Esta ronda no es de cronómetro" };
    const elapsed = Math.max(0, now - gs.roundStartedAt);
    gs.stopwatchStops = { ...(gs.stopwatchStops ?? {}), [playerId]: elapsed };
    finishRound(playerId, Math.max(1, 5 - Math.round(Math.abs(elapsed - 5000) / 1000)));
  } else if (action === "stroop" || action === "answer" || action === "target" || action === "score") {
    finishRound(playerId, Math.max(1, points));
  }
  room.version += 1;
  room.log.push(`${room.players.find((p) => p.id === playerId)?.name ?? "Jugador"} completa la ronda ${Math.max(1, gs.round - 1)}`);
  return { room };
}

export function applyPartyAction(
  room: BarajaRoom,
  playerId: string,
  action: "coin" | "prompt" | "vote" | "probable",
  value?: string,
  kind?: PartyPromptKind,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as PartyState | null;
  if (!gs || gs.type !== "party") return { error: "Estado de Party incorrecto" };
  if (!gs.playerOrder.includes(playerId)) return { error: "Jugador no encontrado" };
  if (action === "coin") {
    gs.coinSide = Math.random() > 0.5 ? "cara" : "cruz";
    gs.coinStarterId = gs.playerOrder[Math.floor(Math.random() * gs.playerOrder.length)] ?? playerId;
    gs.sipPot = gs.coinSide === "cara" ? 1 : Math.min(5, gs.sipPot + 1);
    gs.lastMove = `Moneda: ${gs.coinSide}. Empieza ${room.players.find((p) => p.id === gs.coinStarterId)?.name ?? "un jugador"}`;
  } else if (action === "prompt" || action === "probable") {
    gs.promptText = value ?? "¿Quién es más probable que llegue tarde?";
    gs.promptKind = kind ?? "incómoda";
    gs.promptAuthorId = playerId;
    gs.promptVotes = {};
    gs.promptRound += 1;
    gs.lastMove = action === "probable" ? "Nueva votación anónima abierta" : "Nueva tarjeta abierta";
  } else {
    if (!value || !["sí", "no", "paso"].includes(value)) return { error: "Voto no válido" };
    gs.promptVotes[playerId] = value as PartyVote;
    gs.lastMove = "Votación actualizada";
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
    : gs?.type === "traditional"
      ? (gs.hands[playerId] ?? [])
        .map((id) => getBarajaCard(id))
        .filter((c): c is BarajaNaipe => !!c)
    : (me?.hand ?? [])
        .map((id) => getBarajaCard(id))
        .filter((c): c is BarajaNaipe => !!c);

  const myPokerHand: PokerCard[] =
    gs?.type === "poker"
      ? (gs.hands[playerId] ?? [])
          .map((id) => getPokerCard(id))
          .filter((card): card is PokerCard => !!card)
      : [];
  const myBlackjackHands =
    gs?.type === "blackjack" ? (gs.hands[playerId] ?? []) : [];

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
  if (gs?.type === "blackjack") {
    const blackjackClone: BlackjackState = JSON.parse(JSON.stringify(gs));
    blackjackClone.deck = [];
    if (blackjackClone.phase === "playing" && blackjackClone.dealerHand.length > 1) {
      blackjackClone.dealerHand = ["hidden", blackjackClone.dealerHand[1]];
    }
    for (const [id, hands] of Object.entries(blackjackClone.hands)) {
      if (id !== playerId) {
        blackjackClone.hands[id] = hands.map((hand) => ({ ...hand, cards: [] }));
      }
    }
    serializedGs = blackjackClone;
  }
  if (gs?.type === "traditional") {
    const traditionalClone: TraditionalState = JSON.parse(JSON.stringify(gs));
    traditionalClone.drawPile = [];
    for (const [id, hand] of Object.entries(traditionalClone.hands)) {
      if (id !== playerId) traditionalClone.hands[id] = hand.map(() => "hidden");
    }
    serializedGs = traditionalClone;
  }

  const players: BarajaPlayerPublic[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    handCount: gs?.type === "poker"
      ? (gs.hands[p.id]?.length ?? 0)
      : gs?.type === "blackjack"
        ? (gs.hands[p.id]?.reduce((count, hand) => count + hand.cards.length, 0) ?? 0)
        : gs?.type === "traditional"
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
    myBlackjackHands,
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
  } else if (room.gameId === "blackjack") {
    room.gameState = initBlackjack(room);
  } else if (room.gameId === "monopoly") {
    room.gameState = initMonopoly(room);
  } else if (room.gameId === "arena") {
    room.gameState = initArena(room);
  } else if (room.gameId === "party") {
    room.gameState = initParty(room);
  } else if (TRADITIONAL_VARIANTS.has(room.gameId as TraditionalGameId)) {
    room.gameState = initTraditional(room, room.gameId as TraditionalGameId);
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
