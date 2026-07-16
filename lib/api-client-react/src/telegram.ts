/**
 * Telegram helpers: topics por sala + notificaciones de carta lanzada.
 *
 * Requiere (Expo env vars):
 *   EXPO_PUBLIC_TELEGRAM_BOT_TOKEN  — token del bot
 *   EXPO_PUBLIC_TELEGRAM_CHAT_ID    — ID del supergrupo (negativo, ej: -1004464995904)
 */

function env(key: string): string {
  if (typeof process !== "undefined" && process.env) {
    return (process.env[key] as string | undefined) ?? "";
  }
  return "";
}

function getBotToken(): string {
  return env("EXPO_PUBLIC_TELEGRAM_BOT_TOKEN") || env("TELEGRAM_BOT_TOKEN");
}

function getChatId(): string {
  return env("EXPO_PUBLIC_TELEGRAM_CHAT_ID") || env("TELEGRAM_CHAT_ID");
}

/** Convierte -1004464995904 → 4464995904 para el formato t.me/c/ */
function chatIdForUrl(chatId: string): string {
  return chatId.replace(/^-100/, "");
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Crea un Forum Topic en el grupo de Telegram para una sala.
 * Devuelve el message_thread_id (> 0) o 0 si falla / no configurado.
 */
export async function createTelegramTopic(roomCode: string): Promise<number> {
  const token = getBotToken();
  const chatId = getChatId();
  if (!token || !chatId) return 0;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/createForumTopic`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          name: `🃏 Sala ${roomCode}`,
          icon_color: 0xff93b2, // rosa neón
        }),
      },
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as { ok: boolean; result?: { message_thread_id: number } };
    if (data.ok && data.result) return data.result.message_thread_id;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Devuelve el enlace directo al hilo de Telegram de la sala.
 * Si no hay threadId configurado, devuelve string vacío.
 */
export function getTelegramTopicUrl(threadId: number): string {
  const chatId = getChatId();
  if (!chatId || !threadId) return "";
  return `https://t.me/c/${chatIdForUrl(chatId)}/${threadId}`;
}

export interface TelegramCardEvent {
  fromName: string;
  toName: string;
  cardTitle: string;
  cardEffect: string;
  points: number;
  roomCode: string;
  threadId?: number;
}

/**
 * Notifica al grupo/hilo de Telegram que se lanzó una carta.
 * Fire-and-forget: nunca bloquea ni propaga errores al juego.
 */
export function notifyCardThrown(event: TelegramCardEvent): void {
  const token = getBotToken();
  const chatId = getChatId();
  if (!token || !chatId) return;

  const text =
    `🃏 *${escapeMarkdown(event.fromName)}* → *${escapeMarkdown(event.toName)}*\n\n` +
    `📋 *${escapeMarkdown(event.cardTitle)}*\n` +
    `${escapeMarkdown(event.cardEffect)}\n\n` +
    `⭐ ${event.points} pts · Sala \`${event.roomCode}\``;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "MarkdownV2",
    disable_notification: false,
  };
  if (event.threadId && event.threadId > 0) {
    body.message_thread_id = event.threadId;
  }

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
