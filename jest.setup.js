/**
 * Setup global de Jest.
 * Los módulos nativos no existen en el entorno de test: se mockean acá.
 */
require('react-native-gesture-handler/jestSetup');

/**
 * MMKV v4 corre sobre Nitro Modules. La librería ya detecta Jest sola
 * (`isTest()` → instancia en memoria), pero el import de Nitro se evalúa
 * antes de esa comprobación y busca el binario nativo. Lo stubeamos.
 */
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => ({}),
    box: (value) => value,
  },
}));

/**
 * Reanimated corre sus animaciones en el hilo de UI, que en Jest no existe.
 * La propia librería publica un mock que ejecuta todo en el hilo de JS.
 */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

/**
 * Google Sign-In: el TurboModule nativo no existe en tests.
 * Ver `jest/googleSignInMock.js` para el porqué de mockear la API pública.
 */
jest.mock('@react-native-google-signin/google-signin', () =>
  require('./jest/googleSignInMock'),
);
