import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { AuthSession, AuthUser } from "@/types";

const AUTH_TOKEN_KEY = "vote_secure_mobile_token";
const AUTH_USER_KEY = "vote_secure_mobile_user";
const NOTIFICATION_READ_MAP_KEY = "vote_secure_mobile_notification_read_map";

async function setJsonValue<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getJsonValue<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, session.token);
  await setJsonValue(AUTH_USER_KEY, session.user);
}

export async function loadAuthSession(): Promise<AuthSession | null> {
  const [token, user] = await Promise.all([
    SecureStore.getItemAsync(AUTH_TOKEN_KEY),
    getJsonValue<AuthUser>(AUTH_USER_KEY)
  ]);

  if (!token || !user) {
    return null;
  }

  return { token, user };
}

export async function getStoredToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function clearAuthSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
    AsyncStorage.removeItem(AUTH_USER_KEY)
  ]);
}

export async function persistNotificationReadMap(
  value: Record<string, boolean>
) {
  await setJsonValue(NOTIFICATION_READ_MAP_KEY, value);
}

export async function loadNotificationReadMap() {
  return (await getJsonValue<Record<string, boolean>>(
    NOTIFICATION_READ_MAP_KEY
  )) || {};
}
