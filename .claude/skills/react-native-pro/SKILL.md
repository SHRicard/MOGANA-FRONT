---
name: react-native-pro
description: Recetas paso a paso para construir frontend profesional en React Native CLI — atoms, molecules, organisms, screens y formularios — aplicando patrones de componentes, optimización de performance, accesibilidad (a11y) y testing. Usá este skill SIEMPRE que tengas que crear o refactorizar cualquier componente, pantalla, hook o formulario en React Native, aunque el usuario no diga explícitamente "receta" o "profesional". Aplica solo a proyectos React Native CLI (no Expo, no React web).
---

# React Native Pro

Recetas para construir frontend de nivel senior en React Native CLI. Este skill **no impone un stack** (eso lo decide cada proyecto en su `CLAUDE.md`): se enfoca en el **oficio** — cómo construir cada cosa bien, con buenos patrones, rápida, accesible y testeable.

Cada vez que vayas a construir algo (un atom, una screen, un formulario), abrí la receta correspondiente y seguila. No improvises la estructura: las recetas existen para que el resultado sea consistente y profesional siempre.

---

## Cómo usar este skill

1. Identificá **qué** vas a construir (¿un atom? ¿una screen? ¿un formulario?).
2. Abrí la receta correspondiente del índice de abajo y leela **antes** de escribir código.
3. Aplicá los **principios base** (esta sección) que valen para todo, más los pasos específicos de la receta.

---

## Índice de recetas

Leé el archivo que corresponda según lo que estés construyendo:

| Si vas a construir... | Leé | Cuándo |
|---|---|---|
| Un componente mínimo e indivisible (Button, Input, Text, Icon) | `recipes/atom.md` | Pieza de UI pura, sin lógica de negocio |
| Un componente que combina atoms (InputField, SearchBar, ListItem) | `recipes/molecule.md` | Unidad con sentido propio hecha de atoms |
| Una pantalla completa | `recipes/screen.md` | Compone organisms/molecules, maneja carga y error |
| Un formulario | `recipes/form.md` | Captura y valida datos del usuario |

Si lo que vas a construir no encaja claro en una receta, usá la más cercana y aplicá el criterio de los principios base.

---

## Principios base (aplican a TODA receta)

Estos cuatro pilares se aplican siempre, sin importar qué estés construyendo. Cada receta los retoma con detalle, pero esta es la base mental.

### 1. Patrones de componentes y arquitectura

- **Una responsabilidad por componente.** Si un componente hace demasiado (UI + lógica + llamadas a datos), partilo. Es más fácil de testear, reusar y entender.
- **Separá presentación de lógica.** Los componentes de UI reciben datos y callbacks por **props**; no llaman a la API ni guardan lógica de negocio adentro. La lógica vive en hooks.
- **Componé, no configures de más.** Preferí componentes chicos que se combinan antes que un componente gigante con 20 props condicionales.
- **Tipá todo con TypeScript.** Las props siempre tienen su `type`/`interface`. Nada de `any`.

### 2. Performance y optimización de renders

- **Optimizá cuando hay un motivo, no por reflejo.** Memoizar todo de entrada agrega complejidad sin beneficio. Medí primero.
- **`React.memo`** para componentes que reciben las mismas props y re-renderizan seguido sin necesidad.
- **`useCallback` / `useMemo`** para no recrear funciones u objetos que se pasan como props a componentes memoizados (si no, la memoización no sirve).
- **Listas:** nunca uses `.map()` para listas largas. Usá `FlatList`/`FlashList` con `keyExtractor` estable, y evitá funciones inline en `renderItem`.
- **Evitá trabajo en el render.** Cálculos pesados van en `useMemo`; nada de crear objetos/arrays nuevos en cada render sin razón.

### 3. Accesibilidad (a11y)

Diseñar para que la app la pueda usar todo el mundo, incluyendo personas que usan lectores de pantalla. En React Native se logra con props de accesibilidad:

- **`accessible`** → marca el elemento como una unidad accesible.
- **`accessibilityLabel`** → el texto que lee el lector de pantalla (clave en botones con solo íconos).
- **`accessibilityRole`** → qué es el elemento (`button`, `header`, `image`, etc.).
- **`accessibilityState`** → estado (`disabled`, `selected`, `checked`).
- **Touch targets** de mínimo ~44x44 puntos para que sean fáciles de tocar.
- **Nunca comuniques algo solo con color** (ej. error en rojo): sumá texto o ícono, porque hay personas daltónicas.

### 4. Testing y manejo de errores

- **Qué testear:** comportamiento visible, no detalles de implementación. Que el componente renderice lo correcto y responda a la interacción del usuario.
- **Herramienta estándar:** React Native Testing Library (apunta a testear como lo usaría una persona real, buscando por rol/label de accesibilidad — lo que además refuerza el punto 3).
- **Manejo de errores:** toda operación que puede fallar (llamada a datos, parseo) maneja sus tres estados: **cargando / éxito / error**. Nunca dejes una pantalla colgada sin feedback.
- **Error boundaries** para que un error en un componente no tire abajo toda la app.

---

## Reglas transversales

- Antes de crear un archivo, ubicalo en la estructura correcta del proyecto (lo define el `CLAUDE.md` del proyecto).
- Si una receta y el `CLAUDE.md` del proyecto se contradicen, **gana el `CLAUDE.md`** (es la fuente de verdad de ese proyecto puntual).
- Mantené el código tipado, legible y consistente con lo que ya existe en el proyecto.
