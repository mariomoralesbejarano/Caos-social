// Re-exporta todo desde la librería central.
// Los imports del artifact apuntan aquí para no duplicar lógica.
export {
  createTelegramTopic,
  getTelegramTopicUrl,
  notifyCardThrown,
} from "@workspace/api-client-react";
export type { TelegramCardEvent } from "@workspace/api-client-react";
