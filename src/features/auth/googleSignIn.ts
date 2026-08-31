import { Platform } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
  type NativeModuleError,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/config';

/**
 * Wrapper del SDK de Google. Es el ÚNICO lugar de la app que importa
 * `@react-native-google-signin/google-signin`.
 *
 * Devuelve un `idToken` crudo de Google. Ese token NO es la sesión: se manda a
 * nuestra API (`POST /auth/google`), que lo verifica contra Google y devuelve
 * nuestro propio JWT. Ver `useGoogleLogin`.
 */

let isConfigured = false;

/**
 * `configure()` toca el módulo nativo, así que se llama perezosamente (la primera
 * vez que alguien intenta entrar) y no al importar el módulo. De lo contrario, un
 * build sin los pods de iOS instalados rompería con solo cargar la pantalla.
 */
function ensureConfigured(): void {
  if (isConfigured) {
    return;
  }
  GoogleSignin.configure({
    // Obligatorio en Android y iOS: es lo que hace que Google emita el idToken.
    webClientId: GOOGLE_WEB_CLIENT_ID,
    ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
  });
  isConfigured = true;
}

/** El usuario cerró el diálogo de Google. No es un error: no se le muestra nada. */
export class GoogleSignInCancelled extends Error {
  constructor() {
    super('El usuario canceló el inicio de sesión con Google');
    this.name = 'GoogleSignInCancelled';
  }
}

function isNativeModuleError(error: unknown): error is NativeModuleError {
  return error instanceof Error && 'code' in error;
}

/**
 * `DEVELOPER_ERROR` de Google Play Services, que llega como el string `"10"`
 * (`CommonStatusCodes.DEVELOPER_ERROR`).
 *
 * **No está en `statusCodes`**: el SDK expone cuatro códigos y este no es uno,
 * así que hay que reconocerlo por el número. Vale la pena hacerlo porque es
 * **el único error de configuración que existe acá** y, sin nombrarlo, cae en el
 * mensaje genérico y manda a buscar un problema de red que no existe.
 *
 * Siempre significa lo mismo: **el proyecto de Google no reconoce a esta app**.
 * En orden de probabilidad:
 *
 * 1. Falta el cliente OAuth de tipo **Android** en el mismo proyecto que el
 *    `GOOGLE_WEB_CLIENT_ID`, con el paquete `com.morgana` y la **huella SHA-1**
 *    de la firma con la que se compiló.
 * 2. La SHA-1 registrada no es la de este build: la de `debug` y la de `release`
 *    son distintas, y las dos tienen que estar cargadas.
 * 3. El `GOOGLE_WEB_CLIENT_ID` es de otro proyecto que el del cliente Android.
 */
const DEVELOPER_ERROR_CODE = '10';

/** Traduce los códigos del SDK a mensajes que puede leer una persona. */
function toReadableError(error: unknown): Error {
  if (!isNativeModuleError(error)) {
    return error instanceof Error ? error : new Error('No pudimos conectar con Google.');
  }

  switch (error.code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return new GoogleSignInCancelled();
    case statusCodes.IN_PROGRESS:
      return new Error('Ya hay un inicio de sesión en curso.');
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return new Error('Necesitás Google Play Services actualizado para continuar.');
    case DEVELOPER_ERROR_CODE:
      // El texto apunta a quien programa y no a quien usa la app, a propósito:
      // si esto aparece en un teléfono, la app está mal configurada y ninguna
      // persona puede hacer nada al respecto. Es un bug, no un fallo de red.
      return new Error(
        'Google no reconoce esta app (DEVELOPER_ERROR). Falta el cliente OAuth de Android ' +
          'con el paquete com.morgana y la huella SHA-1 de esta firma, en el mismo proyecto ' +
          'que el GOOGLE_WEB_CLIENT_ID.',
      );
    default:
      return new Error('No pudimos conectar con Google. Intentá de nuevo.');
  }
}

/**
 * Abre el diálogo de Google y devuelve el `idToken`.
 * @throws {GoogleSignInCancelled} si la persona cierra el diálogo.
 */
export async function signInWithGoogle(): Promise<string> {
  ensureConfigured();

  try {
    // Solo Android: en iOS siempre resuelve true.
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      throw new GoogleSignInCancelled();
    }

    const { idToken } = response.data;
    if (!idToken) {
      // Pasa cuando el webClientId está mal o no corresponde al proyecto.
      throw new Error('Google no devolvió un idToken. Revisá el GOOGLE_WEB_CLIENT_ID.');
    }

    return idToken;
  } catch (error) {
    if (error instanceof GoogleSignInCancelled) {
      throw error;
    }
    throw toReadableError(error);
  }
}

/**
 * Cierra la sesión de Google. Best-effort: si falla, no debe impedir el logout
 * de nuestra app.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Silencio a propósito: cerrar sesión nuestra es lo que importa.
  }
}
