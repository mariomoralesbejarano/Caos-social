import { db, roomsTable } from "@workspace/db";
import { eq, lt, sql } from "drizzle-orm";
import {
  ALL_CARDS,
  CardTag,
  GameCard,
  PackId,
  getCard,
  getPackCardIds,
} from "./cards";

const COOLDOWN_MS = 10 * 60 * 1000;
const SHIELD_MS = 5 * 60 * 1000;
const SILENCE_MS = 5 * 60 * 1000;
const HAND_SIZE = 5;
const MAX_LOG = 30;
const ROOM_TTL_MS = 48 * 60 * 60 * 1000; // 48h inactivity
const GC_INTERVAL_MS = 30 * 60 * 1000; // every 30min

export interface PendingThrow {
  id: string;
  fromPlayerId: string;
  fromName: string;
  toPlayerId: string;
  cardId: string;
  createdAt: number;
  panicAgainst: string[];
}

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

export interface Trophy {
  playerId: string;
  playerName: string;
  title: string;
  description: string;
  emoji: string;
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

// =====================================================
// Persistence layer (Postgres via Drizzle)
// =====================================================

const cache = new Map<string, Room>();
let lastGc = 0;

async function loadRoom(code: string): Promise<Room | null> {
  const upper = code.toUpperCase();
  if (cache.has(upper)) return cache.get(upper)!;
  const rows = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.code, upper));
  if (rows.length === 0) return null;
  const room = rows[0].state as unknown as Room;
  cache.set(upper, room);
  return room;
}

async function saveRoom(room: Room): Promise<void> {
  cache.set(room.code, room);
  await db
    .insert(roomsTable)
    .values({
      code: room.code,
      state: room as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: roomsTable.code,
      set: {
        state: room as unknown as Record<string, unknown>,
        updatedAt: sql`now()`,
      },
    });
}

async function gcInactiveRooms(): Promise<void> {
  const now = Date.now();
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  try {
    const cutoff = new Date(now - ROOM_TTL_MS);
    const deleted = await db
      .delete(roomsTable)
      .where(lt(roomsTable.updatedAt, cutoff))
      .returning({ code: roomsTable.code });
    for (const r of deleted) cache.delete(r.code);
  } catch (err) {
    console.error("[gc] error", err);
  }
}

// fire-and-forget periodic GC
setInterval(() => {
  void gcInactiveRooms();
}, GC_INTERVAL_MS).unref();

// =====================================================
// Helpers
// =====================================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newId(prefix = ""): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildPile(pack: PackId, customCards: GameCard[]): string[] {
  const ids = [...getPackCardIds(pack), ...customCards.map((c) => c.id)];
  const deck: string[] = [];
  for (let i = 0; i < 4; i++) deck.push(...ids);
  return shuffle(deck);
}

function resolveCard(id: string, customs: GameCard[]): GameCard | undefined {
  return getCard(id, customs);
}

function nextValidCard(
  pile: string[],
  tags: CardTag[],
  customs: GameCard[],
): string | null {
  for (let i = 0; i < pile.length; i++) {
    const id = pile[i];
    const card = resolveCard(id, customs);
    if (!card) continue;
    if (card.blockedBy && tags.some((t) => card.blockedBy!.includes(t)))
      continue;
    pile.splice(i, 1);
    return id;
  }
  if (pile.length > 0) return pile.shift() ?? null;
  return null;
}

function pushLog(room: Room, msg: string) {
  room.log = [msg, ...room.log].slice(0, MAX_LOG);
}

function bump(room: Room) {
  room.version += 1;
}

function newPlayer(
  name: string,
  tags: CardTag[] = [],
): PlayerInternal {
  return {
    id: newId("p_"),
    name: name.trim() || "Jugador",
    tags,
    hand: [],
    inbox: [],
    score: 0,
    multiplier: 1,
    shieldUntil: 0,
    challengesCompleted: 0,
    challengesRejected: 0,
    cardsThrown: 0,
    powersUsed: 0,
    panicShield: false,
    lastSeen: Date.now(),
  };
}

// =====================================================
// Public API (all async — DB-backed)
// =====================================================

export async function createRoom(opts: {
  name: string;
  pack: PackId;
  tags?: CardTag[];
}): Promise<{ room: Room; playerId: string }> {
  await gcInactiveRooms();
  let code = generateCode();
  // ensure unique
  while (await loadRoom(code)) code = generateCode();
  const player = newPlayer(opts.name, opts.tags ?? []);
  const room: Room = {
    code,
    ownerId: player.id,
    pack: opts.pack,
    status: "lobby",
    players: [player],
    drawPile: [],
    cooldowns: {},
    log: [`${player.name} creó la sala`],
    customCards: [],
    silentUntil: 0,
    trophies: [],
    endedAt: 0,
    createdAt: Date.now(),
    version: 1,
  };
  await saveRoom(room);
  return { room, playerId: player.id };
}

export async function getRoom(code: string): Promise<Room | null> {
  return loadRoom(code);
}

export async function joinRoom(
  code: string,
  opts: { name: string; tags?: CardTag[] },
): Promise<{ room: Room; playerId: string } | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  const trimmed = opts.name.trim();
  if (!trimmed) return { error: "Nombre vacío" };
  const existing = room.players.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    existing.lastSeen = Date.now();
    if (opts.tags) existing.tags = opts.tags;
    bump(room);
    await saveRoom(room);
    return { room, playerId: existing.id };
  }
  const player = newPlayer(trimmed, opts.tags ?? []);
  if (room.status === "active") {
    for (let i = 0; i < HAND_SIZE; i++) {
      const c = nextValidCard(room.drawPile, player.tags, room.customCards);
      if (c) player.hand.push(c);
    }
  }
  room.players.push(player);
  pushLog(room, `${trimmed} se unió`);
  bump(room);
  await saveRoom(room);
  return { room, playerId: player.id };
}

export async function setMyTags(
  code: string,
  playerId: string,
  tags: CardTag[],
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  let cleaned = [...new Set(tags)];
  if (cleaned.includes("hardcore"))
    cleaned = cleaned.filter((t) => t === "hardcore");
  me.tags = cleaned;
  me.lastSeen = Date.now();
  bump(room);
  await saveRoom(room);
  return room;
}

export async function startGame(
  code: string,
  playerId: string,
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.ownerId !== playerId)
    return { error: "Solo el creador puede empezar" };
  if (room.players.length < 2) return { error: "Necesitas 2+ jugadores" };
  room.drawPile = buildPile(room.pack, room.customCards);
  room.cooldowns = {};
  room.silentUntil = 0;
  room.trophies = [];
  room.endedAt = 0;
  for (const p of room.players) {
    p.hand = [];
    p.inbox = [];
    p.score = 0;
    p.multiplier = 1;
    p.shieldUntil = 0;
    p.challengesCompleted = 0;
    p.challengesRejected = 0;
    p.cardsThrown = 0;
    p.powersUsed = 0;
    p.panicShield = false;
    for (let i = 0; i < HAND_SIZE; i++) {
      const c = nextValidCard(room.drawPile, p.tags, room.customCards);
      if (c) p.hand.push(c);
    }
  }
  room.status = "active";
  pushLog(room, "¡Que comience el CAOS!");
  bump(room);
  await saveRoom(room);
  return room;
}

export async function drawCard(
  code: string,
  playerId: string,
): Promise<{ room: Room; drawnCard: GameCard } | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.status !== "active") return { error: "La partida no ha empezado" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  if (me.hand.length >= HAND_SIZE) return { error: "Mano llena" };
  const cardId = nextValidCard(room.drawPile, me.tags, room.customCards);
  if (!cardId) return { error: "Mazo vacío" };
  const card = resolveCard(cardId, room.customCards);
  if (!card) return { error: "Carta inválida" };
  me.hand.push(cardId);
  me.lastSeen = Date.now();
  bump(room);
  await saveRoom(room);
  return { room, drawnCard: card };
}

export async function throwCard(
  code: string,
  fromId: string,
  toId: string,
  cardId: string,
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (fromId === toId) return { error: "No puedes lanzarte a ti mismo" };
  if (room.silentUntil > Date.now())
    return { error: "Modo silencio activo. Nada de lanzar cartas." };
  const from = room.players.find((p) => p.id === fromId);
  const to = room.players.find((p) => p.id === toId);
  if (!from || !to) return { error: "Jugador no encontrado" };
  if (!from.hand.includes(cardId)) return { error: "No tienes esa carta" };
  const card = resolveCard(cardId, room.customCards);
  if (!card) return { error: "Carta inválida" };
  if (card.isPower)
    return { error: "Esta carta es de poder. Úsala con 'usar poder'." };
  if (to.shieldUntil > Date.now())
    return { error: "El objetivo tiene escudo activo" };
  if (card.blockedBy && to.tags.some((t) => card.blockedBy!.includes(t)))
    return { error: "Esa carta no aplica al rol del objetivo" };
  const key = `${fromId}->${toId}`;
  const last = room.cooldowns[key] ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    const left = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 60000);
    return { error: `Cooldown ${left}m con ese jugador` };
  }
  from.hand = from.hand.filter((c) => c !== cardId);
  from.cardsThrown += 1;
  from.lastSeen = Date.now();
  room.cooldowns[key] = Date.now();

  // Auto-cancel via comodin shield
  if (to.panicShield) {
    to.panicShield = false;
    pushLog(room, `🛡️ ${to.name} usó COMODÍN: anuló "${card.title}" de ${from.name}`);
    bump(room);
    await saveRoom(room);
    return room;
  }

  const pending: PendingThrow = {
    id: newId("t_"),
    fromPlayerId: fromId,
    fromName: from.name,
    toPlayerId: toId,
    cardId,
    createdAt: Date.now(),
    panicAgainst: [],
  };
  to.inbox.push(pending);
  pushLog(room, `${from.name} lanzó "${card.title}" a ${to.name}`);
  bump(room);
  await saveRoom(room);
  return room;
}

function applyAccept(p: PlayerInternal, card: GameCard) {
  const isHardcore = p.tags.includes("hardcore");
  const gained = card.points * p.multiplier * (isHardcore ? 2 : 1);
  p.score += gained;
  p.multiplier = 1;
  p.challengesCompleted += 1;
}

export type RespondAction =
  | "accept"
  | "reject"
  | "reversa"
  | "espejo"
  | "bloqueo"
  | "robo-carta"
  | "comodin";

export async function respondToThrow(
  code: string,
  playerId: string,
  throwId: string,
  action: RespondAction,
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  const idx = me.inbox.findIndex((t) => t.id === throwId);
  if (idx < 0) return { error: "Carta no encontrada en tu bandeja" };
  const pending = me.inbox[idx];
  const card = resolveCard(pending.cardId, room.customCards);
  if (!card) return { error: "Carta inválida" };
  const from = room.players.find((p) => p.id === pending.fromPlayerId);

  if (action === "accept") {
    applyAccept(me, card);
    pushLog(
      room,
      `${me.name} aceptó "${card.title}". +${card.points * (me.tags.includes("hardcore") ? 2 : 1)} pts`,
    );
  } else if (action === "reject") {
    me.multiplier = me.multiplier * 2;
    me.challengesRejected += 1;
    pushLog(
      room,
      `${me.name} rechazó "${card.title}". x${me.multiplier} en su próximo reto`,
    );
  } else {
    const powerIdx = me.hand.indexOf(action);
    if (powerIdx < 0) return { error: `Necesitas la carta ${action} en mano` };
    me.hand.splice(powerIdx, 1);
    me.powersUsed += 1;
    if (action === "reversa") {
      if (!from) return { error: "Emisor no encontrado" };
      applyAccept(from, card);
      pushLog(
        room,
        `${me.name} usó REVERSA. ${from.name} cumple "${card.title}"`,
      );
    } else if (action === "espejo") {
      const points = card.points;
      me.score += points;
      pushLog(
        room,
        `${me.name} usó ESPEJO. ${from?.name ?? "El emisor"} debe cumplir; ${me.name} +${points}`,
      );
    } else if (action === "bloqueo") {
      me.shieldUntil = Date.now() + SHIELD_MS;
      pushLog(room, `${me.name} activó BLOQUEO. Escudo 5m`);
    } else if (action === "robo-carta") {
      if (from && from.hand.length > 0) {
        const stolenIdx = Math.floor(Math.random() * from.hand.length);
        const [stolen] = from.hand.splice(stolenIdx, 1);
        me.hand.push(stolen);
        pushLog(room, `${me.name} ROBÓ una carta a ${from.name}`);
      } else {
        pushLog(room, `${me.name} intentó ROBAR pero no había cartas`);
      }
    } else if (action === "comodin") {
      pushLog(
        room,
        `🃏 ${me.name} usó COMODÍN: anula "${card.title}" sin consecuencias`,
      );
    }
  }
  me.inbox.splice(idx, 1);
  me.lastSeen = Date.now();
  bump(room);
  await saveRoom(room);
  return room;
}

export async function panicVote(
  code: string,
  voterId: string,
  throwId: string,
  against: boolean,
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  let owner: PlayerInternal | undefined;
  let pending: PendingThrow | undefined;
  for (const p of room.players) {
    const t = p.inbox.find((x) => x.id === throwId);
    if (t) {
      owner = p;
      pending = t;
      break;
    }
  }
  if (!owner || !pending) return { error: "Carta no encontrada" };
  if (voterId === owner.id) return { error: "No puedes votar tu propia carta" };
  if (against) {
    if (!pending.panicAgainst.includes(voterId))
      pending.panicAgainst.push(voterId);
  } else {
    pending.panicAgainst = pending.panicAgainst.filter((v) => v !== voterId);
  }
  const eligible = room.players.length - 1;
  const needed = Math.max(2, Math.floor(eligible / 2) + 1);
  if (pending.panicAgainst.length >= needed) {
    owner.inbox = owner.inbox.filter((t) => t.id !== throwId);
    pushLog(room, `🚨 Carta anulada por votación del grupo`);
  }
  bump(room);
  await saveRoom(room);
  return room;
}

export async function addCustomCard(
  code: string,
  playerId: string,
  body: { title: string; effect: string; points: number },
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.ownerId !== playerId)
    return { error: "Solo el creador puede añadir cartas" };
  if (room.status !== "lobby")
    return { error: "Solo se pueden añadir cartas antes de empezar" };
  const title = (body.title ?? "").trim();
  const effect = (body.effect ?? "").trim();
  if (!title || !effect) return { error: "Título y efecto son obligatorios" };
  if (title.length > 60 || effect.length > 200)
    return { error: "Texto demasiado largo" };
  if (room.customCards.length >= 25)
    return { error: "Máximo 25 cartas personalizadas" };
  const points = Math.max(5, Math.min(100, Math.round(body.points || 15)));
  const card: GameCard = {
    id: "custom-" + newId(""),
    title,
    effect,
    power: "Carta personalizada por el grupo.",
    category: "social",
    points,
    custom: true,
  };
  room.customCards.push(card);
  pushLog(room, `✨ Carta personalizada añadida: "${title}"`);
  bump(room);
  await saveRoom(room);
  return room;
}

export async function usePower(
  code: string,
  playerId: string,
  cardId: string,
  targetPlayerId?: string,
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.status !== "active") return { error: "La partida no ha empezado" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  const handIdx = me.hand.indexOf(cardId);
  if (handIdx < 0) return { error: "No tienes esa carta" };
  const card = resolveCard(cardId, room.customCards);
  if (!card || !card.isPower) return { error: "Esa carta no es de poder" };

  // Powers used proactively
  switch (cardId) {
    case "comodin": {
      me.panicShield = true;
      pushLog(room, `🃏 ${me.name} preparó un COMODÍN (anulará el próximo ataque)`);
      break;
    }
    case "silencio": {
      room.silentUntil = Date.now() + SILENCE_MS;
      pushLog(room, `🤫 ${me.name} activó CONO DE SILENCIO (5 min)`);
      break;
    }
    case "doble-puntos": {
      me.multiplier = me.multiplier * 2;
      pushLog(room, `✨ ${me.name} activó DOBLE PUNTOS`);
      break;
    }
    case "rerol": {
      const old = me.hand.length;
      me.hand = [];
      for (let i = 0; i < HAND_SIZE; i++) {
        const c = nextValidCard(room.drawPile, me.tags, room.customCards);
        if (c) me.hand.push(c);
      }
      pushLog(room, `🔄 ${me.name} hizo REROL de su mano (${old} → ${me.hand.length})`);
      // dont consume rerol again
      bump(room);
      await saveRoom(room);
      return room;
    }
    case "ladron": {
      const target = room.players.find((p) => p.id === targetPlayerId);
      if (!target || target.id === me.id)
        return { error: "Elige un objetivo válido" };
      const robbed = Math.min(5, target.score);
      target.score -= robbed;
      me.score += robbed;
      pushLog(room, `🦹 ${me.name} robó ${robbed} pts a ${target.name}`);
      break;
    }
    case "escudo-grupal": {
      const target = room.players.find((p) => p.id === targetPlayerId);
      if (!target) return { error: "Elige un objetivo válido" };
      target.shieldUntil = Date.now() + 3 * 60 * 1000;
      pushLog(room, `🛡️ ${me.name} dio escudo a ${target.name} (3m)`);
      break;
    }
    case "amplificador": {
      // sets multiplier=3 on the next accepter — we mark on caller as pending bonus pool
      // simplification: apply x3 to caller's next accept
      me.multiplier = Math.max(me.multiplier, 3);
      pushLog(room, `📢 ${me.name} activó AMPLIFICADOR (próximo reto x3)`);
      break;
    }
    case "vuelta-tortilla": {
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      const scores = sorted.map((p) => p.score).reverse();
      sorted.forEach((p, i) => (p.score = scores[i]));
      pushLog(room, `🔄 ${me.name} usó VUELTA DE TORTILLA: ranking invertido`);
      break;
    }
    case "regalo": {
      const target = room.players.find((p) => p.id === targetPlayerId);
      if (!target || target.id === me.id)
        return { error: "Elige un destinatario" };
      // give one random card from hand (other than this one)
      const giftable = me.hand.filter((c) => c !== cardId);
      if (giftable.length === 0) return { error: "No tienes cartas para regalar" };
      const gift = giftable[Math.floor(Math.random() * giftable.length)];
      me.hand = me.hand.filter((c, i) => i !== me.hand.indexOf(gift));
      target.hand.push(gift);
      pushLog(room, `🎁 ${me.name} regaló una carta a ${target.name}`);
      break;
    }
    case "revelacion": {
      pushLog(room, `🔍 ${me.name} usó REVELACIÓN (vio una mano)`);
      break;
    }
    case "inversion": {
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      const last = sorted[sorted.length - 1];
      if (last && last.id !== me.id) {
        const tmp = me.score;
        me.score = last.score;
        last.score = tmp;
        pushLog(
          room,
          `🔁 ${me.name} usó INVERSIÓN: intercambió puntos con ${last.name}`,
        );
      }
      break;
    }
    default:
      // bloqueo / espejo / reversa / robo-carta solo se usan como counter
      return { error: "Esta carta solo se usa como respuesta a un reto" };
  }
  // consume card
  me.hand.splice(handIdx, 1);
  me.powersUsed += 1;
  me.lastSeen = Date.now();
  bump(room);
  await saveRoom(room);
  return room;
}

export async function endGame(
  code: string,
  playerId: string,
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.ownerId !== playerId)
    return { error: "Solo el creador puede finalizar" };
  if (room.status !== "active")
    return { error: "La partida no está activa" };

  const trophies: Trophy[] = [];
  if (room.players.length > 0) {
    const top = [...room.players].sort((a, b) => b.score - a.score)[0];
    trophies.push({
      playerId: top.id,
      playerName: top.name,
      title: "El Rey del Caos",
      description: `Ganador absoluto con ${top.score} puntos`,
      emoji: "👑",
    });

    const valiente = [...room.players].sort(
      (a, b) => b.challengesCompleted - a.challengesCompleted,
    )[0];
    if (valiente && valiente.challengesCompleted > 0) {
      trophies.push({
        playerId: valiente.id,
        playerName: valiente.name,
        title: "El Más Valiente",
        description: `Cumplió ${valiente.challengesCompleted} retos`,
        emoji: "🦁",
      });
    }

    const rajado = [...room.players].sort(
      (a, b) => b.challengesRejected - a.challengesRejected,
    )[0];
    if (rajado && rajado.challengesRejected > 0) {
      trophies.push({
        playerId: rajado.id,
        playerName: rajado.name,
        title: "El Rajado",
        description: `Rechazó ${rajado.challengesRejected} retos`,
        emoji: "🐔",
      });
    }

    const estratega = [...room.players].sort(
      (a, b) => b.powersUsed - a.powersUsed,
    )[0];
    if (estratega && estratega.powersUsed > 0) {
      trophies.push({
        playerId: estratega.id,
        playerName: estratega.name,
        title: "El Estratega",
        description: `Usó ${estratega.powersUsed} cartas de poder`,
        emoji: "🧠",
      });
    }

    const provocador = [...room.players].sort(
      (a, b) => b.cardsThrown - a.cardsThrown,
    )[0];
    if (provocador && provocador.cardsThrown > 0) {
      trophies.push({
        playerId: provocador.id,
        playerName: provocador.name,
        title: "El Provocador",
        description: `Lanzó ${provocador.cardsThrown} cartas`,
        emoji: "🔥",
      });
    }
  }

  room.status = "ended";
  room.endedAt = Date.now();
  room.trophies = trophies;
  pushLog(room, "🏆 ¡Partida finalizada! Ver trofeos.");
  bump(room);
  await saveRoom(room);
  return room;
}

export async function resetRoom(
  code: string,
  playerId: string,
): Promise<Room | { error: string }> {
  const room = await loadRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.ownerId !== playerId)
    return { error: "Solo el creador puede reiniciar" };
  room.status = "lobby";
  room.drawPile = [];
  room.cooldowns = {};
  room.silentUntil = 0;
  room.trophies = [];
  room.endedAt = 0;
  room.log = ["Partida reiniciada"];
  for (const p of room.players) {
    p.hand = [];
    p.inbox = [];
    p.score = 0;
    p.multiplier = 1;
    p.shieldUntil = 0;
    p.challengesCompleted = 0;
    p.challengesRejected = 0;
    p.cardsThrown = 0;
    p.powersUsed = 0;
    p.panicShield = false;
  }
  bump(room);
  await saveRoom(room);
  return room;
}

export function serializeRoom(room: Room, viewerId: string) {
  const me = room.players.find((p) => p.id === viewerId);
  return {
    code: room.code,
    ownerId: room.ownerId,
    pack: room.pack,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      tags: p.tags,
      handCount: p.hand.length,
      score: p.score,
      multiplier: p.multiplier,
      shieldUntil: p.shieldUntil,
      challengesCompleted: p.challengesCompleted,
      connected: Date.now() - p.lastSeen < 30 * 1000,
    })),
    log: room.log,
    myHand: me
      ? (me.hand
          .map((id) => resolveCard(id, room.customCards))
          .filter(Boolean) as GameCard[])
      : [],
    myInbox: me
      ? me.inbox.map((t) => ({
          id: t.id,
          fromPlayerId: t.fromPlayerId,
          fromName: t.fromName,
          toPlayerId: t.toPlayerId,
          cardId: t.cardId,
          card: resolveCard(t.cardId, room.customCards)!,
          createdAt: t.createdAt,
          panicAgainst: t.panicAgainst,
        }))
      : [],
    cooldowns: room.cooldowns,
    version: room.version,
    silentUntil: room.silentUntil,
    customCards: room.customCards,
    trophies: room.trophies,
    endedAt: room.endedAt,
  };
}

export async function touchPlayer(code: string, playerId: string) {
  const room = await loadRoom(code);
  if (!room) return;
  const p = room.players.find((x) => x.id === playerId);
  if (p) {
    p.lastSeen = Date.now();
    // touch updatedAt without bumping version
    await saveRoom(room);
  }
}
