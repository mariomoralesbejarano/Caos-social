import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "caos-social-session-v2";

export interface Session {
  roomCode: string;
  playerId: string;
  name: string;
  avatar?: string;
  role?: string;
  spectator?: boolean;
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(s: Session): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
