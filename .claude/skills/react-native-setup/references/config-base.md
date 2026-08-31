# Referencia: Config base

Archivos de configuración que conectan el stack y dejan la app lista para codear features. Seguí el orden: cada parte depende de la anterior.

> Nota de versión MMKV: los ejemplos usan `new MMKV()` (v3). MMKV v4 usa `createMMKV()`. Ajustá esa línea según la versión instalada; el resto no cambia.

## Orden

1. Path aliases (`@/`)
2. Config / variables de entorno
3. Storage (MMKV + storageService)
4. Theme (ver skill `react-native-theme`)
5. RTK Query baseApi
6. Redux store
7. Providers raíz
8. Navegación
9. Wiring final (`App.tsx` + `index.js`)

---

## 1. Path aliases

Necesita un paquete extra:

```bash
npm install --save-dev babel-plugin-module-resolver
```

**`tsconfig.json`** (en la raíz) → para que TypeScript entienda los `@/`:

```json
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**`babel.config.js`** → para que el bundler resuelva los `@/` en runtime:

```js
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
    'react-native-worklets/plugin', // ⚠️ DEBE ir SIEMPRE el último (Reanimated 3.16+)
  ],
};
```

> El plugin de worklets tiene que ser el último de la lista, o falla. En Reanimated 3.16+ el plugin se llama `react-native-worklets/plugin` (antes era `react-native-reanimated/plugin`).

---

## 2. Config / variables de entorno

```ts
// src/config/index.ts
export const API_BASE_URL = 'https://tu-api.com'; // mover a variables de entorno reales
```

---

## 3. Storage (MMKV + storageService)

```ts
// src/services/storage/mmkv.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV(); // v4: createMMKV()
```

```ts
// src/services/storage/keys.ts
export const StorageKeys = {
  AUTH_TOKEN: 'auth_token',
  THEME_MODE: 'theme_mode',
} as const;
```

```ts
// src/services/storage/storageService.ts
import { storage } from './mmkv';

export const storageService = {
  set<T>(key: string, value: T): void {
    storage.set(key, JSON.stringify(value));
  },
  get<T>(key: string): T | null {
    const v = storage.getString(key);
    return v ? (JSON.parse(v) as T) : null;
  },
  setString(key: string, value: string): void {
    storage.set(key, value);
  },
  getString(key: string): string | null {
    return storage.getString(key) ?? null;
  },
  remove(key: string): void {
    storage.delete(key);
  },
  clearAll(): void {
    storage.clearAll();
  },
};
```

> Regla: toda la app accede al storage vía `storageService`, **nunca** a `storage` (MMKV) directo.

---

## 4. Theme

El theme se monta siguiendo el skill **`react-native-theme`** (tokens primitivos/semánticos, `ThemeProvider`, `useTheme`). No lo dupliques acá: armalo según ese skill, con tus colores reales.

---

## 5. RTK Query baseApi

La base de datos del servidor. Las features inyectan sus endpoints acá vía `injectEndpoints`.

```ts
// src/services/api/baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: () => ({}), // vacío: las features inyectan acá
});
```

---

## 6. Redux store

```ts
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { baseApi } from '@/services/api/baseApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    // slices de features se agregan acá
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks tipados (usar SIEMPRE estos, no los crudos de react-redux)
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

---

## 7. Providers raíz

Centraliza todos los providers globales en un solo lugar.

```tsx
// src/app/providers/AppProviders.tsx
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { ThemeProvider } from '@/theme';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}
```

---

## 8. Navegación

```tsx
// src/app/navigation/RootNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* ⚠️ Agregá al menos una screen, o el navegador falla.
            Ej: <Stack.Screen name="Home" component={HomeScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 9. Wiring final

**`App.tsx`** (raíz del proyecto) → arma todo el árbol:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from '@/app/providers/AppProviders';
import { RootNavigator } from '@/app/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <RootNavigator />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

**`index.js`** (raíz) → `react-native-gesture-handler` debe importarse en la **primera línea** del entry point:

```js
import 'react-native-gesture-handler'; // 👈 PRIMERA línea, antes que nada
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

---

## Verificación final

```bash
npx react-native start --reset-cache   # Metro con cache limpia
npx react-native run-android            # debería compilar y abrir la app
```

Si compila y abre (aunque sea una pantalla vacía), la config base está OK y el proyecto queda listo para crear features.
