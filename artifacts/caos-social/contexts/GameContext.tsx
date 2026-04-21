import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ALL_CARDS,
  CardTag,
  GameCard,
  PackId,
  PACKS,
  getCard,
} from "@/constants/cards";

const COOLDOWN_MS = 10 * 60 * 1000;
const SHIELD_MS = 5 * 60 * 1000;
const HAND_SIZE = 5;

export interface Player {
  id: string;
  name: string;
  tags: CardTag[];
  hand: string[];
  score: number;
  multiplier: number;
  shieldUntil: number;
  challengesCompleted: number;
}

export interface PendingThrow {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  cardId: string;
  createdAt: number;
  panicVotes: string[];
  panicAgainst: string[];
}

interface GameState {
  players: Player[];
  pack: PackId;
  drawPile: string[];
  cooldowns: Record<string, number>;
  pending: PendingThrow | null;
  log: string[];
}

interface GameContextValue extends GameState {
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  togglePlayerTag: (id: string, tag: CardTag) => void;
  setPack: (pack: PackId) => void;
  startGame: () => void;
  drawCard: (playerId: string) => GameCard | null;
  throwCard: (
    fromId: string,
    toId: string,
    cardId: string,
  ) => { ok: boolean; reason?: string };
  acceptPending: () => void;
  rejectPending: () => void;
  resolvePower: (powerId: "reversa" | "espejo" | "bloqueo" | "robo-carta") => void;
  voteCancel: (voterId: string, against: boolean) => void;
  cooldownLeft: (fromId: string, toId: string) => number;
  resetGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const STORAGE_KEY = "caos-social-state-v1";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDrawPile(pack: PackId): string[] {
  const packDef = PACKS.find((p) => p.id === pack)!;
  const ids = packDef.cardIds;
  const deck: string[] = [];
  for (let i = 0; i < 4; i++) deck.push(...ids);
  return shuffle(deck);
}

function newId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>({
    players: [],
    pack: "clasico",
    drawPile: [],
    cooldowns: {},
    pending: null,
    log: [],
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw));
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (hydrated) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state, hydrated]);

  const pushLog = useCallback((msg: string) => {
    setState((s) => ({ ...s, log: [msg, ...s.log].slice(0, 30) }));
  }, []);

  const addPlayer = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      players: [
        ...s.players,
        {
          id: newId(),
          name: trimmed,
          tags: [],
          hand: [],
          score: 0,
          multiplier: 1,
          shieldUntil: 0,
          challengesCompleted: 0,
        },
      ],
    }));
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }));
  }, []);

  const togglePlayerTag = useCallback((id: string, tag: CardTag) => {
    setState((s) => ({
      ...s,
      players: s.players.map((p) => {
        if (p.id !== id) return p;
        const has = p.tags.includes(tag);
        let tags = has ? p.tags.filter((t) => t !== tag) : [...p.tags, tag];
        if (!has && tag === "hardcore") {
          tags = ["hardcore"];
        } else if (!has && (tag === "abstemio" || tag === "pareja")) {
          tags = tags.filter((t) => t !== "hardcore");
        }
        return { ...p, tags };
      }),
    }));
  }, []);

  const setPack = useCallback((pack: PackId) => {
    setState((s) => ({ ...s, pack }));
  }, []);

  const startGame = useCallback(() => {
    setState((s) => {
      const pile = buildDrawPile(s.pack);
      const players = s.players.map((p) => ({
        ...p,
        hand: [],
        score: 0,
        multiplier: 1,
        shieldUntil: 0,
        challengesCompleted: 0,
      }));
      // initial deal
      for (const p of players) {
        for (let i = 0; i < HAND_SIZE; i++) {
          const next = nextValidCard(pile, p.tags);
          if (next) p.hand.push(next);
        }
      }
      return {
        ...s,
        players,
        drawPile: pile,
        cooldowns: {},
        pending: null,
        log: ["¡Que comience el CAOS!"],
      };
    });
  }, []);

  const drawCard = useCallback(
    (playerId: string): GameCard | null => {
      let drawn: GameCard | null = null;
      setState((s) => {
        const player = s.players.find((p) => p.id === playerId);
        if (!player) return s;
        if (player.hand.length >= HAND_SIZE) return s;
        const pile = [...s.drawPile];
        const cardId = nextValidCard(pile, player.tags);
        if (!cardId) return s;
        drawn = getCard(cardId) ?? null;
        return {
          ...s,
          drawPile: pile,
          players: s.players.map((p) =>
            p.id === playerId ? { ...p, hand: [...p.hand, cardId] } : p,
          ),
        };
      });
      return drawn;
    },
    [],
  );

  const cooldownLeft = useCallback(
    (fromId: string, toId: string) => {
      const key = `${fromId}->${toId}`;
      const last = state.cooldowns[key] ?? 0;
      return Math.max(0, COOLDOWN_MS - (Date.now() - last));
    },
    [state.cooldowns],
  );

  const throwCard = useCallback(
    (fromId: string, toId: string, cardId: string) => {
      if (fromId === toId) return { ok: false, reason: "No puedes lanzarte a ti mismo." };
      const card = getCard(cardId);
      if (!card) return { ok: false, reason: "Carta inválida." };
      const target = state.players.find((p) => p.id === toId);
      if (!target) return { ok: false, reason: "Jugador no encontrado." };
      if (target.shieldUntil > Date.now())
        return { ok: false, reason: "El objetivo tiene escudo activo." };
      if (
        card.blockedBy &&
        target.tags.some((t) => card.blockedBy!.includes(t))
      ) {
        return {
          ok: false,
          reason: "Esa carta no aplica al rol del objetivo.",
        };
      }
      const key = `${fromId}->${toId}`;
      const last = state.cooldowns[key] ?? 0;
      if (Date.now() - last < COOLDOWN_MS) {
        const left = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 60000);
        return { ok: false, reason: `Cooldown activo (${left} min).` };
      }
      setState((s) => ({
        ...s,
        cooldowns: { ...s.cooldowns, [key]: Date.now() },
        players: s.players.map((p) =>
          p.id === fromId ? { ...p, hand: p.hand.filter((c) => c !== cardId) } : p,
        ),
        pending: {
          id: newId(),
          fromPlayerId: fromId,
          toPlayerId: toId,
          cardId,
          createdAt: Date.now(),
          panicVotes: [],
          panicAgainst: [],
        },
      }));
      const from = state.players.find((p) => p.id === fromId);
      pushLog(`${from?.name} lanzó "${card.title}" a ${target.name}`);
      return { ok: true };
    },
    [state.players, state.cooldowns, pushLog],
  );

  const finishPending = useCallback(
    (cardId: string, toId: string, accepted: boolean) => {
      const card = getCard(cardId);
      if (!card) return;
      setState((s) => {
        const players = s.players.map((p) => {
          if (p.id !== toId) return p;
          if (accepted) {
            const isHardcore = p.tags.includes("hardcore");
            const gained = card.points * p.multiplier * (isHardcore ? 2 : 1);
            return {
              ...p,
              score: p.score + gained,
              multiplier: 1,
              challengesCompleted: p.challengesCompleted + 1,
            };
          }
          return { ...p, multiplier: p.multiplier * 2 };
        });
        return { ...s, players, pending: null };
      });
    },
    [],
  );

  const acceptPending = useCallback(() => {
    if (!state.pending) return;
    const { cardId, toPlayerId } = state.pending;
    const target = state.players.find((p) => p.id === toPlayerId);
    pushLog(`${target?.name} aceptó el reto. +puntos`);
    finishPending(cardId, toPlayerId, true);
  }, [state.pending, state.players, finishPending, pushLog]);

  const rejectPending = useCallback(() => {
    if (!state.pending) return;
    const { cardId, toPlayerId } = state.pending;
    const target = state.players.find((p) => p.id === toPlayerId);
    pushLog(`${target?.name} rechazó. Castigo x2 en el próximo reto.`);
    finishPending(cardId, toPlayerId, false);
  }, [state.pending, state.players, finishPending, pushLog]);

  const resolvePower = useCallback(
    (powerId: "reversa" | "espejo" | "bloqueo" | "robo-carta") => {
      if (!state.pending) return;
      const pending = state.pending;
      setState((s) => {
        const players = [...s.players];
        if (powerId === "reversa") {
          const fromIdx = players.findIndex((p) => p.id === pending.fromPlayerId);
          if (fromIdx >= 0) {
            const card = getCard(pending.cardId);
            const p = players[fromIdx];
            const isHardcore = p.tags.includes("hardcore");
            const gained = (card?.points ?? 0) * p.multiplier * (isHardcore ? 2 : 1);
            players[fromIdx] = {
              ...p,
              score: p.score + gained,
              challengesCompleted: p.challengesCompleted + 1,
              multiplier: 1,
            };
          }
        } else if (powerId === "espejo") {
          const toIdx = players.findIndex((p) => p.id === pending.toPlayerId);
          const fromIdx = players.findIndex((p) => p.id === pending.fromPlayerId);
          if (toIdx >= 0 && fromIdx >= 0) {
            const card = getCard(pending.cardId);
            players[toIdx] = {
              ...players[toIdx],
              score: players[toIdx].score + (card?.points ?? 0),
            };
          }
        } else if (powerId === "bloqueo") {
          const toIdx = players.findIndex((p) => p.id === pending.toPlayerId);
          if (toIdx >= 0) {
            players[toIdx] = {
              ...players[toIdx],
              shieldUntil: Date.now() + SHIELD_MS,
            };
          }
        } else if (powerId === "robo-carta") {
          const toIdx = players.findIndex((p) => p.id === pending.toPlayerId);
          const fromIdx = players.findIndex((p) => p.id === pending.fromPlayerId);
          if (toIdx >= 0 && fromIdx >= 0 && players[fromIdx].hand.length > 0) {
            const stolen = players[fromIdx].hand[0];
            players[fromIdx] = {
              ...players[fromIdx],
              hand: players[fromIdx].hand.slice(1),
            };
            players[toIdx] = {
              ...players[toIdx],
              hand: [...players[toIdx].hand, stolen],
            };
          }
        }
        return { ...s, players, pending: null };
      });
      pushLog(`Poder activado: ${powerId.toUpperCase()}`);
    },
    [state.pending, pushLog],
  );

  const voteCancel = useCallback(
    (voterId: string, against: boolean) => {
      if (!state.pending) return;
      setState((s) => {
        if (!s.pending) return s;
        const votes = against
          ? [...s.pending.panicAgainst.filter((v) => v !== voterId), voterId]
          : s.pending.panicAgainst.filter((v) => v !== voterId);
        const supports = against
          ? s.pending.panicVotes.filter((v) => v !== voterId)
          : [...s.pending.panicVotes.filter((v) => v !== voterId), voterId];
        const totalEligible = s.players.length - 1;
        if (votes.length > totalEligible / 2) {
          return {
            ...s,
            pending: null,
            log: ["🚨 Carta ANULADA por votación del grupo", ...s.log].slice(0, 30),
          };
        }
        return {
          ...s,
          pending: { ...s.pending, panicAgainst: votes, panicVotes: supports },
        };
      });
    },
    [state.pending],
  );

  const resetGame = useCallback(() => {
    setState({
      players: [],
      pack: "clasico",
      drawPile: [],
      cooldowns: {},
      pending: null,
      log: [],
    });
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      ...state,
      addPlayer,
      removePlayer,
      togglePlayerTag,
      setPack,
      startGame,
      drawCard,
      throwCard,
      acceptPending,
      rejectPending,
      resolvePower,
      voteCancel,
      cooldownLeft,
      resetGame,
    }),
    [
      state,
      addPlayer,
      removePlayer,
      togglePlayerTag,
      setPack,
      startGame,
      drawCard,
      throwCard,
      acceptPending,
      rejectPending,
      resolvePower,
      voteCancel,
      cooldownLeft,
      resetGame,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

function nextValidCard(pile: string[], tags: CardTag[]): string | null {
  for (let i = 0; i < pile.length; i++) {
    const id = pile[i];
    const card = ALL_CARDS.find((c) => c.id === id);
    if (!card) continue;
    if (card.blockedBy && tags.some((t) => card.blockedBy!.includes(t))) continue;
    pile.splice(i, 1);
    return id;
  }
  if (pile.length > 0) {
    return pile.shift() ?? null;
  }
  return null;
}
