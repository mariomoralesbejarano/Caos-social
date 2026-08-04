import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "baraja-session-v1";

export interface BarajaSession {
  roomCode: string;
  playerId: string;
  name: string;
  avatar: string;
}

export async function loadBarajaSession(): Promise<BarajaSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BarajaSession) : null;
  } catch {
    return null;
  }
}

export async function saveBarajaSession(s: BarajaSession): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export async function clearBarajaSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
