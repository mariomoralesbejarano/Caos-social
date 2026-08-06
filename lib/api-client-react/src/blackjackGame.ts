import type { BlackjackHand, BlackjackState, BarajaRoom, BGameResult } from "./barajaTypes";

const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export function createBlackjackDeck(): string[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => `${suit}-${rank}`));
}

function cardValue(cardId: string): number {
  const rank = cardId.slice(cardId.lastIndexOf("-") + 1);
  if (rank === "A") return 11;
  if (["K", "Q", "J"].includes(rank)) return 10;
  return Number(rank);
}

export function blackjackScore(cards: string[]): { total: number; soft: boolean } {
  let total = cards.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = cards.filter((card) => card.endsWith("-A")).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

function shuffle(cards: string[]): string[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function draw(state: BlackjackState): string {
  const card = state.deck[state.deckPos];
  state.deckPos += 1;
  return card;
}

function makeHand(cards: string[], bet: number, split = false): BlackjackHand {
  const score = blackjackScore(cards);
  return {
    cards,
    bet,
    status: cards.length === 2 && score.total === 21 ? "blackjack" : "playing",
    doubled: false,
    split,
    payout: 0,
  };
}

export function initBlackjack(
  room: BarajaRoom,
  carriedStacks?: Record<string, number>,
): BlackjackState {
  const playerOrder = room.players.map((player) => player.id);
  const startingStack = room.tableConfig?.startingStack ?? 1000;
  const state: BlackjackState = {
    type: "blackjack",
    phase: "playing",
    playerOrder,
    currentIdx: 0,
    dealerHand: [],
    hands: {},
    stacks: {},
    deck: shuffle(createBlackjackDeck()),
    deckPos: 0,
    winnerIds: [],
    lastMove: null,
    roundNumber: 1,
  };
  for (const playerId of playerOrder) {
    state.stacks[playerId] = carriedStacks?.[playerId] ?? startingStack;
    state.hands[playerId] = [];
  }
  for (const playerId of playerOrder) {
    const bet = Math.min(room.tableConfig?.bigBlind ?? 10, state.stacks[playerId]);
    state.stacks[playerId] -= bet;
    state.hands[playerId] = [makeHand([draw(state), draw(state)], bet)];
  }
  state.dealerHand = [draw(state), draw(state)];
  advanceBlackjackTurn(state);
  return state;
}

function activeHand(state: BlackjackState): BlackjackHand | undefined {
  return state.hands[state.playerOrder[state.currentIdx]]?.find((hand) => hand.status === "playing");
}

function settleRound(state: BlackjackState): void {
  state.phase = "dealer";
  let dealerScore = blackjackScore(state.dealerHand);
  while (dealerScore.total < 17) {
    state.dealerHand.push(draw(state));
    dealerScore = blackjackScore(state.dealerHand);
  }
  const finalDealer = blackjackScore(state.dealerHand);
  for (const playerId of state.playerOrder) {
    for (const hand of state.hands[playerId] ?? []) {
      if (hand.status === "bust") {
        hand.payout = 0;
        continue;
      }
      const playerScore = blackjackScore(hand.cards);
      if (hand.status === "blackjack" && state.dealerHand.length === 2 && finalDealer.total !== 21) {
        // Natural blackjack pays the original stake plus 3:2 winnings.
        hand.payout = hand.bet * 2.5;
        hand.status = "won";
      } else if (finalDealer.total > 21 || playerScore.total > finalDealer.total) {
        hand.payout = hand.bet * 2;
        hand.status = "won";
      } else if (playerScore.total === finalDealer.total) {
        hand.payout = hand.bet;
        hand.status = "push";
      } else {
        hand.payout = 0;
        hand.status = "lost";
      }
      state.stacks[playerId] += hand.payout;
    }
  }
  state.phase = "ended";
  state.winnerIds = state.playerOrder.filter((playerId) =>
    (state.hands[playerId] ?? []).some((hand) => hand.status === "won"),
  );
}

function advanceBlackjackTurn(state: BlackjackState): void {
  while (state.currentIdx < state.playerOrder.length) {
    if (activeHand(state)) return;
    state.currentIdx += 1;
  }
  settleRound(state);
}

function ensureTurn(state: BlackjackState, playerId: string): BlackjackHand | { error: string } {
  if (state.phase !== "playing") return { error: "La mano ya ha terminado" };
  if (state.playerOrder[state.currentIdx] !== playerId) return { error: "No es tu turno" };
  const hand = activeHand(state);
  if (!hand) return { error: "No hay una mano activa" };
  return hand;
}

export function applyBlackjackAction(
  room: BarajaRoom,
  playerId: string,
  action: "hit" | "stand" | "double" | "split",
): BGameResult<{ room: BarajaRoom }> {
  const state = room.gameState as BlackjackState | null;
  if (!state || state.type !== "blackjack") return { error: "Estado de Blackjack incorrecto" };
  const result = ensureTurn(state, playerId);
  if ("error" in result) return result;
  const hand = result;
  const playerName = room.players.find((player) => player.id === playerId)?.name ?? "Jugador";
  if (action === "hit") {
    hand.cards.push(draw(state));
    const score = blackjackScore(hand.cards);
    if (score.total > 21) hand.status = "bust";
    if (score.total === 21) hand.status = "stood";
  } else if (action === "stand") {
    hand.status = "stood";
  } else if (action === "double") {
    if (hand.cards.length !== 2) return { error: "Solo puedes doblar con tus dos cartas iniciales" };
    if (state.stacks[playerId] < hand.bet) return { error: "No tienes fichas suficientes para doblar" };
    state.stacks[playerId] -= hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(draw(state));
    const score = blackjackScore(hand.cards);
    hand.status = score.total > 21 ? "bust" : "stood";
  } else {
    if (hand.cards.length !== 2 || cardValue(hand.cards[0]) !== cardValue(hand.cards[1])) {
      return { error: "Solo puedes dividir una pareja del mismo valor" };
    }
    if (state.stacks[playerId] < hand.bet) return { error: "No tienes fichas suficientes para dividir" };
    state.stacks[playerId] -= hand.bet;
    const [first, second] = hand.cards;
    const firstHand = makeHand([first, draw(state)], hand.bet, true);
    const secondHand = makeHand([second, draw(state)], hand.bet, true);
    state.hands[playerId] = [firstHand, secondHand, ...(state.hands[playerId] ?? []).filter((candidate) => candidate !== hand)];
  }
  state.lastMove = `${playerName} ${action === "hit" ? "pidió carta" : action === "stand" ? "se plantó" : action === "double" ? "dobló" : "dividió"}`;
  advanceBlackjackTurn(state);
  room.version += 1;
  room.log.push(state.lastMove);
  return { room };
}

export function applyBlackjackNextRound(room: BarajaRoom, playerId: string): BGameResult<{ room: BarajaRoom }> {
  const state = room.gameState as BlackjackState | null;
  if (!state || state.type !== "blackjack") return { error: "Estado de Blackjack incorrecto" };
  if (room.ownerId !== playerId) return { error: "Solo el host puede iniciar la siguiente ronda" };
  if (state.phase !== "ended") return { error: "La ronda aún no ha terminado" };
  const next = initBlackjack(room, state.stacks);
  next.roundNumber = state.roundNumber + 1;
  room.gameState = next;
  room.status = "active";
  room.version += 1;
  room.log.push("Nueva ronda de Blackjack");
  return { room };
}