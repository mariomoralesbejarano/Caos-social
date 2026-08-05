/**
 * SpotifyWidget — Floating persistent Spotify player.
 *
 * Web  : embeds an official Spotify iframe playlist player in a modal.
 * Native: opens the Spotify app via deep-link (no SDK needed).
 *
 * Positioned top-left so it doesn't collide with FloatingMusicToggle (top-right).
 */

import React, { useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const PLAYLIST_ID = "37i9dQZF1DXaXB8fQg7xof"; // Spotify "Éxitos España" official playlist
const EMBED_URL = `https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?utm_source=generator&theme=0`;
const OPEN_URL = `https://open.spotify.com/playlist/${PLAYLIST_ID}`;
const DEEP_LINK = `spotify:playlist:${PLAYLIST_ID}`;

// ─── Web-only iframe rendered via React.createElement (avoids TS type error) ──
function SpotifyIframe() {
  return React.createElement("iframe", {
    key: "spotify-iframe",
    src: EMBED_URL,
    width: "100%",
    height: 380,
    frameBorder: 0,
    allow:
      "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
    loading: "lazy",
    style: {
      borderRadius: 14,
      border: "none",
      display: "block",
    },
  });
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function SpotifyWidget() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  // Native: just opens Spotify app / web fallback
  async function openNative() {
    const canDeep = await Linking.canOpenURL("spotify://");
    if (canDeep) {
      Linking.openURL(`spotify://playlist/${PLAYLIST_ID}`);
    } else {
      Linking.openURL(OPEN_URL);
    }
  }

  return (
    <>
      {/* ── Floating pill button ── */}
      <View
        pointerEvents="box-none"
        style={[styles.float, { top: (insets.top || 16) }]}
      >
        <Pressable
          onPress={Platform.OS === "web" ? () => setOpen(true) : openNative}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: open
                ? "#1DB95433"
                : colors.card + "ee",
              borderColor: open ? "#1DB954" : colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          accessibilityLabel="Abrir reproductor de Spotify"
        >
          <SpotifyIcon size={14} />
          <Text
            style={[
              styles.pillText,
              { color: open ? "#1DB954" : colors.mutedForeground },
            ]}
          >
            SPOTIFY
          </Text>
        </Pressable>
      </View>

      {/* ── Modal (web only) ── */}
      {Platform.OS === "web" && (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setOpen(false)}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.panel,
                    {
                      backgroundColor: colors.card,
                      borderColor: "#1DB954",
                    },
                  ]}
                >
                  {/* header */}
                  <View style={styles.panelHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <SpotifyIcon size={20} />
                      <Text
                        style={[
                          styles.panelTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Éxitos España · Spotify
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setOpen(false)}
                      style={[
                        styles.closeBtn,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_700Bold",
                          fontSize: 14,
                        }}
                      >
                        ✕
                      </Text>
                    </Pressable>
                  </View>

                  {/* embed */}
                  <View style={styles.iframeWrap}>
                    <SpotifyIframe />
                  </View>

                  {/* Cyberpunk open-in-app button */}
                  <Pressable
                    onPress={async () => {
                      const canDeep = await Linking.canOpenURL(DEEP_LINK);
                      Linking.openURL(canDeep ? DEEP_LINK : OPEN_URL);
                    }}
                    style={({ pressed }) => [
                      styles.openAppBtn,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Text style={styles.openAppText}>📲  ABRIR EN LA APP DE SPOTIFY</Text>
                  </Pressable>

                  <Text
                    style={[
                      styles.hint,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Necesitas cuenta Spotify para reproducir con audio.
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
}

export function FloatingSpotifyWidget() {
  if (Platform.OS !== "web") return null;
  return <SpotifyWidget />;
}

// ─── Spotify SVG logo as React Native Text approximation ─────────────────────
function SpotifyIcon({ size = 16 }: { size?: number }) {
  // Use a musical note emoji as fallback since SVG isn't trivial in RN
  return (
    <Text style={{ fontSize: size, lineHeight: size + 4 }}>🎵</Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  float: {
    position: "absolute",
    left: 16,
    zIndex: 101,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: 2,
    padding: 18,
    gap: 14,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iframeWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
  },
  openAppBtn: {
    backgroundColor: "#1DB954",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#39FF14",
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  openAppText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#000",
    letterSpacing: 1.5,
  },
});
