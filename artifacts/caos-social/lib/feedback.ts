import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playClink(): void {
  if (Platform.OS === "web") {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(1800, now);
      o.frequency.exponentialRampToValueAtTime(900, now + 0.2);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.32);
    } catch {
      /* noop */
    }
    return;
  }
  // mobile fallback: success haptic
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

export function buzzIncoming(): void {
  if (Platform.OS === "web") {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(110, now + 0.18);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.24);
    } catch {
      /* noop */
    }
    // attempt vibration if available
    try {
      (navigator as unknown as { vibrate?: (p: number[]) => void }).vibrate?.([
        50, 30, 50,
      ]);
    } catch {}
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function tap(): void {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}
