/**
 * Telegram helpers: topics por sala + notificaciones de carta lanzada.
 *
 * Metro/Expo SOLO inyecta variables EXPO_PUBLIC_* cuando se accede con
 * notación de punto estática: process.env.EXPO_PUBLIC_FOO
 * El acceso dinámico (process.env[key]) siempre devuelve undefined en el bundle.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: any;

function getBotToken(): string {
  try { return process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN ?? ""; } catch { return ""; }
}

function getChatId(): string {
  try { return process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID ?? ""; } catch { return ""; }
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
  console.log("[Telegram] createTelegramTopic →", { roomCode, hasToken: !!token, hasChatId: !!chatId });
  if (!token || !chatId) {
    console.warn("[Telegram] ⚠️ Faltan EXPO_PUBLIC_TELEGRAM_BOT_TOKEN o EXPO_PUBLIC_TELEGRAM_CHAT_ID");
    return 0;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/createForumTopic`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          name: `🃏 Sala ${roomCode}`,
          icon_color: 0xff93b2,
        }),
      },
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: { message_thread_id: number };
      description?: string;
    };
    console.log("[Telegram] createForumTopic response:", JSON.stringify(data));
    if (data.ok && data.result) return data.result.message_thread_id;
    console.warn("[Telegram] ❌ API error:", data.description ?? "no ok");
    return 0;
  } catch (e) {
    console.error("[Telegram] fetch error:", e);
    return 0;
  }
}

/**
 * Devuelve el enlace directo al hilo de Telegram de la sala.
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
  }).catch((e) => console.warn("[Telegram] notifyCardThrown error:", e));
}
