/**
 * Resolver de Jest del proyecto.
 *
 * Compone dos comportamientos que vienen en librerías distintas y que, si se
 * usaran sueltos, se pisarían (Jest acepta UN solo `resolver`):
 *
 *  1. `@react-native/jest-preset/jest/resolver.js` → deja que Jest resuelva y
 *     mockee subpaths de `react-native`.
 *  2. `react-native-worklets/jest/resolver.js` → evita las builds `.native.*`
 *     de worklets, que buscan el binario nativo (inexistente en tests).
 */
module.exports = (request, options) => {
  let resolveOptions = options;

  // (2) worklets: sin extensiones `.native`, cae en la implementación JS pura.
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    resolveOptions = {
      ...resolveOptions,
      extensions: resolveOptions.extensions?.filter((ext) => !ext.includes('native')),
    };
  }

  // (1) react-native: sacarle `exports` para que Jest pueda mockear subpaths.
  const originalPackageFilter = resolveOptions.packageFilter;

  return options.defaultResolver(request, {
    ...resolveOptions,
    packageFilter: (pkg) => {
      const filteredPkg = originalPackageFilter ? originalPackageFilter(pkg) : pkg;
      if (filteredPkg.name === 'react-native') {
        delete filteredPkg.exports;
      }
      return filteredPkg;
    },
  });
};
