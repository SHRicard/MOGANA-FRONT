import type { ReactNode } from 'react';
import type { TextInputProps } from 'react-native';

/**
 * Props del atom Input.
 * Extiende TextInput pero deja fuera `style`: los estilos salen del theme,
 * no se inyectan desde afuera.
 */
export interface InputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Pinta el borde en color de error. El mensaje lo muestra el InputField. */
  hasError?: boolean;
  /** Muestra el ojo para revelar/ocultar el texto (contraseñas). */
  toggleSecureEntry?: boolean;
  /**
   * Ícono a la izquierda, adentro del campo. Decorativo: dice de qué es el
   * campo (una lupa en un buscador) y por eso no lleva label propio.
   */
  leftIcon?: ReactNode;
  /**
   * Muestra una "✕" para vaciar el campo cuando tiene texto. Sin esto, borrar
   * una búsqueda larga es aguantar el backspace.
   */
  onClear?: () => void;
}
