import { getCard, getPackCardIds } from "./cards";
import type {
  CardTag,
  GameCard,
  PackId,
  PendingThrow,
  PlayerInternal,
  RespondAction,
  Room,
  Trophy,
} from "./types";

export const COOLDOWN_MS = 10 * 60 * 1000;
export const SHIELD_MS = 5 * 60 * 1000;
export const SILENCE_MS = 5 * 60 * 1000;
export const HAND_SIZE = 5;
export const MAX_LOG = 30;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newId(prefix = ""): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function buildPile(pack: PackId, customCards: GameCard[]): string[] {
  const ids = [...getPackCardIds(pack), ...customCards.map((c) => c.id)];
  const deck: string[] = [];
  for (let i = 0; i < 4; i++) deck.push(...ids);
  return shuffle(deck);
}

function nextValidCard(pile: string[], tags: CardTag[], customs: GameCard[]): string | null {
  for (let i = 0; i < pile.length; i++) {
    const id = pile[i];
    const card = getCard(id, customs);
    if (!card) continue;
    if (card.blockedBy && tags.some((t) => card.blockedBy!.includes(t))) continue;
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

function newPlayer(name: string, tags: CardTag[] = []): PlayerInternal {
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

export function createInitialRoom(opts: {
  code: string;
  name: string;
  pack: PackId;
  tags?: CardTag[];
}): { room: Room; playerId: string } {
  const player = newPlayer(opts.name, opts.tags ?? []);
  const room: Room = {
    code: opts.code,
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
  return { room, playerId: player.id };
}

export type GameResult<T = Room> = T | { error: string };

export function applyJoin(room: Room, opts: { name: string; tags?: CardTag[] }): GameResult<{ room: Room; playerId: string }> {
  const trimmed = opts.name.trim();
  if (!trimmed) return { error: "Nombre vacío" };
  const existing = room.players.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    existing.lastSeen = Date.now();
    if (opts.tags) existing.tags = opts.tags;
    bump(room);
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
  return { room, playerId: player.id };
}

export function applySetMyTags(room: Room, playerId: string, tags: CardTag[]): GameResult {
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  let cleaned = [...new Set(tags)];
  if (cleaned.includes("hardcore")) cleaned = cleaned.filter((t) => t === "hardcore");
  me.tags = cleaned;
  me.lastSeen = Date.now();
  bump(room);
  return room;
}

export function applyStartGame(room: Room, playerId: string): GameResult {
  if (room.ownerId !== playerId) return { error: "Solo el creador puede empezar" };
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
  return room;
}

export function applyDrawCard(room: Room, playerId: string): GameResult<{ room: Room; drawnCard: GameCard }> {
  if (room.status !== "active") return { error: "La partida no ha empezado" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  if (me.hand.length >= HAND_SIZE) return { error: "Mano llena" };
  const cardId = nextValidCard(room.drawPile, me.tags, room.customCards);
  if (!cardId) return { error: "Mazo vacío" };
  const card = getCard(cardId, room.customCards);
  if (!card) return { error: "Carta inválida" };
  me.hand.push(cardId);
  me.lastSeen = Date.now();
  bump(room);
  return { room, drawnCard: card };
}

export function applyThrowCard(room: Room, fromId: string, toId: string, cardId: string): GameResult {
  if (fromId === toId) return { error: "No puedes lanzarte a ti mismo" };
  if (room.silentUntil > Date.now()) return { error: "Modo silencio activo. Nada de lanzar cartas." };
  const from = room.players.find((p) => p.id === fromId);
  const to = room.players.find((p) => p.id === toId);
  if (!from || !to) return { error: "Jugador no encontrado" };
  if (!from.hand.includes(cardId)) return { error: "No tienes esa carta" };
  const card = getCard(cardId, room.customCards);
  if (!card) return { error: "Carta inválida" };
  if (card.isPower) return { error: "Esta carta es de poder. Úsala con 'usar poder'." };
  if (to.shieldUntil > Date.now()) return { error: "El objetivo tiene escudo activo" };
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

  if (to.panicShield) {
    to.panicShield = false;
    pushLog(room, `🛡️ ${to.name} usó COMODÍN: anuló "${card.title}" de ${from.name}`);
    bump(room);
    return room;
  }

  const pending: PendingThrow = {
    id: newId("t_"),
    fromPlayerId: fromId,
    fromName: from.name,
    toPlayerId: toId,
    cardId,
    card,
    createdAt: Date.now(),
    panicAgainst: [],
  };
  to.inbox.push(pending);
  pushLog(room, `${from.name} lanzó "${card.title}" a ${to.name}`);
  bump(room);
  return room;
}

function applyAccept(p: PlayerInternal, card: GameCard) {
  const isHardcore = p.tags.includes("hardcore");
  const gained = card.points * p.multiplier * (isHardcore ? 2 : 1);
  p.score += gained;
  p.multiplier = 1;
  p.challengesCompleted += 1;
}

export function applyRespondToThrow(room: Room, playerId: string, throwId: string, action: RespondAction): GameResult {
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  const idx = me.inbox.findIndex((t) => t.id === throwId);
  if (idx < 0) return { error: "Carta no encontrada en tu bandeja" };
  const pending = me.inbox[idx];
  const card = getCard(pending.cardId, room.customCards);
  if (!card) return { error: "Carta inválida" };
  const from = room.players.find((p) => p.id === pending.fromPlayerId);

  if (action === "accept") {
    applyAccept(me, card);
    pushLog(room, `${me.name} aceptó "${card.title}". +${card.points * (me.tags.includes("hardcore") ? 2 : 1)} pts`);
  } else if (action === "reject") {
    me.multiplier = me.multiplier * 2;
    me.challengesRejected += 1;
    pushLog(room, `${me.name} rechazó "${card.title}". x${me.multiplier} en su próximo reto`);
  } else {
    const powerIdx = me.hand.indexOf(action);
    if (powerIdx < 0) return { error: `Necesitas la carta ${action} en mano` };
    me.hand.splice(powerIdx, 1);
    me.powersUsed += 1;
    if (action === "reversa") {
      if (!from) return { error: "Emisor no encontrado" };
      applyAccept(from, card);
      pushLog(room, `${me.name} usó REVERSA. ${from.name} cumple "${card.title}"`);
    } else if (action === "espejo") {
      const points = card.points;
      me.score += points;
      pushLog(room, `${me.name} usó ESPEJO. ${from?.name ?? "El emisor"} debe cumplir; ${me.name} +${points}`);
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
      pushLog(room, `🃏 ${me.name} usó COMODÍN: anula "${card.title}" sin consecuencias`);
    }
  }
  me.inbox.splice(idx, 1);
  me.lastSeen = Date.now();
  bump(room);
  return room;
}

export function applyPanicVote(room: Room, voterId: string, throwId: string, against: boolean): GameResult {
  let owner: PlayerInternal | undefined;
  let pending: PendingThrow | undefined;
  for (const p of room.players) {
    const t = p.inbox.find((x) => x.id === throwId);
    if (t) { owner = p; pending = t; break; }
  }
  if (!owner || !pending) return { error: "Carta no encontrada" };
  if (voterId === owner.id) return { error: "No puedes votar tu propia carta" };
  if (against) {
    if (!pending.panicAgainst.includes(voterId)) pending.panicAgainst.push(voterId);
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
  return room;
}

export function applyAddCustomCard(room: Room, playerId: string, body: { title: string; effect: string; points: number }): GameResult {
  if (room.ownerId !== playerId) return { error: "Solo el creador puede añadir cartas" };
  if (room.status !== "lobby") return { error: "Solo se pueden añadir cartas antes de empezar" };
  const title = (body.title ?? "").trim();
  const effect = (body.effect ?? "").trim();
  if (!title || !effect) return { error: "Título y efecto son obligatorios" };
  if (title.length > 60 || effect.length > 200) return { error: "Texto demasiado largo" };
  if (room.customCards.length >= 25) return { error: "Máximo 25 cartas personalizadas" };
  const points = Math.max(5, Math.min(100, Math.round(body.points || 15)));
  const card: GameCard = {
    id: "custom-" + newId(""),
    title, effect,
    power: "Carta personalizada por el grupo.",
    category: "social",
    points, custom: true,
  };
  room.customCards.push(card);
  pushLog(room, `✨ Carta personalizada añadida: "${title}"`);
  bump(room);
  return room;
}

export function applyUsePower(room: Room, playerId: string, cardId: string, targetPlayerId?: string): GameResult {
  if (room.status !== "active") return { error: "La partida no ha empezado" };
  const me = room.players.find((p) => p.id === playerId);
  if (!me) return { error: "Jugador no encontrado" };
  const handIdx = me.hand.indexOf(cardId);
  if (handIdx < 0) return { error: "No tienes esa carta" };
  const card = getCard(cardId, room.customCards);
  if (!card || !card.isPower) return { error: "Esa carta no es de poder" };

  switch (cardId) {
    case "comodin":
      me.panicShield = true;
      pushLog(room, `🃏 ${me.name} preparó un COMODÍN (anulará el próximo ataque)`);
      break;
    case "silencio":
      room.silentUntil = Date.now() + SILENCE_MS;
      pushLog(room, `🤫 ${me.name} activó CONO DE SILENCIO (5 min)`);
      break;
    case "doble-puntos":
      me.multiplier = me.multiplier * 2;
      pushLog(room, `✨ ${me.name} activó DOBLE PUNTOS`);
      break;
    case "rerol": {
      const old = me.hand.length;
      me.hand = [];
      for (let i = 0; i < HAND_SIZE; i++) {
        const c = nextValidCard(room.drawPile, me.tags, room.customCards);
        if (c) me.hand.push(c);
      }
      pushLog(room, `🔄 ${me.name} hizo REROL de su mano (${old} → ${me.hand.length})`);
      bump(room);
      return room;
    }
    case "ladron": {
      const target = room.players.find((p) => p.id === targetPlayerId);
      if (!target || target.id === me.id) return { error: "Elige un objetivo válido" };
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
    case "amplificador":
      me.multiplier = Math.max(me.multiplier, 3);
      pushLog(room, `📢 ${me.name} activó AMPLIFICADOR (próximo reto x3)`);
      break;
    case "vuelta-tortilla": {
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      const scores = sorted.map((p) => p.score).reverse();
      sorted.forEach((p, i) => (p.score = scores[i]));
      pushLog(room, `🔄 ${me.name} usó VUELTA DE TORTILLA: ranking invertido`);
      break;
    }
    case "regalo": {
      const target = room.players.find((p) => p.id === targetPlayerId);
      if (!target || target.id === me.id) return { error: "Elige un destinatario" };
      const giftable = me.hand.filter((c) => c !== cardId);
      if (giftable.length === 0) return { error: "No tienes cartas para regalar" };
      const gift = giftable[Math.floor(Math.random() * giftable.length)];
      me.hand.splice(me.hand.indexOf(gift), 1);
      target.hand.push(gift);
      pushLog(room, `🎁 ${me.name} regaló una carta a ${target.name}`);
      break;
    }
    case "revelacion":
      pushLog(room, `🔍 ${me.name} usó REVELACIÓN (vio una mano)`);
      break;
    case "inversion": {
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      const last = sorted[sorted.length - 1];
      if (last && last.id !== me.id) {
        const tmp = me.score;
        me.score = last.score;
        last.score = tmp;
        pushLog(room, `🔁 ${me.name} usó INVERSIÓN: intercambió puntos con ${last.name}`);
      }
      break;
    }
    default:
      return { error: "Esta carta solo se usa como respuesta a un reto" };
  }
  me.hand.splice(handIdx, 1);
  me.powersUsed += 1;
  me.lastSeen = Date.now();
  bump(room);
  return room;
}

export function applyEndGame(room: Room, playerId: string): GameResult {
  if (room.ownerId !== playerId) return { error: "Solo el creador puede finalizar" };
  if (room.status !== "active") return { error: "La partida no está activa" };

  const trophies: Trophy[] = [];
  if (room.players.length > 0) {
    const top = [...room.players].sort((a, b) => b.score - a.score)[0];
    trophies.push({ playerId: top.id, playerName: top.name, title: "El Rey del Caos", description: `Ganador absoluto con ${top.score} puntos`, emoji: "👑" });

    const valiente = [...room.players].sort((a, b) => b.challengesCompleted - a.challengesCompleted)[0];
    if (valiente && valiente.challengesCompleted > 0)
      trophies.push({ playerId: valiente.id, playerName: valiente.name, title: "El Más Valiente", description: `Cumplió ${valiente.challengesCompleted} retos`, emoji: "🦁" });

    const rajado = [...room.players].sort((a, b) => b.challengesRejected - a.challengesRejected)[0];
    if (rajado && rajado.challengesRejected > 0)
      trophies.push({ playerId: rajado.id, playerName: rajado.name, title: "El Rajado", description: `Rechazó ${rajado.challengesRejected} retos`, emoji: "🐔" });

    const estratega = [...room.players].sort((a, b) => b.powersUsed - a.powersUsed)[0];
    if (estratega && estratega.powersUsed > 0)
      trophies.push({ playerId: estratega.id, playerName: estratega.name, title: "El Estratega", description: `Usó ${estratega.powersUsed} cartas de poder`, emoji: "🧠" });

    const provocador = [...room.players].sort((a, b) => b.cardsThrown - a.cardsThrown)[0];
    if (provocador && provocador.cardsThrown > 0)
      trophies.push({ playerId: provocador.id, playerName: provocador.name, title: "El Provocador", description: `Lanzó ${provocador.cardsThrown} cartas`, emoji: "🔥" });
  }

  room.status = "ended";
  room.endedAt = Date.now();
  room.trophies = trophies;
  pushLog(room, "🏆 ¡Partida finalizada! Ver trofeos.");
  bump(room);
  return room;
}

export function applyResetRoom(room: Room, playerId: string): GameResult {
  if (room.ownerId !== playerId) return { error: "Solo el creador puede reiniciar" };
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
    myHand: me ? (me.hand.map((id) => getCard(id, room.customCards)).filter(Boolean) as GameCard[]) : [],
    myInbox: me ? me.inbox.map((t) => ({
      id: t.id,
      fromPlayerId: t.fromPlayerId,
      fromName: t.fromName,
      toPlayerId: t.toPlayerId,
      cardId: t.cardId,
      card: getCard(t.cardId, room.customCards)!,
      createdAt: t.createdAt,
      panicAgainst: t.panicAgainst,
    })) : [],
    cooldowns: room.cooldowns,
    version: room.version,
    silentUntil: room.silentUntil,
    customCards: room.customCards,
    trophies: room.trophies,
    endedAt: room.endedAt,
  };
}
