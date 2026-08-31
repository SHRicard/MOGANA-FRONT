# CLAUDE.md

> Frontend de una app móvil en **React Native CLI** (sin Expo, New Architecture).
> Este archivo define la **arquitectura, el stack y las reglas de cómo programar**. Seguilas en cada tarea.
> Este repo es **solo frontend**: consume una API REST que vive en otro proyecto. No maneja base de datos ni ORM.

---

## 🏛️ Arquitectura (principio rector)

**Screaming Architecture** → organización **por features**. La estructura grita el dominio, no el framework.

- Código agrupado por **funcionalidad (feature)**, nunca por tipo de archivo.
- Si lo usa **una sola feature** → vive **dentro** de esa feature.
- Si lo usan **dos o más** → sube a `shared/`.
- ❌ Prohibido crear carpetas globales tipo `screens/` o `components/` sueltas en `src/`.

---

## 📂 Estructura de carpetas

```
src/
├── app/
│   ├── navigation/          # Navegadores (Native Stack, tabs)
│   └── providers/           # Redux <Provider>, ThemeProvider
│
├── features/                # Una carpeta por funcionalidad
│   └── <feature>/
│       ├── components/      # Componentes solo de esta feature
│       ├── screens/         # Pantallas de la feature
│       ├── hooks/           # Hooks de la feature
│       ├── api/             # Endpoints RTK Query (injectEndpoints)
│       ├── store/           # Slice de Redux (estado de cliente)
│       └── types.ts
│
├── shared/                  # Reutilizable en TODA la app
│   ├── ui/                  # 🎨 Design system (Atomic Design)
│   │   ├── atoms/           # Button, Input, Text, Icon, Badge
│   │   ├── molecules/       # InputField, SearchBar, ListItem
│   │   └── organisms/       # Card, Header, Modal
│   ├── hooks/               # Hooks genéricos
│   └── utils/               # Helpers, formateadores
│
├── store/                   # Config global de Redux (configureStore + hooks tipados)
│
├── services/
│   ├── api/                 # baseApi de RTK Query (createApi + fetchBaseQuery)
│   └── storage/             # Instancia MMKV + storageService
│
├── theme/                   # Design tokens (primitivos + semánticos) + ThemeProvider/useTheme
│   ├── tokens/              # Primitivos: colors, spacing, typography, radius
│   ├── themes/              # Semánticos: lightTheme, darkTheme
│   └── ThemeProvider.tsx    # Provee el tema y expone useTheme() / useThemeMode()
├── types/                   # Tipos globales
└── config/                  # Variables de entorno + URL base de la API
```

---

## 🧱 Capas y flujo de datos

Los componentes **NO** llaman a la API directo. Flujo:

```
Screen → Hook → API slice (RTK Query) → fetchBaseQuery → API REST (externa)
```

- **Screen:** solo arma la UI y usa hooks. Sin lógica de negocio.
- **Estado de servidor** (datos de la API) → **RTK Query** (hooks generados).
- **Estado de cliente** (sesión, UI, preferencias) → **slices de Redux** (`useAppSelector` / `useAppDispatch`).
- **Estado local** de un componente (input, toggle, modal) → `useState` / `useReducer`, **sin librería**.

---

## 🎨 Design System (Atomic Design)

Componentes reutilizables en `shared/ui/`, organizados por nivel atómico:

```
Atoms → Molecules → Organisms → Screens
```

- **atoms/** → piezas mínimas, puro UI sin lógica: `Button`, `Input`, `Text`, `Icon`, `Badge`.
- **molecules/** → combinan atoms: `InputField`, `SearchBar`, `ListItem`.
- **organisms/** → combinan molecules: `Card`, `Header`, `Modal`.
- Los **templates** y **pages** de Atomic Design = nuestras **screens** (viven en cada feature, no en `shared/ui`).
- Los componentes de `shared/ui` **no tienen lógica de negocio ni llaman a la API**: reciben todo por props.

---

## 🖌️ Estilos y theme

- **StyleSheet nativo** (sin librerías de estilos externas).
- Los componentes acceden al theme **siempre** vía el hook `useTheme()` (provisto por el `ThemeProvider`, montado en la raíz de la app). ❌ Nunca importar el theme de forma estática en un componente.
- **Tokens en dos capas:** primitivos (valores crudos, ej. `blue500`) en `theme/tokens/`, y semánticos (significado, ej. `primary`, `background`, `text`) en `theme/themes/`. Los componentes usan **solo semánticos**, nunca primitivos.
- ❌ **Prohibido hardcodear valores** (colores, tamaños) en los componentes → siempre desde el theme.
- **Modo claro/oscuro** soportado desde el inicio: `lightTheme` y `darkTheme` con la misma forma, conmutados por el `ThemeProvider`. Persistir la preferencia del usuario en el storage (vía `storageService`).

---

## 🗄️ Storage local

- **MMKV** (`react-native-mmkv`) — síncrono, rápido.
- Siempre se accede vía `services/storage/storageService`. ❌ **Nunca usar la instancia MMKV directo** en componentes o features.
- Token de auth → instancia MMKV **encriptada** (`encryptionKey`), separada del storage general.

---

## 🛠️ Stack técnico

| Capa | Herramienta |
|---|---|
| Lenguaje | **TypeScript** (obligatorio, sin `any`) |
| Estado global / cliente | **Redux Toolkit** |
| Estado del servidor | **RTK Query** |
| Estado local | `useState` / `useReducer` |
| Formularios | **React Hook Form** |
| Validación | **Zod** (+ `@hookform/resolvers/zod`) |
| Navegación | **React Navigation** (Native Stack) |
| HTTP | **RTK Query** (`fetchBaseQuery`) — **sin axios** |
| Storage local | **MMKV** |
| Estilos | **StyleSheet** + theme (tokens primitivos/semánticos, `useTheme()`) |

Peer deps de React Navigation (se instalan una vez): `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated`.

---

## ⌨️ Comandos importantes

```bash
# Levantar Metro (servidor de desarrollo)
npx react-native start

# Compilar y correr en Android
npx react-native run-android

# Recargar la app: presionar 'r' en la terminal de Metro
```

---

## ✍️ Convenciones de código

- **Componentes / Screens:** `PascalCase` → `LoginScreen.tsx`, `Button.tsx`
- **Hooks:** `camelCase` con prefijo `use` → `useLogin.ts`
- **Slices de Redux:** `<feature>Slice.ts`
- **API slices RTK Query:** `<feature>Api.ts` (vía `injectEndpoints` sobre el `baseApi`)
- **Tipos:** `PascalCase`. Preferir **inferir** los tipos desde los schemas de Zod.
- **Path aliases** (`@/features`, `@/shared`, `@/theme`, etc.). ❌ Nada de imports relativos largos (`../../../`).
- Validar **siempre** las respuestas de la API con **Zod**.

---

## ✅ Reglas para Claude (importante)

1. **Trabajá siempre en una rama nueva** (`git checkout -b feature/...`). Nunca commitees directo a `main`.
2. **No modifiques `package.json` a mano** → usá `npm install <paquete>`.
3. **Respetá la estructura por features.** Antes de crear un archivo, decidí en qué feature (o en `shared/`) va.
4. **Nunca** pongas lógica de negocio ni llamadas a la API dentro de un screen.
5. **Componentes de UI reutilizables** → `shared/ui/` en su nivel atómico correcto, sin lógica de negocio, todo por props.
6. **Estilos** con StyleSheet + tokens del theme vía `useTheme()`. Usar solo tokens semánticos, nunca primitivos ni valores hardcodeados.
7. **Storage** siempre vía `storageService`. Nunca MMKV directo.
8. **Estado:** servidor con RTK Query, cliente con slices de Redux, local con `useState`. No mezclar.
9. **TypeScript siempre**, sin `any`. Usá path aliases, no imports relativos largos.
10. **Antes de instalar una librería nueva**, avisá y explicá por qué.
11. Mensajes de commit con convención: `feat:`, `fix:`, `chore:`, `refactor:`.
12. Si una tarea puede **romper algo**, explicá el cambio y esperá confirmación antes de aplicarlo.
