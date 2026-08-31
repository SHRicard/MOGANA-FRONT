import type { TextStyle } from 'react-native';

/**
 * Capa 1 — Tokens PRIMITIVOS: escala tipográfica.
 * `typography.body` es un TAMAÑO de fuente (número), listo para `fontSize`.
 */
export const typography = {
  // El piso de la escala. Solo para etiquetas de chrome que compiten por muy
  // poco ancho (labels de la tab bar, contadores de un badge). ❌ Nunca para
  // texto de contenido: a este tamaño deja de ser cómodo de leer.
  micro: 10,
  caption: 12,
  small: 14,
  body: 16,
  subtitle: 18,
  title: 22,
  heading: 28,
  display: 34,
} as const;

/** Altura de línea recomendada por tamaño (legibilidad). */
export const lineHeight = {
  micro: 13,
  caption: 16,
  small: 20,
  body: 24,
  subtitle: 26,
  title: 30,
  heading: 36,
  display: 42,
} as const;

/** Pesos tipográficos. Tipados como TextStyle['fontWeight'] para que RN los acepte. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;
