# Referencia: ESLint + Prettier

Setup de linting (calidad de código) y formato. **ESLint** detecta problemas reales (variables sin usar, hooks mal usados); **Prettier** se ocupa solo del formato. Se integran vía `eslint-config-prettier`, que apaga las reglas de formato de ESLint para que no choquen con Prettier.

> La plantilla de React Native CLI ya deja un ESLint base (`@react-native/eslint-config`). Acá solo sumamos Prettier integrado.

## 1. Instalar

```bash
npm install --save-dev prettier eslint-config-prettier
```

## 2. `.prettierrc.js` (raíz del proyecto)

```js
module.exports = {
  arrowParens: 'always',
  bracketSpacing: true,
  singleQuote: true,
  semi: true,
  printWidth: 100,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
};
```

## 3. Conectar Prettier con ESLint

Detectá qué formato de config tenés en la raíz:
- `eslint.config.js` → **flat config** (ESLint 9, lo más probable en RN nueva).
- `.eslintrc.js` → **legacy**.

**Flat config (`eslint.config.js`):**

```js
const { defineConfig } = require('eslint/config');
const reactNative = require('@react-native/eslint-config');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  reactNative,
  prettier, // ÚLTIMO: desactiva reglas de formato que chocan con Prettier
]);
```

**Legacy (`.eslintrc.js`):**

```js
module.exports = {
  root: true,
  extends: [
    '@react-native',
    'prettier', // ÚLTIMO, mismo motivo
  ],
};
```

> Regla: `prettier` siempre va **al final** del array de `extends`.

## 4. Scripts en `package.json`

```json
"scripts": {
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx}\""
}
```

## 5. (Recomendado) Formato automático en VS Code

Creá `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

Requiere las extensiones **ESLint** y **Prettier** instaladas en VS Code.

## Verificación

```bash
npm run lint      # no debería tirar errores de configuración
npm run format    # formatea todo src/
```
