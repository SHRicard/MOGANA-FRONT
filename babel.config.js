module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' },
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
      },
    ],
    // Lee el .env y lo inyecta en tiempo de build: `import { X } from '@env'`.
    // Es una sustitución textual, NO una lectura en runtime → los valores quedan
    // dentro del bundle. Por eso el .env solo lleva configuración pública.
    // ⚠️ Cambiar el .env NO recarga solo: hay que reiniciar Metro con --reset-cache.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        // El plugin descarta las variables con valor vacío: para él `VAR=` es lo
        // mismo que no existir. Con `allowUndefined: false` eso rompe el build, y
        // GOOGLE_IOS_CLIENT_ID tiene que poder quedar vacío (en Android no aplica).
        // Se inyecta `undefined` y lo normaliza `src/config/index.ts`, que es el
        // único módulo que importa de '@env'.
        allowUndefined: true,
      },
    ],
    // Zod v4 usa `export * as ns from '...'` en su build publicada y el preset de
    // React Native no trae este plugin. Sin él, Metro falla al bundlear zod.
    '@babel/plugin-transform-export-namespace-from',
    // ⚠️ SIEMPRE el último de la lista (Reanimated 4 / worklets)
    'react-native-worklets/plugin',
  ],
};
