/**
 * Mock de `@react-native-google-signin/google-signin` para tests.
 *
 * Por qué mockeamos la API pública y no el TurboModule interno:
 * la librería publica un setup de Jest propio, pero su `exports` en package.json
 * no expone esa ruta (`ERR_PACKAGE_PATH_NOT_EXPORTED`), y un `moduleNameMapper`
 * sobre el spec interno no llega a interceptar el require relativo que hace la
 * librería puertas adentro.
 *
 * Esto NO deja sin testear nuestra lógica: `features/auth/googleSignIn.ts`
 * (manejo de cancelación, idToken nulo, traducción de errores) se sigue
 * ejecutando de verdad contra este mock.
 *
 * Para simular casos en un test:
 *   const { GoogleSignin } = require('@react-native-google-signin/google-signin');
 *   GoogleSignin.signIn.mockResolvedValueOnce({ type: 'cancelled' });
 */

const mockUser = Object.freeze({
  idToken: 'mockIdToken',
  serverAuthCode: 'mockServerAuthCode',
  scopes: [],
  user: {
    id: 'mockId',
    name: 'mockFullName',
    email: 'mock@email.com',
    photo: null,
    familyName: 'mockFamilyName',
    givenName: 'mockGivenName',
  },
});

/** Códigos reales del módulo nativo: `googleSignIn.ts` hace un switch sobre estos. */
const statusCodes = Object.freeze({
  SIGN_IN_CANCELLED: '12501',
  IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: '12500',
  SIGN_IN_REQUIRED: '4',
  NULL_PRESENTER: 'NULL_PRESENTER',
});

const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn().mockResolvedValue(true),
  signIn: jest.fn().mockResolvedValue({ type: 'success', data: mockUser }),
  signInSilently: jest.fn().mockResolvedValue({ type: 'success', data: mockUser }),
  addScopes: jest.fn().mockResolvedValue(null),
  signOut: jest.fn().mockResolvedValue(null),
  revokeAccess: jest.fn().mockResolvedValue(null),
  hasPreviousSignIn: jest.fn().mockReturnValue(false),
  getCurrentUser: jest.fn().mockReturnValue(null),
  clearCachedAccessToken: jest.fn().mockResolvedValue(null),
  getTokens: jest
    .fn()
    .mockResolvedValue({ accessToken: 'mockAccessToken', idToken: 'mockIdToken' }),
};

function GoogleSigninButton() {
  return null;
}
GoogleSigninButton.Size = { Icon: 0, Standard: 1, Wide: 2 };
GoogleSigninButton.Color = { Dark: 'dark', Light: 'light' };

module.exports = {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
  __mockUser: mockUser,
};
