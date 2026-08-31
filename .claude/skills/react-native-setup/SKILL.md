---
name: react-native-setup
description: Bootstrap completo de un proyecto React Native CLI con el stack profesional (Redux Toolkit + RTK Query, React Navigation, React Hook Form + Zod, MMKV, Luxon, Lucide, StyleSheet + theme, Atomic Design) y la config base lista para codear. Usá este skill SIEMPRE que haya que armar/inicializar un proyecto React Native nuevo desde cero, configurar la estructura de carpetas, instalar el stack, montar la config base (path aliases, store, navegación, storage, theme) o setear ESLint/Prettier, aunque el usuario solo diga "armemos el proyecto" o "configuremos la app". Aplica solo a React Native CLI (no Expo, no web).
---

# React Native Setup

Bootstrap de un proyecto React Native CLI con el stack completo y la config base lista. Seguí los pasos **en orden** — cada uno depende del anterior. Al terminar, el proyecto compila y queda listo para crear features.

> Este skill es **stack-específico** (reproduce un setup concreto), a diferencia de `react-native-pro` y `react-native-theme`, que son de oficio general. Las reglas y convenciones del proyecto viven en su `CLAUDE.md`.

---

## Cuándo usar este skill

- Cuando se inicializa un proyecto React Native nuevo y hay que dejarlo configurado.
- Cuando se arma la estructura de carpetas, se instala el stack o se monta la config base.
- Cuando se configura ESLint/Prettier, path aliases, store, navegación o storage.

---

## Requisito previo

Un proyecto React Native CLI ya creado (con la plantilla de TypeScript) y que corra la app base. Este skill configura **encima** de eso.

---

## Pasos (en orden)

### Paso 1 — Estructura de carpetas (scaffold)

Correr desde la raíz del proyecto:

```bash
bash scripts/scaffold.sh
```

Crea toda la estructura `src/` (features, shared/ui, store, services, theme, etc.). Ver `scripts/scaffold.sh`.

### Paso 2 — Instalar el stack

```bash
bash scripts/install-stack.sh
```

Instala Redux Toolkit, React Navigation + peer deps, React Hook Form + Zod, MMKV, Lucide + react-native-svg y Luxon. Ver `scripts/install-stack.sh`.

### Paso 3 — Pasos nativos (manuales, post-instalación)

```bash
# iOS (si aplica)
cd ios && pod install && cd ..

# Metro con cache limpia
npx react-native start --reset-cache
```

Además, el plugin de Babel para Reanimated se configura en el Paso 4 (path aliases).

### Paso 4 — Config base

Seguir `references/config-base.md` en orden. Cubre, en este orden:

1. Path aliases (`@/`) → `tsconfig.json` + `babel.config.js` (+ instalar `babel-plugin-module-resolver`)
2. Config / variables de entorno
3. Storage (MMKV + `storageService`)
4. Theme → montar siguiendo el skill `react-native-theme`
5. RTK Query `baseApi`
6. Redux `store` + hooks tipados
7. Providers raíz (`AppProviders`)
8. Navegación (`RootNavigator`)
9. Wiring final (`App.tsx` + `index.js`)

### Paso 5 — ESLint + Prettier

Seguir `references/eslint-prettier.md`. Instala y conecta Prettier con el ESLint base de React Native, agrega scripts (`lint`, `lint:fix`, `format`) y el formato automático en VS Code.

### Paso 6 — Reglas del proyecto

Copiar el `CLAUDE.md` del proyecto a la raíz (define arquitectura, stack y convenciones que Claude Code debe respetar). Si no existe, generarlo según las decisiones del stack.

---

## Verificación final

```bash
npx react-native run-android   # debe compilar y abrir la app
npm run lint                   # sin errores de configuración
```

Si la app abre (aunque sea una pantalla vacía) y el lint no se queja de su config, el bootstrap está completo.

---

## Resultado

El proyecto queda con:
- ✅ Estructura por features (Screaming Architecture) + Atomic Design en `shared/ui`.
- ✅ Stack instalado y conectado (estado, navegación, formularios, storage, fechas, íconos).
- ✅ Path aliases, theme, store, providers y navegación funcionando.
- ✅ Linting y formato configurados.

A partir de acá, para construir componentes usar el skill `react-native-pro`; para tocar el theme, `react-native-theme`.

---

## Archivos de este skill

- `scripts/scaffold.sh` — crea la estructura de carpetas.
- `scripts/install-stack.sh` — instala todas las dependencias.
- `references/config-base.md` — todos los archivos de configuración base.
- `references/eslint-prettier.md` — setup de linting y formato.
