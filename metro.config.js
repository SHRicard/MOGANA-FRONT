const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

/**
 * SVG como componentes de React.
 *
 * Por defecto Metro trata los `.svg` como ASSET (igual que un png), y el `Image`
 * de React Native no sabe dibujar SVG en Android ni en iOS: no se vería nada.
 *
 * Con este transformer, un `.svg` pasa a ser CÓDIGO: `import Logo from './logo.svg'`
 * devuelve un componente de react-native-svg. Ventajas en móvil: se ve nítido en
 * cualquier densidad de pantalla sin tener que mantener @2x/@3x, pesa menos, y se
 * le puede pasar `color` para que siga el theme.
 *
 * Por eso `svg` se saca de `assetExts` y se agrega a `sourceExts`.
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
