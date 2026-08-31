import type { ReactNode } from 'react';

/**
 * Peso visual del botón.
 *
 *  - `primary`: la acción principal.
 *  - `secondary` / `ghost`: las que la acompañan.
 *  - `danger`: la que **destruye o no se puede deshacer** (anular una factura).
 *    Va en rojo pleno y no apenas teñida a propósito: tiene que verse antes de
 *    tocarla, no después.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Peso del botón en la pantalla.
 *
 *  - `md` (default): la acción principal de una pantalla o de un formulario.
 *  - `sm`: acciones que viven **dentro de una fila de lista**, donde un botón de
 *    alto completo aplasta el contenido. El área táctil sigue siendo de 44
 *    aunque se vea chico — la agranda el `hitSlop`, no el dibujo.
 */
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean;
  /** Texto que lee el lector de pantalla. Por defecto usa `label`. */
  accessibilityLabel?: string;
  /** Identificador para tests. */
  testID?: string;
}
