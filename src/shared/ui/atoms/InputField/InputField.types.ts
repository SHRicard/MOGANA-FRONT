import type { InputProps } from '@/shared/ui/atoms/Input';

export interface InputFieldProps extends InputProps {
  /** Etiqueta visible arriba del input. */
  label: string;
  /** Mensaje de error. Si viene, el input se pinta en rojo y se muestra debajo. */
  error?: string;
  /** Texto de ayuda. Se oculta cuando hay `error`. */
  helperText?: string;
}
