import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "caos-music-muted-v1";

type WebSynth = {
  ctx: AudioContext;
  master: GainNode;
  stop: () => void;
};

function buildSynth(): WebSynth | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  const ctx: AudioContext = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.0;
  master.connect(ctx.destination);

  // ----- Bass + arp synthwave loop -----
  const tempo = 110;
  const beat = 60 / tempo;
  const bar = beat * 4;
  // I-vi-IV-V en Am: A2-F2-D2-E2 (bass) y arpegios menores
  const bassNotes = [110.0, 87.31, 73.42, 82.41]; // A2 F2 D2 E2
  const arp = [
    [220.0, 261.63, 329.63, 261.63], // Am
    [174.61, 220.0, 261.63, 220.0], // F
    [146.83, 220.0, 293.66, 220.0], // Dm
    [164.81, 207.65, 246.94, 207.65], // E
  ];

  const stops: Array<() => void> = [];

  function scheduleBar(barStart: number) {
    bassNotes.forEach((freq, i) => {
      const t = barStart + i * bar;
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + bar - 0.05);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      o.connect(lp);
      lp.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + bar);
    });
    arp.forEach((chord, ci) => {
      chord.forEach((note, ni) => {
        const t = barStart + ci * bar + ni * (beat / 1);
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = note * 2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.9);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + beat);
      });
    });
  }

  let nextBar = ctx.currentTime + 0.1;
  scheduleBar(nextBar);
  nextBar += bar * 4;
  const interval = window.setInterval(() => {
    if (nextBar - ctx.currentTime < bar * 4) {
      scheduleBar(nextBar);
      nextBar += bar * 4;
    }
  }, 1000);
  stops.push(() => window.clearInterval(interval));

  return {
    ctx,
    master,
    stop: () => {
      stops.forEach((fn) => fn());
      master.disconnect();
      ctx.close().catch(() => undefined);
    },
  };
}

export function MusicToggle() {
  const colors = useColors();
  const [muted, setMuted] = useState<boolean>(true);
  const synthRef = useRef<WebSynth | null>(null);

  // Load mute pref from localStorage (web only)
  useEffect(() => {
    if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "0") setMuted(false);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!muted) {
      if (!synthRef.current) synthRef.current = buildSynth();
      const s = synthRef.current;
      if (s) {
        if (s.ctx.state === "suspended") s.ctx.resume().catch(() => undefined);
        s.master.gain.linearRampToValueAtTime(0.35, s.ctx.currentTime + 0.4);
      }
    } else if (synthRef.current) {
      const s = synthRef.current;
      try {
        s.master.gain.linearRampToValueAtTime(0, s.ctx.currentTime + 0.3);
      } catch {}
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    }
  }, [muted]);

  useEffect(() => {
    return () => {
      synthRef.current?.stop();
      synthRef.current = null;
    };
  }, []);

  if (Platform.OS !== "web") return null;

  return (
    <Pressable
      onPress={() => setMuted((m) => !m)}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: muted ? colors.border : colors.primary,
          backgroundColor: muted ? colors.card + "cc" : colors.primary + "33",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      accessibilityLabel={muted ? "Activar música" : "Silenciar música"}
    >
      <Feather
        name={muted ? "volume-x" : "volume-2"}
        size={16}
        color={muted ? colors.mutedForeground : colors.primary}
      />
      <Text style={[styles.label, { color: muted ? colors.mutedForeground : colors.primary }]}>
        {muted ? "MUSIC OFF" : "MUSIC ON"}
      </Text>
    </Pressable>
  );
}

export function FloatingMusicToggle() {
  return (
    <View pointerEvents="box-none" style={styles.float}>
      <MusicToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  float: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 100,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
});
