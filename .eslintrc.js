module.exports = {
  root: true,
  extends: [
    '@react-native',
    'prettier', // ÚLTIMO: apaga las reglas de formato que chocan con Prettier
  ],
  rules: {
    // TypeScript ya cubre el chequeo de tipos: prohibimos `any` explícitamente.
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        // `const { pass, ...rest } = values` para descartar un campo: patrón válido.
        ignoreRestSiblings: true,
        // Prefijo `_` = "sé que no lo uso, es a propósito".
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      // El setup y los tests corren en el entorno de Jest (globals `jest`, `describe`...)
      files: [
        'jest.setup.js',
        'jest.resolver.js',
        'jest/**/*.js',
        '**/__tests__/**/*',
        '**/*.test.{ts,tsx}',
      ],
      env: { jest: true },
    },
  ],
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'vendor/'],
};
