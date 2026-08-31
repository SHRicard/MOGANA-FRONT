module.exports = {
  preset: '@react-native/jest-preset',

  // Jest concatena `setupFiles` y hace merge de `transform`/`moduleNameMapper`
  // con los del preset: lo de acá se SUMA, no lo reemplaza.
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Reemplaza al del preset de RN, que queda incluido dentro. Ver el archivo.
  resolver: '<rootDir>/jest.resolver.js',

  // Path aliases (@/) también en los tests
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // En la app un .svg es un componente (via Metro + svg-transformer); Jest lo
    // trataría como asset. Ver el comentario en el mock.
    '\\.svg$': '<rootDir>/jest/svgMock.js',
  },

  // El preset solo transforma .js/.ts/.tsx. Varias libs (lucide) publican .mjs
  // y bajo la condición "react-native" jest resuelve justo a esa build ESM.
  transform: {
    '^.+\\.mjs$': 'babel-jest',
  },

  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community|-google-signin)?|@react-navigation|react-native-.*|lucide-react-native|react-redux|@reduxjs/toolkit|redux|redux-thunk|immer|reselect)/)',
  ],
};
