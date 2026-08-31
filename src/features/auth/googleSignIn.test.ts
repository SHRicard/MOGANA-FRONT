import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleSignInCancelled, signInWithGoogle, signOutFromGoogle } from './googleSignIn';

/** Arma un error con `code`, igual a los que tira el módulo nativo. */
function nativeError(code: string): Error {
  return Object.assign(new Error(`native: ${code}`), { code });
}

const mockedSignIn = GoogleSignin.signIn as jest.Mock;
const mockedSignOut = GoogleSignin.signOut as jest.Mock;

const successUser = {
  idToken: 'un-id-token',
  serverAuthCode: null,
  scopes: [],
  user: {
    id: '1',
    name: 'Ana',
    email: 'ana@mail.com',
    photo: null,
    familyName: null,
    givenName: null,
  },
};

describe('signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve el idToken cuando el login sale bien', async () => {
    mockedSignIn.mockResolvedValueOnce({ type: 'success', data: successUser });
    await expect(signInWithGoogle()).resolves.toBe('un-id-token');
  });

  it('tira GoogleSignInCancelled si la persona cierra el diálogo', async () => {
    mockedSignIn.mockResolvedValueOnce({ type: 'cancelled' });
    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleSignInCancelled);
  });

  it('tira GoogleSignInCancelled si el SDK rechaza con el código de cancelación', async () => {
    mockedSignIn.mockRejectedValueOnce(nativeError(statusCodes.SIGN_IN_CANCELLED));
    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleSignInCancelled);
  });

  it('avisa del client ID cuando Google no devuelve idToken', async () => {
    mockedSignIn.mockResolvedValueOnce({
      type: 'success',
      data: { ...successUser, idToken: null },
    });
    await expect(signInWithGoogle()).rejects.toThrow(/GOOGLE_WEB_CLIENT_ID/);
  });

  it('traduce PLAY_SERVICES_NOT_AVAILABLE a un mensaje legible', async () => {
    mockedSignIn.mockRejectedValueOnce(nativeError(statusCodes.PLAY_SERVICES_NOT_AVAILABLE));
    await expect(signInWithGoogle()).rejects.toThrow(/Google Play Services/);
  });

  /**
   * Es el único error de configuración de este flujo y el que más cuesta
   * diagnosticar: sin nombrarlo cae en el mensaje genérico y manda a buscar un
   * problema de red que no existe.
   */
  it('nombra el DEVELOPER_ERROR en vez de esconderlo en el genérico', async () => {
    // El módulo nativo lo manda como el string "10", no como uno de los
    // `statusCodes`: ese código no está en la lista que expone el SDK.
    mockedSignIn.mockRejectedValueOnce(nativeError('10'));
    await expect(signInWithGoogle()).rejects.toThrow(/DEVELOPER_ERROR/);
    mockedSignIn.mockRejectedValueOnce(nativeError('10'));
    await expect(signInWithGoogle()).rejects.toThrow(/SHA-1/);
  });

  it('no filtra mensajes crudos del SDK ante un código desconocido', async () => {
    mockedSignIn.mockRejectedValueOnce(nativeError('ALGO_RARO_12345'));
    await expect(signInWithGoogle()).rejects.toThrow(
      'No pudimos conectar con Google. Intentá de nuevo.',
    );
  });

  it('configura el SDK una sola vez, aunque se entre varias veces', async () => {
    // Registro de módulos aislado: `googleSignIn` cachea el flag `isConfigured`,
    // así que sin esto el resultado dependería del orden de los tests.
    await jest.isolateModulesAsync(async () => {
      const sdk = require('@react-native-google-signin/google-signin');
      const { signInWithGoogle: freshSignIn } = require('./googleSignIn');

      sdk.GoogleSignin.signIn.mockResolvedValue({ type: 'success', data: successUser });

      await freshSignIn();
      await freshSignIn();

      // `configure` toca el módulo nativo: se llama una vez y no más.
      expect(sdk.GoogleSignin.configure).toHaveBeenCalledTimes(1);
    });
  });
});

describe('signOutFromGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no propaga errores: cerrar nuestra sesión es lo que importa', async () => {
    mockedSignOut.mockRejectedValueOnce(new Error('boom'));
    await expect(signOutFromGoogle()).resolves.toBeUndefined();
  });
});
