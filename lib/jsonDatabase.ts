import AsyncStorage from "@react-native-async-storage/async-storage";

export const JSON_DATABASE_STORAGE_KEY = "studystreak-my-json-db-v1";
const MAX_DATABASE_BYTES = 5 * 1024 * 1024;

export async function loadJsonDatabase<T>(fallback: T, normalize: (raw: unknown) => T): Promise<T> {
  const raw = await AsyncStorage.getItem(JSON_DATABASE_STORAGE_KEY);

  if (!raw) {
    return fallback;
  }

  if (raw.length > MAX_DATABASE_BYTES) {
    throw new Error("Stored application data exceeds the safe size limit.");
  }

  return normalize(JSON.parse(raw));
}

export async function saveJsonDatabase<T>(data: T): Promise<void> {
  await AsyncStorage.setItem(JSON_DATABASE_STORAGE_KEY, JSON.stringify(data));
}
