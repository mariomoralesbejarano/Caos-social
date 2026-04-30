// Chat de sala en directo. Auto-scroll al último mensaje, KeyboardAvoiding
// para que el input no quede tapado, y SafeArea para no chocar con bordes.

import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import {
  ChatMessage,
  sendChatMessage,
  subscribeToChat,
} from "@/lib/chat";

interface Props {
  roomCode: string;
  myPlayerId: string;
  myName: string;
  myAvatar?: string;
  /** Mensajes que la pantalla padre quiere inyectar (p. ej. resultado del juicio). */
  pinnedSystem?: ChatMessage[];
}

const MAX_MESSAGES = 200;

export function ChatPanel({
  roomCode,
  myPlayerId,
  myName,
  myAvatar,
  pinnedSystem,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Suscripción a mensajes broadcast.
  useEffect(() => {
    if (!roomCode) return;
    const off = subscribeToChat(roomCode, (m) => {
      setMessages((prev) => {
        if (seenIds.current.has(m.id)) return prev;
        seenIds.current.add(m.id);
        const next = [...prev, m];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    });
    return off;
  }, [roomCode]);

  // Inyección de mensajes "pinned" (resultados de juicio, etc.) que vienen
  // del padre — útil para que el thrower vea su veredicto siempre, aunque
  // el broadcast llegue tarde.
  useEffect(() => {
    if (!pinnedSystem || pinnedSystem.length === 0) return;
    setMessages((prev) => {
      const next = [...prev];
      for (const p of pinnedSystem) {
        if (!seenIds.current.has(p.id)) {
          seenIds.current.add(p.id);
          next.push(p);
        }
      }
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
  }, [pinnedSystem]);

  // Auto-scroll al final cada vez que llega un mensaje nuevo.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        scrollRef.current?.scrollToEnd({ animated: true });
      } catch {}
    }, 30);
    return () => clearTimeout(t);
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    try {
      const m = await sendChatMessage(roomCode, {
        fromPlayerId: myPlayerId,
        fromName: myName,
        fromAvatar: myAvatar,
        body: body.slice(0, 280),
      });
      // Pintar localmente al instante (broadcast self:true ya lo trae,
      // pero por si acaso evitamos esperar al ack).
      setMessages((prev) => {
        if (seenIds.current.has(m.id)) return prev;
        seenIds.current.add(m.id);
        const next = [...prev, m];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    } catch {
      // No bloqueamos: si falla el broadcast, el siguiente mensaje volverá a abrir el canal.
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      style={{ flex: 1 }}
    >
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 6),
          },
        ]}
      >
        <View style={styles.header}>
          <Feather name="message-circle" size={14} color={colors.primary} />
          <Text style={[styles.headerText, { color: colors.primary }]}>
            CHAT DE SALA
          </Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {messages.length}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{ paddingVertical: 6, gap: 4 }}
          onContentSizeChange={() => {
            try {
              scrollRef.current?.scrollToEnd({ animated: false });
            } catch {}
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              Sin mensajes aún. Sé el primero en romper el hielo.
            </Text>
          ) : (
            messages.map((m) => {
              if (m.kind === "system") {
                return (
                  <Text
                    key={m.id}
                    style={[styles.system, { color: colors.secondary }]}
                  >
                    ⚖️  {m.body}
                  </Text>
                );
              }
              const mine = m.fromPlayerId === myPlayerId;
              return (
                <View
                  key={m.id}
                  style={[
                    styles.row,
                    {
                      alignSelf: mine ? "flex-end" : "flex-start",
                      backgroundColor: mine
                        ? colors.primary + "26"
                        : colors.background,
                      borderColor: mine ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {!mine && (
                    <Text style={[styles.from, { color: colors.mutedForeground }]}>
                      {m.fromAvatar ? m.fromAvatar + "  " : ""}
                      {m.fromName ?? "?"}
                    </Text>
                  )}
                  <Text style={[styles.body, { color: colors.foreground }]}>
                    {m.body}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.inputRow, { borderColor: colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Mensaje..."
            placeholderTextColor={colors.mutedForeground}
            maxLength={280}
            multiline={false}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          />
          <Pressable
            onPress={handleSend}
            hitSlop={10}
            disabled={!draft.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                borderColor: colors.primary,
                opacity: !draft.trim() ? 0.4 : pressed ? 0.7 : 1,
                backgroundColor: colors.primary + "1F",
              },
            ]}
          >
            <Feather name="send" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  headerText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    flex: 1,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  scroll: { flex: 1 },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 18,
  },
  row: {
    maxWidth: "82%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  from: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 17,
  },
  system: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    minHeight: 38,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
