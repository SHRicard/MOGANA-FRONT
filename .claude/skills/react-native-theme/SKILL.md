---
name: react-native-theme
description: Guía para crear y mantener un theme (sistema de design tokens) profesional en React Native CLI — colores, tipografía, espaciados, radios, tipado TypeScript, ThemeProvider, hook useTheme y modo oscuro. Usá este skill SIEMPRE que tengas que crear la carpeta theme/, agregar o modificar un token (color, espaciado, tipografía, radio), configurar el ThemeProvider o el hook useTheme, o implementar modo claro/oscuro en un proyecto React Native, aunque el usuario no diga explícitamente "tokens" o "design system". Aplica solo a React Native CLI (no web).
---

# React Native Theme

El theme es la **base del design system**: la única fuente de verdad de colores, espaciados, tipografía y radios. Todos los componentes (atoms, molecules, screens) toman sus valores de acá vía `useTheme()`. Bien hecho, cambiás la identidad de la app o activás el modo oscuro tocando un solo lugar.

Este skill enseña a montar un theme **profesional**. El concepto central que lo diferencia de un theme amateur es la separación entre **tokens primitivos y semánticos** (ver abajo). No te saltees esa parte.

---

## Cuándo usar este skill

- Cuando creás la carpeta `theme/` de un proyecto desde cero.
- Cuando agregás o cambiás un token (un color, un espaciado, un tamaño de fuente).
- Cuando configurás el `ThemeProvider` y el hook `useTheme()`.
- Cuando implementás modo claro/oscuro.

---

## Concepto clave: tokens primitivos vs semánticos

Un theme amateur tiene colores con nombre de color: `colors.blue`, `colors.gray`. El problema: cuando querés modo oscuro o cambiar la identidad, tenés que tocar cada componente que usa `blue`.

Un theme profesional separa **dos capas**:

1. **Tokens primitivos** → los valores crudos, nombrados por lo que *son*. Ej: `blue500: '#2D6CDF'`. Es la paleta, no se usa directo en los componentes.
2. **Tokens semánticos** → nombrados por lo que *significan* / para qué se usan. Ej: `primary`, `onPrimary`, `background`, `text`, `error`. Apuntan a un primitivo.

```
primitivo:  blue500 = '#2D6CDF'
semántico:  primary = blue500     ← esto es lo que usan los componentes
```

**Por qué importa:** los componentes usan solo los semánticos (`theme.colors.primary`, nunca `blue500`). Entonces:
- Cambiás la identidad de la app reapuntando `primary` a otro primitivo → un solo cambio.
- El **modo oscuro** se vuelve trivial: es el mismo set de semánticos (`background`, `text`...) apuntando a primitivos distintos. El componente no se entera; pide `background` y recibe el correcto según el tema activo.

---

## Estructura de carpetas

```
theme/
├── tokens/                 # Capa 1: PRIMITIVOS (valores crudos)
│   ├── colors.ts           # la paleta
│   ├── spacing.ts          # escala de espaciados
│   ├── typography.ts       # escala tipográfica
│   └── radius.ts           # radios de borde
│
├── themes/                 # Capa 2: SEMÁNTICOS (significado)
│   ├── lightTheme.ts
│   └── darkTheme.ts
│
├── ThemeProvider.tsx       # provee el tema y permite cambiarlo
├── types.ts                # el tipo Theme (para autocompletado)
└── index.ts                # exports públicos
```

---

## Paso a paso

### Paso 1 — Tokens primitivos (valores crudos)

Nombrá por lo que son. Estos NO se usan directo en los componentes.

```ts
// theme/tokens/colors.ts
export const palette = {
  blue500: '#2D6CDF',
  blue600: '#1F4FB0',
  white:   '#FFFFFF',
  black:   '#1A1A1A',
  gray100: '#F2F2F2',
  gray800: '#2A2A2A',
  gray500: '#8A8A8A',
  red500:  '#E24B4A',
  green500:'#2EA043',
} as const;
```

```ts
// theme/tokens/spacing.ts  → escala consistente (base 4/8), nunca números sueltos
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
```

```ts
// theme/tokens/typography.ts
export const typography = { caption: 12, body: 16, title: 22, heading: 28 } as const;
```

```ts
// theme/tokens/radius.ts
export const radius = { sm: 4, md: 8, lg: 16, full: 9999 } as const;
```

### Paso 2 — Tokens semánticos (los temas)

Acá nombrás por significado. Cada tema apunta los mismos semánticos a primitivos distintos.

```ts
// theme/themes/lightTheme.ts
import { palette } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';
import { radius } from '../tokens/radius';

export const lightTheme = {
  colors: {
    primary:    palette.blue500,
    onPrimary:  palette.white,   // texto/ícono SOBRE el primary
    background: palette.white,
    surface:    palette.gray100, // tarjetas, inputs
    text:       palette.black,
    error:      palette.red500,
    success:    palette.green500,
  },
  spacing,
  typography,
  radius,
} as const;
```

```ts
// theme/themes/darkTheme.ts
import { palette } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';
import { radius } from '../tokens/radius';

export const darkTheme = {
  colors: {
    primary:    palette.blue500,
    onPrimary:  palette.white,
    background: palette.black,   // 👈 lo único que cambia es a qué primitivo apunta
    surface:    palette.gray800,
    text:       palette.white,
    error:      palette.red500,
    success:    palette.green500,
  },
  spacing,
  typography,
  radius,
} as const;
```

Fijate: `lightTheme` y `darkTheme` tienen **la misma forma**. Eso es lo que hace que el modo oscuro funcione sin tocar componentes.

### Paso 3 — Tipá el theme (autocompletado y seguridad)

Derivá el tipo de un tema. Así TypeScript te autocompleta los tokens y te avisa si usás uno que no existe.

```ts
// theme/types.ts
import { lightTheme } from './themes/lightTheme';

export type Theme = typeof lightTheme;
```

> Importante: `lightTheme` y `darkTheme` deben tener exactamente la misma estructura, para que el tipo `Theme` valga para los dos. Si agregás un token a uno, agregalo al otro.

### Paso 4 — ThemeProvider + useTheme

El provider entrega el tema activo a toda la app y permite cambiarlo. El hook `useTheme()` es la única forma en que los componentes acceden al theme.

```tsx
// theme/ThemeProvider.tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme } from './themes/lightTheme';
import { darkTheme } from './themes/darkTheme';
import type { Theme } from './types';

type Mode = 'light' | 'dark';
type ThemeContextValue = { theme: Theme; mode: Mode; toggleMode: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();              // 'light' | 'dark' del sistema operativo
  const [mode, setMode] = useState<Mode>(systemScheme ?? 'light');

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === 'dark' ? darkTheme : lightTheme,
      mode,
      toggleMode: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Acceso al theme (lo usan TODOS los componentes)
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx.theme;
}

// Hook extra para leer/cambiar el modo (ej. un switch de modo oscuro)
export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode debe usarse dentro de <ThemeProvider>');
  return { mode: ctx.mode, toggleMode: ctx.toggleMode };
}
```

```ts
// theme/index.ts  → la API pública del theme
export { ThemeProvider, useTheme, useThemeMode } from './ThemeProvider';
export type { Theme } from './types';
```

### Paso 5 — Envolvé la app con el provider

El `ThemeProvider` va lo más arriba posible, para que todo lo de abajo acceda al theme.

```tsx
// en App.tsx o en app/providers
import { ThemeProvider } from '@/theme';

export default function App() {
  return (
    <ThemeProvider>
      {/* resto de la app */}
    </ThemeProvider>
  );
}
```

---

## Cómo lo consumen los componentes

Los componentes **nunca** importan primitivos ni hardcodean valores. Piden el theme con `useTheme()` y derivan sus estilos de los **semánticos**. (Ver la receta de atoms para el patrón completo de `createStyles(theme)`.)

```tsx
const theme = useTheme();
// styles.button: { backgroundColor: theme.colors.primary, padding: theme.spacing.md }
```

Como `useTheme()` devuelve el tema activo, cuando el usuario cambia a modo oscuro, **todos los componentes se reestilizan solos**. No tenés que tocar ninguno.

---

## Modo oscuro: cómo se activa

Con la estructura de arriba, ya tenés modo oscuro casi gratis:

- `useColorScheme()` lee la preferencia del sistema operativo y arranca con ese modo.
- `useThemeMode().toggleMode()` permite que el usuario lo cambie manualmente (ej. un switch en Ajustes).
- Para que la elección del usuario **persista** entre sesiones, guardá el `mode` en el storage del proyecto y leelo al iniciar (ver cómo accede a storage el `CLAUDE.md` del proyecto).

---

## Checklist de un theme profesional

- [ ] **Primitivos separados de semánticos.** Los componentes usan solo semánticos (`primary`, `background`), nunca primitivos (`blue500`).
- [ ] **Escalas consistentes** en spacing/typography/radius (base 4 u 8), no números mágicos.
- [ ] **`lightTheme` y `darkTheme` con la misma forma**, para que el tipo `Theme` valga para ambos.
- [ ] **Tipado con TypeScript** (`type Theme = typeof lightTheme`) → autocompletado y errores si usás un token inexistente.
- [ ] **Un solo `useTheme()`** como puerta de acceso. Cero valores hardcodeados en componentes.
- [ ] **Pares de color con contraste suficiente** (`text` sobre `background`, `onPrimary` sobre `primary`) para legibilidad y a11y.

---

## Regla de jerarquía

Si este skill y el `CLAUDE.md` del proyecto se contradicen (ej. el proyecto todavía no usa `ThemeProvider` y importa el theme estático), **gana el `CLAUDE.md`**. Este skill define el patrón ideal; cada proyecto lo adopta a su ritmo.
