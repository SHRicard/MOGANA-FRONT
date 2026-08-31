import { createMMKV } from 'react-native-mmkv';

/**
 * Instancias de MMKV (v4 → `createMMKV`).
 *
 * ⚠️ Estas instancias son PRIVADAS del módulo de storage.
 * El resto de la app accede SIEMPRE vía `storageService`, nunca acá directo.
 */

/** Storage general: preferencias, cache liviano, flags de UI. Sin encriptar. */
export const storage = createMMKV({ id: 'app-storage' });

/**
 * Storage seguro: solo para datos sensibles (token de auth).
 * Instancia separada y encriptada.
 *
 * ⚠️ TODO(seguridad): la `encryptionKey` no debe quedar hardcodeada en el bundle.
 * Antes de producción, generarla/derivarla y guardarla en el Keychain (iOS) /
 * Keystore (Android), o inyectarla por variable de entorno en build time.
 * Límite: 16 bytes con AES-128 (default), 32 bytes con AES-256.
 */
export const secureStorage = createMMKV({
  id: 'app-secure-storage',
  encryptionKey: 'CHANGE_ME_16BYTE',
});
