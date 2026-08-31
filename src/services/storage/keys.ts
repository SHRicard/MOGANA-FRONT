/** Claves del storage. Centralizadas para evitar strings sueltos por la app. */
export const StorageKeys = {
  /** Preferencia de tema del usuario: 'light' | 'dark' | 'system'. */
  THEME_MODE: 'theme_mode',
  /** Tipografía elegida: 'system' | 'inter'. */
  FONT_FAMILY: 'font_family',
  /** Datos NO sensibles del usuario logueado (el token va aparte, encriptado). */
  USER: 'user',
} as const;

/** Claves del storage seguro (encriptado). */
export const SecureStorageKeys = {
  AUTH_TOKEN: 'auth_token',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
export type SecureStorageKey = (typeof SecureStorageKeys)[keyof typeof SecureStorageKeys];
