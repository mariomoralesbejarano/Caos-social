/**
 * Notificaciones de Telegram: avisa al grupo cuando se lanza una carta.
 * Requiere:
 *   EXPO_PUBLIC_TELEGRAM_BOT_TOKEN — token del bot (@BotFather)
 *   EXPO_PUBLIC_TELEGRAM_CHAT_ID   — ID del grupo (negativo, ej: -1001234567890)
 *
 * Obtener el chat_id:
 *   1. Añade el bot a tu grupo de Telegram.
 *   2. Envía un mensaje en el grupo.
 *   3. Abre https://api.telegram.org/bot<TOKEN>/getUpdates
 *   4. Busca "chat" → "id" en la respuesta.
 *
 * En móvil nativo no hay restricciones CORS — funciona sin proxy.
 * En web puede fallar silenciosamente (no bloquea el juego).
 */

const BOT_TOKEN = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID ?? "";

export interface TelegramCardEvent {
  fromName: string;
  toName: string;
  cardTitle: string;
  cardEffect: string;
  points: number;
  roomCode: string;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Envía una notificación al grupo de Telegram cuando se lanza una carta.
 * Fire-and-forget: nunca bloquea ni propaga errores al juego.
 */
export function notifyCardThrown(event: TelegramCardEvent): void {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const text =
    `🃏 *${escapeMarkdown(event.fromName)}* → *${escapeMarkdown(event.toName)}*\n` +
    `\n` +
    `📋 *${escapeMarkdown(event.cardTitle)}*\n` +
    `${escapeMarkdown(event.cardEffect)}\n` +
    `\n` +
    `⭐ ${event.points} puntos · Sala \`${event.roomCode}\``;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = new URLSearchParams({
    chat_id: CHAT_ID,
    text,
    parse_mode: "MarkdownV2",
    disable_notification: "false",
  });

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  }).catch(() => {
    // ignorar errores silenciosamente (CORS en web, red, etc.)
  });
}
