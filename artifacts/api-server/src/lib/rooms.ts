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
const HAND_SIZE = 5;
const MAX_LOG = 30;
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

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
  lastSeen: number;
}

export interface Room {
  code: string;
  ownerId: string;
  pack: PackId;
  status: "lobby" | "active";
  players: PlayerInternal[];
  drawPile: string[];
  cooldowns: Record<string, number>;
  log: string[];
  createdAt: number;
  version: number;
}

const rooms = new Map<string, Room>();

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

function buildPile(pack: PackId): string[] {
  const ids = getPackCardIds(pack);
  const deck: string[] = [];
  for (let i = 0; i < 4; i++) deck.push(...ids);
  return shuffle(deck);
}

function nextValidCard(pile: string[], tags: CardTag[]): string | null {
  for (let i = 0; i < pile.length; i++) {
    const id = pile[i];
    const card = ALL_CARDS.find((c) => c.id === id);
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

function gcRooms() {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.createdAt > ROOM_TTL_MS) rooms.delete(code);
  }
}

export function createRoom(opts: {
  name: string;
  pack: PackId;
  tags?: CardTag[];
}): { room: Room; playerId: string } {
  gcRooms();
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();
  const playerId = newId("p_");
  const room: Room = {
    code,
    ownerId: playerId,
    pack: opts.pack,
    status: "lobby",
    players: [
      {
        id: playerId,
        name: opts.name.trim() || "Jugador",
        tags: opts.tags ?? [],
        hand: [],
        inbox: [],
        score: 0,
        multiplier: 1,
        shieldUntil: 0,
        challengesCompleted: 0,
        lastSeen: Date.now(),
      },
    ],
    drawPile: [],
    cooldowns: {},
    log: [`${opts.name} creó la sala`],
    createdAt: Date.now(),
    version: 1,
  };
  rooms.set(code, room);
  return { room, playerId };
}

export function getRoom(code: string): Room | null {
  return rooms.get(code.toUpperCase()) ?? null;
}

export function joinRoom(
  code: string,
  opts: { name: string; tags?: CardTag[] },
): { room: Room; playerId: string } | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  const trimmed = opts.name.trim();
  if (!trimmed) return { error: "Nombre vacío" };
  // Reuse slot if same name already exists (reconnect)
  const existing = room.players.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    existing.lastSeen = Date.now();
    if (opts.tags) existing.tags = opts.tags;
    bump(room);
    return { room, playerId: existing.id };
  }
  const playerId = newId("p_");
  const player: PlayerInternal = {
    id: playerId,
    name: trimmed,
    tags: opts.tags ?? [],
    hand: [],
    inbox: [],
    score: 0,
    multiplier: 1,
    shieldUntil: 0,
    challengesCompleted: 0,
    lastSeen: Date.now(),
  };
  // Deal initial hand if game already active
  if (room.status === "active") {
    for (let i = 0; i < HAND_SIZE; i++) {
      const c = nextValidCard(room.drawPile, player.tags);
      if (c) player.hand.push(c);
    }
  }
  room.players.push(player);
  pushLog(room, `${trimmed} se unió`);
  bump(room);
  return { room, playerId };
}

export function setMyTags(
  code: string,
  playerId: string,
  tags: CardTag[],
): Room | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  let cleaned = [...new Set(tags)];
  if (cleaned.includes("hardcore"))
    cleaned = cleaned.filter((t) => t === "hardcore");
  me.tags = cleaned;
  me.lastSeen = Date.now();
  bump(room);
  return room;
}

export function startGame(
  code: string,
  playerId: string,
): Room | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.ownerId !== playerId)
    return { error: "Solo el creador puede empezar" };
  if (room.players.length < 2) return { error: "Necesitas 2+ jugadores" };
  room.drawPile = buildPile(room.pack);
  room.cooldowns = {};
  for (const p of room.players) {
    p.hand = [];
    p.inbox = [];
    p.score = 0;
    p.multiplier = 1;
    p.shieldUntil = 0;
    p.challengesCompleted = 0;
    for (let i = 0; i < HAND_SIZE; i++) {
      const c = nextValidCard(room.drawPile, p.tags);
      if (c) p.hand.push(c);
    }
  }
  room.status = "active";
  pushLog(room, "¡Que comience el CAOS!");
  bump(room);
  return room;
}

export function drawCard(
  code: string,
  playerId: string,
): { room: Room; drawnCard: GameCard } | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.status !== "active") return { error: "La partida no ha empezado" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  if (me.hand.length >= HAND_SIZE) return { error: "Mano llena" };
  const cardId = nextValidCard(room.drawPile, me.tags);
  if (!cardId) return { error: "Mazo vacío" };
  const card = getCard(cardId);
  if (!card) return { error: "Carta inválida" };
  me.hand.push(cardId);
  me.lastSeen = Date.now();
  bump(room);
  return { room, drawnCard: card };
}

export function throwCard(
  code: string,
  fromId: string,
  toId: string,
  cardId: string,
): Room | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (fromId === toId)
    return { error: "No puedes lanzarte a ti mismo" };
  const from = room.players.find((p) => p.id === fromId);
  const to = room.players.find((p) => p.id === toId);
  if (!from || !to) return { error: "Jugador no encontrado" };
  if (!from.hand.includes(cardId))
    return { error: "No tienes esa carta" };
  const card = getCard(cardId);
  if (!card) return { error: "Carta inválida" };
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
  from.lastSeen = Date.now();
  room.cooldowns[key] = Date.now();
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
  return room;
}

function applyAccept(room: Room, p: PlayerInternal, card: GameCard) {
  const isHardcore = p.tags.includes("hardcore");
  const gained = card.points * p.multiplier * (isHardcore ? 2 : 1);
  p.score += gained;
  p.multiplier = 1;
  p.challengesCompleted += 1;
}

export function respondToThrow(
  code: string,
  playerId: string,
  throwId: string,
  action:
    | "accept"
    | "reject"
    | "reversa"
    | "espejo"
    | "bloqueo"
    | "robo-carta",
): Room | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  const idx = me.inbox.findIndex((t) => t.id === throwId);
  if (idx < 0) return { error: "Carta no encontrada en tu bandeja" };
  const pending = me.inbox[idx];
  const card = getCard(pending.cardId);
  if (!card) return { error: "Carta inválida" };
  const from = room.players.find((p) => p.id === pending.fromPlayerId);

  if (action === "accept") {
    applyAccept(room, me, card);
    pushLog(room, `${me.name} aceptó "${card.title}". +${card.points * (me.tags.includes("hardcore") ? 2 : 1)} pts`);
  } else if (action === "reject") {
    me.multiplier = me.multiplier * 2;
    pushLog(room, `${me.name} rechazó "${card.title}". x${me.multiplier} en su próximo reto`);
  } else {
    // power counter — must have the card in hand
    const powerIdx = me.hand.indexOf(action);
    if (powerIdx < 0)
      return { error: `Necesitas la carta ${action} en mano` };
    me.hand.splice(powerIdx, 1);
    if (action === "reversa") {
      if (!from) return { error: "Emisor no encontrado" };
      applyAccept(room, from, card);
      pushLog(room, `${me.name} usó REVERSA. ${from.name} cumple "${card.title}"`);
    } else if (action === "espejo") {
      const points = card.points;
      me.score += points;
      pushLog(room, `${me.name} usó ESPEJO. ${from?.name ?? "El emisor"} debe cumplir y ${me.name} +${points}`);
    } else if (action === "bloqueo") {
      me.shieldUntil = Date.now() + SHIELD_MS;
      pushLog(room, `${me.name} activó BLOQUEO. Escudo 5m`);
    } else if (action === "robo-carta") {
      if (from && from.hand.length > 0) {
        const stolen = from.hand[Math.floor(Math.random() * from.hand.length)];
        from.hand = from.hand.filter((c, i) => i !== from.hand.indexOf(stolen));
        me.hand.push(stolen);
        pushLog(room, `${me.name} ROBÓ una carta a ${from.name}`);
      } else {
        pushLog(room, `${me.name} intentó ROBAR pero no había cartas`);
      }
    }
  }
  me.inbox.splice(idx, 1);
  me.lastSeen = Date.now();
  bump(room);
  return room;
}

export function panicVote(
  code: string,
  voterId: string,
  throwId: string,
  against: boolean,
): Room | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  // Find the throw across all inboxes
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
  const needed = Math.floor(eligible / 2) + 1;
  if (pending.panicAgainst.length >= needed) {
    owner.inbox = owner.inbox.filter((t) => t.id !== throwId);
    pushLog(room, `🚨 Carta anulada por votación del grupo`);
  }
  bump(room);
  return room;
}

export function resetRoom(
  code: string,
  playerId: string,
): Room | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.ownerId !== playerId)
    return { error: "Solo el creador puede reiniciar" };
  room.status = "lobby";
  room.drawPile = [];
  room.cooldowns = {};
  room.log = ["Partida reiniciada"];
  for (const p of room.players) {
    p.hand = [];
    p.inbox = [];
    p.score = 0;
    p.multiplier = 1;
    p.shieldUntil = 0;
    p.challengesCompleted = 0;
  }
  bump(room);
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
    myHand: me ? (me.hand.map((id) => getCard(id)).filter(Boolean) as GameCard[]) : [],
    myInbox: me
      ? me.inbox.map((t) => ({
          id: t.id,
          fromPlayerId: t.fromPlayerId,
          fromName: t.fromName,
          toPlayerId: t.toPlayerId,
          cardId: t.cardId,
          card: getCard(t.cardId)!,
          createdAt: t.createdAt,
          panicAgainst: t.panicAgainst,
        }))
      : [],
    cooldowns: room.cooldowns,
    version: room.version,
  };
}

export function touchPlayer(code: string, playerId: string) {
  const room = getRoom(code);
  if (!room) return;
  const p = room.players.find((x) => x.id === playerId);
  if (p) p.lastSeen = Date.now();
}
