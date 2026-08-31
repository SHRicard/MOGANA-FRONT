# Receta: Atom (web)

Guía para construir un **atom**: la pieza de UI más chica e indivisible, reutilizable en toda la app. Seguí estos pasos en orden. El ejemplo de referencia es un `Button` completo.

> Versión web de la receta de atoms. La filosofía es idéntica a React Native; cambia el elemento (`<button>` del DOM en vez de `Pressable`), los estilos (CSS en vez de StyleSheet) y los detalles de a11y/testing.

---

## 1. Cuándo usar esta receta

Un **atom** es un componente de UI mínimo que no se puede partir en piezas más chicas que tengan sentido solas. Ejemplos: `Button`, `Input`, `Text`, `Icon`, `Badge`, `Avatar`, `Spinner`.

**Test rápido:** ¿se puede descomponer en componentes más chicos que sirvan por separado? Si **sí**, no es un atom (probablemente es una molecule → ver `molecule.md`).

Un atom **NO**:
- combina varios atoms (eso es una molecule),
- tiene lógica de negocio,
- hace fetch ni accede a datos,
- conoce de qué feature forma parte.

Un atom recibe **todo por props** y solo se ocupa de **verse y comportarse** bien.

---

## 2. Estructura de archivos

Un atom completo vive en su **propia carpeta**, con un archivo por responsabilidad:

```
shared/ui/atoms/Button/
├── Button.tsx          # el componente
├── Button.types.ts     # las props tipadas
├── Button.module.css   # los estilos (tokens vía CSS variables)
├── Button.test.tsx     # los tests
└── index.ts            # export limpio
```

> El ejemplo usa **CSS Modules**, que es la opción de estilos más neutral y sin dependencias. Si tu proyecto usa otra solución (Tailwind, styled-components, etc.), adaptá el Paso 2; lo definido en el `CLAUDE.md` del proyecto manda.

---

## 3. Anatomía paso a paso

### Paso 1 — Tipá las props

Definí una interfaz clara. Toda prop opcional tiene un default sensato en el componente. En web, el `type` del botón importa (el default del DOM es `submit`, que rompe cosas dentro de formularios).

```ts
// Button.types.ts
import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  /** Texto que lee el lector de pantalla. Por defecto usa `label`. */
  ariaLabel?: string;
}
```

### Paso 2 — Estilos desde los tokens (nunca hardcodees)

Los valores salen de **CSS variables** (el equivalente web de los tokens del theme), nunca colores sueltos. Definidas una sola vez a nivel global (ej. en `:root`), se consumen en cualquier componente.

```css
/* Button.module.css */
.base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  min-height: 44px;                 /* click/touch target accesible */
  padding: 0 var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-body);
  font-weight: 600;
  cursor: pointer;
}

.base:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* foco visible para navegación por teclado (a11y) */
.base:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* variantes */
.primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.secondary {
  background-color: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}
```

> Las CSS variables (`--color-primary`, etc.) son los **tokens semánticos** del proyecto, definidos en un solo lugar. Nunca pongas un `#hex` suelto en el componente.

### Paso 3 — Escribí el componente

Acá está la **regla de oro de a11y en web**: usá un `<button>` real, no un `<div onClick>`. El `<button>` nativo ya maneja el teclado (Enter/Espacio), el foco y el estado `disabled` **solo**. Reescribir eso con un `div` es trabajo extra y casi siempre queda inaccesible.

```tsx
// Button.tsx
import { memo } from 'react';
import type { ButtonProps } from './Button.types';
import styles from './Button.module.css';

function ButtonComponent({
  label,
  onClick,
  variant = 'primary',
  type = 'button',     // 👈 default seguro (evita submits accidentales)
  disabled = false,
  loading = false,
  leftIcon,
  ariaLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel ?? label}
      aria-busy={loading}
      className={`${styles.base} ${styles[variant]}`}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        <>
          {leftIcon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export const Button = memo(ButtonComponent); // ver checklist de performance
```

### Paso 4 — Export limpio

```ts
// index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button.types';
```

Así se importa cómodo: `import { Button } from '@/shared/ui/atoms/Button'`.

---

## 4. Checklist de accesibilidad (a11y)

- [ ] **Etiqueta semántica correcta:** `<button>` para acciones (no un `<div onClick>`). El botón nativo ya da teclado + foco + estado disabled gratis.
- [ ] **`aria-label`** presente si el botón es solo un ícono (sin texto visible).
- [ ] **`aria-busy`** / `disabled` reflejan el estado real.
- [ ] **Foco visible** con `:focus-visible` (clave para quien navega con teclado).
- [ ] **Target** de mínimo **44px** de alto para que sea fácil de tocar/clickear.
- [ ] **No comunicar solo con color.** Un estado de error/éxito necesita texto o ícono además del color.

---

## 5. Checklist de performance

- [ ] **`React.memo`** envuelve el componente: un atom se renderiza muchísimas veces (en listas, repetido en la página), y `memo` evita re-renders cuando las props no cambian.
- [ ] **No crear funciones/objetos inline** que se pasen a hijos memoizados sin necesidad (romperían la memoización).
- [ ] **Cuidado con los defaults de objetos/arrays** en props: un `= {}` o `= []` por defecto crea una referencia nueva en cada render. Definilo como constante fuera del componente si hace falta.
- [ ] Los **CSS Modules** se compilan a clases estáticas: cero costo en runtime (a diferencia de estilos calculados en JS). No necesitás memoizar estilos.

---

## 6. Cómo testearlo

Testeá el **comportamiento que ve el usuario**, no los detalles internos. Herramientas: **React Testing Library** (`@testing-library/react`) + **`@testing-library/user-event`** (simula clicks/teclado como una persona real).

Qué testear en un atom como `Button`:
- que **renderiza** el label,
- que **llama a `onClick`** al hacer click,
- que **NO llama a `onClick`** si está `disabled` o `loading`,
- que **muestra el spinner** cuando `loading` es `true`.

```tsx
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('muestra el label', () => {
    render(<Button label="Guardar" onClick={() => {}} />);
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  it('llama a onClick al hacer click', async () => {
    const onClick = jest.fn();
    render(<Button label="Guardar" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('no llama a onClick si está disabled', async () => {
    const onClick = jest.fn();
    render(<Button label="Guardar" onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

> Fijate que buscamos por `getByRole('button')`: testear por rol de accesibilidad refuerza el punto 3. Si el botón no fuera accesible, este test ni lo encontraría.

---

## 7. Resultado: un atom completo

Si seguiste la receta, el `Button` tiene todo lo que define un atom profesional en web:

- ✅ **Chico y reutilizable** en toda la app, sin lógica de negocio.
- ✅ **Tipado** con TypeScript, props claras con defaults seguros (`type="button"`).
- ✅ **Toma los tokens** (CSS variables) — cero valores hardcodeados.
- ✅ **Variantes y estados** (primary/secondary, disabled, loading) listos para usar.
- ✅ **Accesible** (`<button>` semántico, aria-label, foco visible, teclado gratis).
- ✅ **Performante** (memoizado, estilos estáticos sin costo en runtime).
- ✅ **Testeado** en su comportamiento visible.

Replicá esta misma estructura para cualquier otro atom (`Input`, `Badge`, `Avatar`): cambia el contenido, pero el esqueleto y los checklists son los mismos.
