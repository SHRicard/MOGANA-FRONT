---
name: react-web-pro
description: Recetas paso a paso para construir frontend profesional en React web (DOM) — atoms, molecules, organisms, pages y formularios — aplicando patrones de componentes, optimización de performance, accesibilidad (a11y) y testing. Usá este skill SIEMPRE que tengas que crear o refactorizar cualquier componente, página, hook o formulario en una app React para web, aunque el usuario no diga explícitamente "receta" o "profesional". Aplica solo a React web (no React Native).
---

# React Web Pro

Recetas para construir frontend de nivel senior en React para web. Este skill **no impone un stack** (eso lo decide cada proyecto en su `CLAUDE.md`): se enfoca en el **oficio** — cómo construir cada cosa bien, con buenos patrones, rápida, accesible y testeable.

Cada vez que vayas a construir algo (un atom, una page, un formulario), abrí la receta correspondiente y seguila. No improvises la estructura: las recetas existen para que el resultado sea consistente y profesional siempre.

---

## Cómo usar este skill

1. Identificá **qué** vas a construir (¿un atom? ¿una page? ¿un formulario?).
2. Abrí la receta correspondiente del índice de abajo y leela **antes** de escribir código.
3. Aplicá los **principios base** (esta sección) que valen para todo, más los pasos específicos de la receta.

---

## Índice de recetas

Leé el archivo que corresponda según lo que estés construyendo:

| Si vas a construir... | Leé | Cuándo |
|---|---|---|
| Un componente mínimo e indivisible (Button, Input, Text, Icon) | `recipes/atom.md` | Pieza de UI pura, sin lógica de negocio |
| Un componente que combina atoms (InputField, SearchBar, ListItem) | `recipes/molecule.md` | Unidad con sentido propio hecha de atoms |
| Una página completa (ruta) | `recipes/page.md` | Compone organisms/molecules, maneja carga y error |
| Un formulario | `recipes/form.md` | Captura y valida datos del usuario |

Si lo que vas a construir no encaja claro en una receta, usá la más cercana y aplicá el criterio de los principios base.

---

## Principios base (aplican a TODA receta)

Estos cuatro pilares se aplican siempre, sin importar qué estés construyendo. Cada receta los retoma con detalle, pero esta es la base mental.

### 1. Patrones de componentes y arquitectura

- **Una responsabilidad por componente.** Si un componente hace demasiado (UI + lógica + fetch de datos), partilo. Es más fácil de testear, reusar y entender.
- **Separá presentación de lógica.** Los componentes de UI reciben datos y callbacks por **props**; no hacen fetch ni guardan lógica de negocio adentro. La lógica vive en hooks.
- **Componé, no configures de más.** Preferí componentes chicos que se combinan antes que un componente gigante con 20 props condicionales.
- **Tipá todo con TypeScript.** Las props siempre tienen su `type`/`interface`. Nada de `any`.

### 2. Performance y optimización de renders

- **Optimizá cuando hay un motivo, no por reflejo.** Memoizar todo de entrada agrega complejidad sin beneficio. Medí primero (React DevTools Profiler).
- **`React.memo`** para componentes que reciben las mismas props y re-renderizan seguido sin necesidad.
- **`useCallback` / `useMemo`** para no recrear funciones u objetos que se pasan como props a componentes memoizados.
- **Listas largas:** usá **virtualización** (`react-window` o `@tanstack/react-virtual`) en vez de renderizar miles de nodos. Keys estables, **nunca el índice del array como key**.
- **Code splitting:** cargá rutas y componentes pesados bajo demanda con `React.lazy` + `Suspense`. Reduce el bundle inicial y mejora el tiempo de carga.
- **Imágenes:** `loading="lazy"`, tamaños correctos y formatos modernos. Cuidá el tamaño del bundle (imports puntuales, tree-shaking).

### 3. Accesibilidad (a11y)

Diseñar para que la app la pueda usar todo el mundo, incluyendo personas que navegan con teclado o lector de pantalla. En web, la base es el **HTML semántico**:

- **Usá la etiqueta correcta:** `<button>` para acciones (no un `<div onClick>`), `<a>` para navegar, `<nav>`, `<header>`, `<main>`, `<ul>`. El HTML semántico ya viene accesible de fábrica.
- **ARIA solo cuando el HTML no alcanza:** `aria-label` (botones sin texto), `aria-expanded`, `aria-hidden` (íconos decorativos), `role` para componentes custom.
- **Navegación por teclado:** todo lo interactivo debe ser accesible con Tab, con **foco visible**, y manejo de foco en modales/diálogos.
- **Imágenes:** `alt` descriptivo (o `alt=""` si es decorativa).
- **Formularios:** todo input con su `<label htmlFor>` asociado.
- **Nunca comuniques algo solo con color** (ej. error en rojo): sumá texto o ícono, por las personas daltónicas. Cuidá el contraste.

### 4. Testing y manejo de errores

- **Qué testear:** comportamiento visible, no detalles de implementación. Que el componente renderice lo correcto y responda a la interacción del usuario.
- **Herramienta estándar:** React Testing Library (`@testing-library/react`) + `@testing-library/user-event`. Apunta a testear como lo usaría una persona real, buscando por **rol/label de accesibilidad** — lo que además refuerza el punto 3.
- **Manejo de errores:** toda operación que puede fallar (fetch, parseo) maneja sus tres estados: **cargando / éxito / error**. Nunca dejes una página colgada sin feedback.
- **Error boundaries** para que un error en un componente no tire abajo toda la app.

---

## Reglas transversales

- Antes de crear un archivo, ubicalo en la estructura correcta del proyecto (lo define el `CLAUDE.md` del proyecto).
- Si una receta y el `CLAUDE.md` del proyecto se contradicen, **gana el `CLAUDE.md`** (es la fuente de verdad de ese proyecto puntual).
- Mantené el código tipado, legible y consistente con lo que ya existe en el proyecto.
