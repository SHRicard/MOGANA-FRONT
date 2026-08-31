import {
  API_BASE_URL as ENV_API_BASE_URL,
  GOOGLE_IOS_CLIENT_ID as ENV_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID as ENV_GOOGLE_WEB_CLIENT_ID,
} from '@env';

/**
 * Configuración de la app.
 *
 * Los valores vienen del archivo `.env` de la raíz, inyectados en tiempo de
 * build por react-native-dotenv (ver `babel.config.js`).
 *
 * ⚠️ NO es una lectura en runtime: Babel reemplaza cada import por el texto del
 * valor, así que todo esto queda DENTRO del bundle y es legible por cualquiera
 * que descargue el APK. Va configuración pública, nunca secretos.
 *
 * ⚠️ Si cambiás el `.env`, reiniciá Metro con `--reset-cache`. Metro cachea el
 * resultado de Babel y si no, sigue usando el valor viejo.
 *
 * Este módulo es la ÚNICA puerta a `@env`: el resto de la app importa desde
 * `@/config`. Así los valores se validan y documentan en un solo lugar.
 */

/**
 * Para el plugin, una variable vacía (`VAR=`) es lo mismo que una que no existe:
 * en los dos casos inyecta `undefined`. Se normaliza acá para que el resto de la
 * app trabaje siempre con `string` y nunca tenga que chequear `undefined`.
 */
function fromEnv(value: string | undefined): string {
  return value ?? '';
}

/** URL base de la API REST. */
export const API_BASE_URL = fromEnv(ENV_API_BASE_URL);

/**
 * Nombre visible de la app.
 * El atom `Logo` lo usa como `accessibilityLabel`: el nombre viene dibujado
 * dentro del SVG, así que sin esto un lector de pantalla no leería nada.
 *
 * No sale del .env a propósito: es identidad de marca, no configuración de
 * ambiente. No cambia entre dev y producción.
 */
export const APP_NAME = 'Morgana';

/**
 * Google Sign-In — IDs de cliente de Google Cloud Console.
 *
 * ⚠️ Estos NO son secretos: los client IDs son públicos por diseño (viajan en el
 * flujo de OAuth). El secreto de verdad es el *client secret*, que vive SOLO en
 * tu backend y nunca acá.
 *
 * - WEB: obligatorio en ambas plataformas. Es el que hace que Google devuelva el
 *   `idToken` que tu API va a verificar. Ojo: aunque diga "Web", en Android es
 *   este el que va (no el client ID de Android, que no se escribe en ningún lado).
 * - IOS: solo iOS. En Android dejalo vacío.
 */
export const GOOGLE_WEB_CLIENT_ID = fromEnv(ENV_GOOGLE_WEB_CLIENT_ID);
export const GOOGLE_IOS_CLIENT_ID = fromEnv(ENV_GOOGLE_IOS_CLIENT_ID);

/** Si no hay web client ID, la app esconde el botón de Google en vez de romper. */
export const isGoogleSignInEnabled = GOOGLE_WEB_CLIENT_ID.length > 0;

/**
 * Aviso en desarrollo si falta una variable obligatoria. Como el plugin ya no
 * falla el build (ver `allowUndefined` en babel.config.js), sin esto un `.env`
 * incompleto se manifestaría mucho más tarde y de forma confusa: requests a una
 * URL vacía, o Google devolviendo `null` en vez del idToken.
 */
if (__DEV__ && !API_BASE_URL) {
  console.warn(
    '[config] Falta API_BASE_URL en el .env. Completalo y reiniciá Metro con --reset-cache.',
  );
}
