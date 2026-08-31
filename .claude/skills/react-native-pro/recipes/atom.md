# Receta: Atom

Guía para construir un **atom**: la pieza de UI más chica e indivisible, reutilizable en toda la app. Seguí estos pasos en orden. El ejemplo de referencia es un `Button` completo.

---

## 1. Cuándo usar esta receta

Un **atom** es un componente de UI mínimo que no se puede partir en piezas más chicas que tengan sentido solas. Ejemplos: `Button`, `Input`, `Text`, `Icon`, `Badge`, `Avatar`, `Spinner`.

**Test rápido:** ¿se puede descomponer en componentes más chicos que sirvan por separado? Si **sí**, no es un atom (probablemente es una molecule → ver `molecule.md`).

Un atom **NO**:
- combina varios atoms (eso es una molecule),
- tiene lógica de negocio,
- llama a la API ni accede a datos,
- conoce de qué feature forma parte.

Un atom recibe **todo por props** y solo se ocupa de **verse y comportarse** bien.

---

## 2. Estructura de archivos

Un atom completo vive en su **propia carpeta**, con un archivo por responsabilidad. Esto lo hace fácil de testear y mantener:

```
shared/ui/atoms/Button/
├── Button.tsx          # el componente
├── Button.types.ts     # las props tipadas
├── Button.styles.ts    # los estilos (derivados del theme)
├── Button.test.tsx     # los tests
└── index.ts            # export limpio
```

> Para atoms muy simples (ej. un `Text` que solo aplica tipografía), está bien tener todo en un archivo. Para uno completo como `Button`, separar conviene.

---

## 3. Anatomía paso a paso

### Paso 1 — Tipá las props

Definí una interfaz clara. Toda prop opcional tiene un default sensato en el componente. Incluí siempre las props necesarias para accesibilidad.

```ts
// Button.types.ts
import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  /** Texto que lee el lector de pantalla. Por defecto usa `label`. */
  accessibilityLabel?: string;
}
```

### Paso 2 — Derivá los estilos del theme (nunca hardcodees)

Los estilos salen de los **tokens del theme** (colores, espaciados, radios, tipografía). Usá una **factory** que recibe el theme: así el atom se adapta solo si cambia el tema (ej. modo oscuro).

```ts
// Button.styles.ts
import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme'; // el tipo del theme del proyecto

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 44, // touch target accesible (ver checklist a11y)
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    label: { fontSize: theme.typography.body, fontWeight: '600' },

    // variantes: fondo
    primary: { backgroundColor: theme.colors.primary },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    // variantes: color del texto
    primaryLabel: { color: theme.colors.onPrimary },
    secondaryLabel: { color: theme.colors.primary },

    // estados
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
  });
```

> **Acceso al theme:** este ejemplo usa un hook `useTheme()` (soporta temas dinámicos / modo oscuro). Si tu proyecto importa el theme de forma estática, reemplazá `const theme = useTheme()` por el import directo. Lo que **no** cambia: los valores siempre salen del theme, nunca hardcodeados.

### Paso 3 — Escribí el componente

El componente arma la UI, conecta los estados y aplica las props de accesibilidad.

```tsx
// Button.tsx
import { memo, useMemo } from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';
import { createStyles } from './Button.styles';
import type { ButtonProps } from './Button.types';

function ButtonComponent({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  leftIcon,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]); // no recrea estilos en cada render

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      // --- accesibilidad ---
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // --- estilos: el press da feedback visual ---
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.onPrimary} />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
        </View>
      )}
    </Pressable>
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

Antes de dar por terminado el atom, verificá:

- [ ] **`accessibilityRole`** correcto (`button`, `image`, `text`, etc.).
- [ ] **`accessibilityLabel`** presente, sobre todo si el atom es solo un ícono (sin texto visible). Sin label, el lector de pantalla no sabe qué es.
- [ ] **`accessibilityState`** refleja el estado real (`disabled`, `busy`, `selected`, `checked`).
- [ ] **Touch target** de mínimo **44x44** puntos (acá lo damos con `minHeight: 44`).
- [ ] **No comunicar solo con color.** Un estado de error o éxito necesita texto o ícono además del color, por las personas daltónicas.

---

## 5. Checklist de performance

- [ ] **`React.memo`** envuelve el componente: un atom se renderiza muchísimas veces (en listas, repetido en la pantalla), y `memo` evita re-renders cuando las props no cambian.
- [ ] **`useMemo`** para los estilos derivados del theme: no recrear el `StyleSheet` en cada render.
- [ ] **No crear funciones/objetos inline** que se pasen a hijos memoizados sin necesidad (romperían la memoización).
- [ ] **Cuidado con los defaults de objetos/arrays** en props: un `= {}` o `= []` por defecto crea una referencia nueva en cada render. Si hace falta, definilo como constante fuera del componente.

> Regla de oro: memoizá un atom **siempre** (se usa mucho), pero no caigas en memoizar todo lo de adentro por reflejo — medí si hace falta.

---

## 6. Cómo testearlo

Testeá el **comportamiento que ve el usuario**, no los detalles internos. Herramienta: **React Native Testing Library** (busca por rol/label de accesibilidad, lo que de paso valida el punto 3).

Qué testear en un atom como `Button`:
- que **renderiza** el label,
- que **llama a `onPress`** al tocarlo,
- que **NO llama a `onPress`** si está `disabled` o `loading`,
- que **muestra el spinner** cuando `loading` es `true`.

```tsx
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('muestra el label', () => {
    render(<Button label="Guardar" onPress={() => {}} />);
    expect(screen.getByText('Guardar')).toBeTruthy();
  });

  it('llama a onPress al tocarlo', () => {
    const onPress = jest.fn();
    render(<Button label="Guardar" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no llama a onPress si está disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Guardar" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

---

## 7. Resultado: un atom completo

Si seguiste la receta, el `Button` tiene todo lo que define un atom profesional:

- ✅ **Chico y reutilizable** en toda la app, sin lógica de negocio.
- ✅ **Tipado** con TypeScript, props claras con defaults.
- ✅ **Toma el theme** (colores, espaciados, radios) — cero valores hardcodeados.
- ✅ **Variantes y estados** (primary/secondary, disabled, loading) listos para usar.
- ✅ **Accesible** (role, label, state, touch target).
- ✅ **Performante** (memoizado, estilos cacheados).
- ✅ **Testeado** en su comportamiento visible.

Replicá esta misma estructura para cualquier otro atom (`Input`, `Badge`, `Avatar`): cambia el contenido, pero el esqueleto y los checklists son los mismos.
