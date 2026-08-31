import { storage, secureStorage } from './mmkv';

/**
 * Única puerta de acceso al storage local.
 * ❌ Nunca uses las instancias de MMKV directo desde componentes o features.
 */
export const storageService = {
  // ── Objetos / valores serializables ─────────────────────────────
  set<T>(key: string, value: T): void {
    storage.set(key, JSON.stringify(value));
  },

  get<T>(key: string): T | null {
    const raw = storage.getString(key);
    if (raw === undefined) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Valor corrupto o no-JSON: lo descartamos en vez de romper la app.
      storage.remove(key);
      return null;
    }
  },

  // ── Strings crudos (sin pasar por JSON) ─────────────────────────
  setString(key: string, value: string): void {
    storage.set(key, value);
  },

  getString(key: string): string | null {
    return storage.getString(key) ?? null;
  },

  // ── Booleanos ───────────────────────────────────────────────────
  setBoolean(key: string, value: boolean): void {
    storage.set(key, value);
  },

  getBoolean(key: string): boolean | null {
    return storage.getBoolean(key) ?? null;
  },

  // ── Utilidades ──────────────────────────────────────────────────
  has(key: string): boolean {
    return storage.contains(key);
  },

  remove(key: string): void {
    storage.remove(key);
  },

  clearAll(): void {
    storage.clearAll();
  },
};

/**
 * Storage seguro (encriptado). Solo para datos sensibles: token de auth.
 */
export const secureStorageService = {
  setToken(key: string, token: string): void {
    secureStorage.set(key, token);
  },

  getToken(key: string): string | null {
    return secureStorage.getString(key) ?? null;
  },

  removeToken(key: string): void {
    secureStorage.remove(key);
  },

  clearAll(): void {
    secureStorage.clearAll();
  },
};
