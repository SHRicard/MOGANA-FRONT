import type { ComponentType } from 'react';
import CaseSensitive from 'lucide-react-native/icons/case-sensitive';
import Moon from 'lucide-react-native/icons/moon';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Sun from 'lucide-react-native/icons/sun';
import Type from 'lucide-react-native/icons/type';
import {
  Fonts,
  FONT_LABEL,
  type FontPreference,
  type ThemeMode,
  type ThemeModePreference,
} from '@/theme';

/**
 * Forma mínima que cumple cualquier ícono de lucide. Tipamos lo que usamos en
 * vez de importar el tipo de la librería: la pantalla no tiene por qué atarse a
 * un paquete de íconos puntual (mismo criterio que `MENU_ITEMS`).
 */
export type OpcionIconComponent = ComponentType<{ size?: number; color?: string }>;

/**
 * Una opción de un ajuste, sea el tema o la letra. Es genérica porque las dos
 * listas se dibujan igual —ícono, nombre, una línea de qué hace— y lo único que
 * cambia son los valores que guarda cada una.
 */
export interface OpcionDeAjuste<T extends string> {
  /** Lo que se guarda. En el tema es la preferencia, no el modo resuelto. */
  valor: T;
  label: string;
  /** Una línea que dice qué pasa al elegirla. */
  descripcion: string;
  icon: OpcionIconComponent;
}

export type OpcionTema = OpcionDeAjuste<ThemeModePreference>;
export type OpcionTipografia = OpcionDeAjuste<FontPreference>;

/**
 * Las tres opciones de tema, en el orden en que se ofrecen.
 *
 * **Automático va primera** porque es con la que arranca la app: sin nada
 * guardado, el `ThemeProvider` sigue al sistema. La lista empieza, entonces, por
 * lo que la persona ya tiene puesto.
 *
 * Es un catálogo —un dato, no un componente— para que se pueda leer y testear
 * sin montar nada.
 */
export const OPCIONES_TEMA: readonly OpcionTema[] = [
  {
    valor: 'system',
    label: 'Automático',
    descripcion: 'Sigue el modo oscuro de tu teléfono',
    icon: Smartphone,
  },
  {
    valor: 'light',
    label: 'Claro',
    descripcion: 'Fondo claro a toda hora',
    icon: Sun,
  },
  {
    valor: 'dark',
    label: 'Oscuro',
    descripcion: 'Fondo oscuro a toda hora',
    icon: Moon,
  },
];

/**
 * Las tipografías, en el orden en que se ofrecen. **Inter primera**, por lo
 * mismo que Automático arriba: es con la que arranca la app.
 *
 * Los nombres salen de `FONT_LABEL` y no se escriben acá: la fuente se llama
 * igual en todos lados, y el catálogo del theme es el que sabe cómo se llama.
 */
export const OPCIONES_TIPOGRAFIA: readonly OpcionTipografia[] = [
  {
    valor: Fonts.INTER,
    label: FONT_LABEL[Fonts.INTER],
    descripcion: 'La de la app: números y textos chicos más legibles',
    icon: Type,
  },
  {
    valor: Fonts.SYSTEM,
    label: FONT_LABEL[Fonts.SYSTEM],
    descripcion: 'La misma letra que el resto de tu teléfono',
    icon: CaseSensitive,
  },
];

/**
 * Qué decir arriba de la lista de temas, en una línea.
 *
 * Con "Automático" hace falta aclarar **cómo se está viendo ahora**: la
 * preferencia elegida y lo que se ve en pantalla no son lo mismo, y sin esto la
 * persona ve "Automático" tildado sin ninguna pista de qué decidió el teléfono.
 * Con claro u oscuro no hay nada que aclarar: es lo que está a la vista.
 *
 * La lista de tipografías no necesita nada parecido: ahí lo elegido y lo que se
 * ve son siempre lo mismo.
 */
export function resumenTema(preferencia: ThemeModePreference, mode: ThemeMode): string {
  if (preferencia !== 'system') {
    return preferencia === 'dark' ? 'Estás en modo oscuro' : 'Estás en modo claro';
  }

  return mode === 'dark' ? 'Automático: ahora, oscuro' : 'Automático: ahora, claro';
}
