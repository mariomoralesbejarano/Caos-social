// Pure Texas Hold'em game engine. The room store owns persistence; this module
// only validates actions and returns the mutated room.
import type {
  BarajaPlayer,
  BarajaRoom,
  BGameResult,
  PokerAction,
  PokerActionKind,
  PokerCard,
  PokerHandResult,
  PokerRank,
  PokerState,
  PokerStreet,
  PokerSuit,
} from "./barajaTypes";

export const POKER_RANKS: readonly PokerRank[] = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
];
export const POKER_SUITS: readonly PokerSuit[] = ["spades", "hearts", "diamonds", "clubs"];
export const POKER_STARTING_STACK = 1000;
export const POKER_SMALL_BLIND = 10;
export const POKER_BIG_BLIND = 20;

const RANK_VALUE: Record<PokerRank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

const CATEGORY_NAMES = [
  "Carta alta",
  "Pareja",
  "Doble pareja",
  "Trío",
  "Escalera",
  "Color",
  "Full house",
  "Póker",
  "Escalera de color",
  "Escalera real",
] as const;

export interface EvaluatedPokerHand {
  category: string;
  categoryRank: number;
  tiebreaker: number[];
  cards: string[];
}

export function createPokerDeck(): PokerCard[] {
  return POKER_SUITS.flatMap((suit) =>
    POKER_RANKS.map((rank) => ({
      id: `${suit}-${rank}`,
      suit,
      rank,
    })),
  );
}

const POKER_CARD_MAP = new Map(createPokerDeck().map((card) => [card.id, card]));

export function getPokerCard(id: string): PokerCard | null {
  return POKER_CARD_MAP.get(id) ?? null;
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function nextIndex(index: number, length: number): number {
  return (index + 1) % length;
}

function nextAvailable(
  gs: PokerState,
  from: number,
  canActOnly: boolean,
): number {
  for (let step = 1; step <= gs.playerOrder.length; step++) {
    const idx = (from + step) % gs.playerOrder.length;
    const id = gs.playerOrder[idx];
    if (gs.folded.includes(id)) continue;
    if (canActOnly && (gs.stacks[id] ?? 0) <= 0) continue;
    return idx;
  }
  return from;
}

function activeIds(gs: PokerState): string[] {
  return gs.playerOrder.filter((id) => !gs.folded.includes(id));
}

function canActIds(gs: PokerState): string[] {
  return activeIds(gs).filter((id) => (gs.stacks[id] ?? 0) > 0);
}

function addAction(
  gs: PokerState,
  playerId: string,
  action: PokerActionKind,
  amount: number,
): void {
  const entry: PokerAction = {
    playerId,
    action,
    amount,
    timestamp: Date.now(),
  };
  gs.actions = [...gs.actions.slice(-39), entry];
}

function putChips(gs: PokerState, playerId: string, amount: number): number {
  const safeAmount = Math.max(0, Math.min(amount, gs.stacks[playerId] ?? 0));
  gs.stacks[playerId] = (gs.stacks[playerId] ?? 0) - safeAmount;
  gs.streetBets[playerId] = (gs.streetBets[playerId] ?? 0) + safeAmount;
  gs.contributions[playerId] = (gs.contributions[playerId] ?? 0) + safeAmount;
  gs.pot += safeAmount;
  return safeAmount;
}

function initializePokerHand(
  room: BarajaRoom,
  playerOrder: string[],
  stacks: Record<string, number>,
  dealerIdx: number,
  roundNumber: number,
): PokerState {
  const deck = shuffle(createPokerDeck().map((card) => card.id));
  const hands: Record<string, string[]> = {};
  const folded: string[] = [];
  const streetBets: Record<string, number> = {};
  const contributions: Record<string, number> = {};
  for (const id of playerOrder) {
    hands[id] = [];
    streetBets[id] = 0;
    contributions[id] = 0;
  }

  // Deal clockwise from the player left of the dealer, two private cards.
  let deckPos = 0;
  for (let round = 0; round < 2; round++) {
    for (let offset = 1; offset <= playerOrder.length; offset++) {
      const id = playerOrder[(dealerIdx + offset) % playerOrder.length];
      hands[id].push(deck[deckPos++]);
    }
  }

  const smallBlindIdx = playerOrder.length === 2
    ? dealerIdx
    : nextIndex(dealerIdx, playerOrder.length);
  const bigBlindIdx = nextIndex(smallBlindIdx, playerOrder.length);
  const smallBlindId = playerOrder[smallBlindIdx];
  const bigBlindId = playerOrder[bigBlindIdx];
  const gs: PokerState = {
    type: "poker",
    phase: "playing",
    street: "preflop",
    dealerIdx,
    playerOrder,
    smallBlind: POKER_SMALL_BLIND,
    bigBlind: POKER_BIG_BLIND,
    smallBlindId,
    bigBlindId,
    currentIdx: playerOrder.length === 2
      ? dealerIdx
      : nextIndex(bigBlindIdx, playerOrder.length),
    board: [],
    pot: 0,
    currentBet: 0,
    minRaise: POKER_BIG_BLIND,
    stacks: { ...stacks },
    folded,
    streetBets,
    contributions,
    acted: [],
    actions: [],
    winnerIds: [],
    handResults: [],
    showdownHands: {},
    payouts: {},
    hands,
    deck,
    deckPos,
    roundNumber,
  };

  putChips(gs, smallBlindId, POKER_SMALL_BLIND);
  putChips(gs, bigBlindId, POKER_BIG_BLIND);
  gs.currentBet = Math.max(gs.streetBets[smallBlindId], gs.streetBets[bigBlindId]);
  addAction(gs, smallBlindId, "call", gs.streetBets[smallBlindId]);
  addAction(gs, bigBlindId, "raise", gs.streetBets[bigBlindId]);
  // Posting a blind does not count as taking the player's betting action:
  // the Big Blind must still be able to check or raise when action returns.
  gs.acted = [];
  return gs;
}

export function initPoker(room: BarajaRoom): PokerState {
  const playerOrder = room.players.map((player) => player.id);
  const stacks: Record<string, number> = {};
  for (const player of room.players) stacks[player.id] = POKER_STARTING_STACK;
  return initializePokerHand(room, playerOrder, stacks, 0, 1);
}

function drawBoard(gs: PokerState, count: number): void {
  // Burn one card before each community reveal, as in live Texas Hold'em.
  gs.deckPos += 1;
  gs.board.push(...gs.deck.slice(gs.deckPos, gs.deckPos + count));
  gs.deckPos += count;
}

function bettingRoundComplete(gs: PokerState): boolean {
  const actors = canActIds(gs);
  return actors.length === 0 || actors.every((id) =>
    gs.acted.includes(id) && (gs.streetBets[id] ?? 0) === gs.currentBet,
  );
}

function finishFoldedHand(gs: PokerState): void {
  const winnerIds = activeIds(gs);
  const winnerId = winnerIds[0];
  const amount = gs.pot;
  gs.stacks[winnerId] = (gs.stacks[winnerId] ?? 0) + amount;
  gs.payouts = { [winnerId]: amount };
  gs.winnerIds = winnerIds;
  gs.handResults = winnerId
    ? [{
        playerId: winnerId,
        category: "Gana por retiradas",
        categoryRank: 0,
        tiebreaker: [],
        cards: [],
      }]
    : [];
  gs.pot = 0;
  gs.phase = "ended";
  gs.street = "showdown";
}

function compareTiebreakers(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const delta = (a[i] ?? 0) - (b[i] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function compareEvaluated(a: EvaluatedPokerHand, b: EvaluatedPokerHand): number {
  return a.categoryRank - b.categoryRank || compareTiebreakers(a.tiebreaker, b.tiebreaker);
}

function evaluateFive(cards: PokerCard[]): EvaluatedPokerHand {
  const values = cards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const unique = [...new Set(values)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) straightHigh = unique[0];
    else if (unique.join(",") === "14,5,4,3,2") straightHigh = 5;
  }

  if (flush && straightHigh === 14) return { category: CATEGORY_NAMES[9], categoryRank: 9, tiebreaker: [14], cards: cards.map((card) => card.id) };
  if (flush && straightHigh) return { category: CATEGORY_NAMES[8], categoryRank: 8, tiebreaker: [straightHigh], cards: cards.map((card) => card.id) };
  if (groups[0][1] === 4) return { category: CATEGORY_NAMES[7], categoryRank: 7, tiebreaker: [groups[0][0], groups[1][0]], cards: cards.map((card) => card.id) };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { category: CATEGORY_NAMES[6], categoryRank: 6, tiebreaker: [groups[0][0], groups[1][0]], cards: cards.map((card) => card.id) };
  if (flush) return { category: CATEGORY_NAMES[5], categoryRank: 5, tiebreaker: values, cards: cards.map((card) => card.id) };
  if (straightHigh) return { category: CATEGORY_NAMES[4], categoryRank: 4, tiebreaker: [straightHigh], cards: cards.map((card) => card.id) };
  if (groups[0][1] === 3) return { category: CATEGORY_NAMES[3], categoryRank: 3, tiebreaker: [groups[0][0], ...groups.slice(1).map(([value]) => value).sort((a, b) => b - a)], cards: cards.map((card) => card.id) };
  if (groups[0][1] === 2 && groups[1][1] === 2) return { category: CATEGORY_NAMES[2], categoryRank: 2, tiebreaker: [Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups[2][0]], cards: cards.map((card) => card.id) };
  if (groups[0][1] === 2) return { category: CATEGORY_NAMES[1], categoryRank: 1, tiebreaker: [groups[0][0], ...groups.slice(1).map(([value]) => value).sort((a, b) => b - a)], cards: cards.map((card) => card.id) };
  return { category: CATEGORY_NAMES[0], categoryRank: 0, tiebreaker: values, cards: cards.map((card) => card.id) };
}

export function evaluatePokerHand(cards: PokerCard[]): EvaluatedPokerHand {
  if (cards.length !== 5) throw new Error("La evaluación necesita exactamente 5 cartas");
  return evaluateFive(cards);
}

function combinations<T>(items: T[], choose: number): T[][] {
  const result: T[][] = [];
  const visit = (start: number, current: T[]) => {
    if (current.length === choose) {
      result.push([...current]);
      return;
    }
    for (let i = start; i <= items.length - (choose - current.length); i++) {
      current.push(items[i]);
      visit(i + 1, current);
      current.pop();
    }
  };
  visit(0, []);
  return result;
}

export function evaluateBestPokerHand(cards: PokerCard[]): EvaluatedPokerHand {
  if (cards.length < 5) throw new Error("El showdown necesita al menos 5 cartas");
  const combos = combinations(cards, 5);
  let best = evaluateFive(combos[0]);
  for (const combo of combos.slice(1)) {
    const evaluated = evaluateFive(combo);
    if (compareEvaluated(evaluated, best) > 0) best = evaluated;
  }
  return best;
}

function finishShowdown(gs: PokerState): void {
  const results: PokerHandResult[] = [];
  for (const id of activeIds(gs)) {
    const cards = [...(gs.hands[id] ?? []), ...gs.board]
      .map((cardId) => getPokerCard(cardId))
      .filter((card): card is PokerCard => !!card);
    const best = evaluateBestPokerHand(cards);
    results.push({
      playerId: id,
      category: best.category,
      categoryRank: best.categoryRank,
      tiebreaker: best.tiebreaker,
      cards: best.cards,
    });
    gs.showdownHands[id] = best.cards;
  }
  const bestResult = results.reduce((best, result) =>
    compareEvaluated(result, best) > 0 ? result : best,
  );
  const winners = results
    .filter((result) =>
      result.categoryRank === bestResult.categoryRank &&
      compareTiebreakers(result.tiebreaker, bestResult.tiebreaker) === 0,
    )
    .map((result) => result.playerId);
  const total = gs.pot;
  const share = Math.floor(total / winners.length);
  let remainder = total % winners.length;
  const payouts: Record<string, number> = {};
  for (const id of gs.playerOrder) {
    if (!winners.includes(id)) continue;
    const payout = share + (remainder > 0 ? 1 : 0);
    remainder -= payout > share ? 1 : 0;
    gs.stacks[id] = (gs.stacks[id] ?? 0) + payout;
    payouts[id] = payout;
  }
  gs.handResults = results;
  gs.winnerIds = winners;
  gs.payouts = payouts;
  gs.pot = 0;
  gs.phase = "ended";
  gs.street = "showdown";
}

function advanceStreet(gs: PokerState): void {
  gs.streetBets = {};
  for (const id of gs.playerOrder) gs.streetBets[id] = 0;
  gs.currentBet = 0;
  gs.minRaise = gs.bigBlind;
  gs.acted = [];

  if (gs.street === "preflop") {
    drawBoard(gs, 3);
    gs.street = "flop";
  } else if (gs.street === "flop") {
    drawBoard(gs, 1);
    gs.street = "turn";
  } else if (gs.street === "turn") {
    drawBoard(gs, 1);
    gs.street = "river";
  } else {
    finishShowdown(gs);
    return;
  }
  const actors = canActIds(gs);
  if (actors.length === 0) {
    advanceStreet(gs);
  } else {
    const firstPostflopIdx = gs.playerOrder.length === 2
      ? gs.dealerIdx
      : nextIndex(gs.dealerIdx, gs.playerOrder.length);
    gs.currentIdx = nextAvailable(gs, firstPostflopIdx - 1, true);
  }
}

export function applyPokerAction(
  room: BarajaRoom,
  playerId: string,
  action: PokerActionKind,
  amount = 0,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as PokerState | null;
  if (!gs || gs.type !== "poker") return { error: "Estado de Póker incorrecto" };
  if (gs.phase !== "playing") return { error: "La mano ya ha terminado" };
  const currentPlayer = gs.playerOrder[gs.currentIdx];
  if (currentPlayer !== playerId) return { error: "No es tu turno" };
  if (gs.folded.includes(playerId)) return { error: "Ya estás retirado" };
  if ((gs.stacks[playerId] ?? 0) <= 0) return { error: "Estás all-in" };

  const playerBet = gs.streetBets[playerId] ?? 0;
  const toCall = Math.max(0, gs.currentBet - playerBet);

  if (action === "fold") {
    gs.folded.push(playerId);
    gs.acted.push(playerId);
    addAction(gs, playerId, action, 0);
  } else if (action === "check") {
    if (toCall !== 0) return { error: "No puedes pasar: debes igualar o subir" };
    gs.acted.push(playerId);
    addAction(gs, playerId, action, 0);
  } else if (action === "call") {
    if (toCall === 0) return { error: "No hay apuesta que igualar; puedes pasar" };
    const paid = putChips(gs, playerId, toCall);
    gs.acted.push(playerId);
    addAction(gs, playerId, action, paid);
  } else if (action === "raise") {
    const target = Number.isFinite(amount) ? Math.floor(amount) : 0;
    const maxTarget = playerBet + (gs.stacks[playerId] ?? 0);
    if (target <= gs.currentBet || target > maxTarget) return { error: "Subida no válida" };
    const raiseSize = target - gs.currentBet;
    if (raiseSize < gs.minRaise && target !== maxTarget) {
      return { error: `La subida mínima es de ${gs.minRaise} fichas` };
    }
    const paid = putChips(gs, playerId, target - playerBet);
    gs.currentBet = playerBet + paid;
    gs.minRaise = Math.max(gs.minRaise, raiseSize);
    gs.acted = [playerId];
    addAction(gs, playerId, action, paid);
  } else {
    return { error: "Acción no válida" };
  }

  if (activeIds(gs).length === 1) {
    finishFoldedHand(gs);
  } else if (bettingRoundComplete(gs)) {
    advanceStreet(gs);
  } else {
    gs.currentIdx = nextAvailable(gs, gs.currentIdx, true);
  }
  room.version += 1;
  room.log.push(`${room.players.find((player) => player.id === playerId)?.name ?? "Jugador"} ${action}${action === "raise" ? ` a ${gs.currentBet}` : ""}`);
  return { room };
}

export function applyPokerNextHand(
  room: BarajaRoom,
  playerId: string,
): BGameResult<{ room: BarajaRoom }> {
  const gs = room.gameState as PokerState | null;
  if (!gs || gs.type !== "poker") return { error: "Estado de Póker incorrecto" };
  if (room.ownerId !== playerId) return { error: "Solo el host puede iniciar la siguiente mano" };
  if (gs.phase !== "ended") return { error: "La mano actual aún no ha terminado" };
  const playerOrder = room.players
    .map((player) => player.id)
    .filter((id) => (gs.stacks[id] ?? 0) > 0);
  if (playerOrder.length < 2) return { error: "No quedan suficientes jugadores con fichas" };
  const oldDealer = gs.playerOrder[gs.dealerIdx];
  const oldDealerPosition = playerOrder.indexOf(oldDealer);
  const dealerIdx = oldDealerPosition >= 0
    ? (oldDealerPosition + 1) % playerOrder.length
    : 0;
  room.gameState = initializePokerHand(room, playerOrder, gs.stacks, dealerIdx, gs.roundNumber + 1);
  room.status = "active";
  room.version += 1;
  room.log.push("♠️ Nueva mano de Póker");
  return { room };
}