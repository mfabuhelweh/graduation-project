import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthSession, AuthUser } from "@/types";
import type { AppThemeMode } from "@/constants/colors";

const AUTH_TOKEN_KEY = "vote_secure_mobile_token";
const AUTH_USER_KEY = "vote_secure_mobile_user";
const NOTIFICATION_READ_MAP_KEY = "vote_secure_mobile_notification_read_map";
const APP_PREFERENCES_KEY = "vote_secure_mobile_preferences";

export interface AppPreferences {
  language: "ar" | "en";
  theme: AppThemeMode;
}

// ─── Web-safe SecureStore wrapper ────────────────────────────────────────────
// expo-secure-store لا يعمل على الويب، نستبدله بـ localStorage عند الحاجة
const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch {
        // localStorage غير متاح (private mode مثلاً)
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }
};

// ─── AsyncStorage helpers ─────────────────────────────────────────────────────
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

// ─── Auth session ─────────────────────────────────────────────────────────────
export async function saveAuthSession(session: AuthSession) {
  await secureStorage.setItem(AUTH_TOKEN_KEY, session.token);
  await setJsonValue(AUTH_USER_KEY, session.user);
}

export async function loadAuthSession(): Promise<AuthSession | null> {
  const [token, user] = await Promise.all([
    secureStorage.getItem(AUTH_TOKEN_KEY),
    getJsonValue<AuthUser>(AUTH_USER_KEY)
  ]);

  if (!token || !user) {
    return null;
  }

  return { token, user };
}

export async function getStoredToken() {
  return secureStorage.getItem(AUTH_TOKEN_KEY);
}

export async function clearAuthSession() {
  await Promise.all([
    secureStorage.deleteItem(AUTH_TOKEN_KEY),
    AsyncStorage.removeItem(AUTH_USER_KEY)
  ]);
}

// ─── Notifications ────────────────────────────────────────────────────────────
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

export async function saveAppPreferences(preferences: AppPreferences) {
  await setJsonValue(APP_PREFERENCES_KEY, preferences);
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  return (
    (await getJsonValue<AppPreferences>(APP_PREFERENCES_KEY)) || {
      language: "ar",
      theme: "dark"
    }
  );
}
