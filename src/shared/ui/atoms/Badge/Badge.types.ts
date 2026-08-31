/** Color de fondo del badge. Cada tono tiene su token de texto encima. */
export type BadgeTone = 'error' | 'primary';

export interface BadgeProps {
  /**
   * Cantidad a mostrar. `0` o `undefined` NO renderiza nada: un badge en cero
   * es ruido visual. Para avisar "hay algo nuevo" sin decir cuánto, usá `dot`.
   */
  count?: number;
  /** Tope. Por encima muestra `${max}+`, para que el badge no se estire. */
  max?: number;
  /** Punto sin número. Ignora `count`. */
  dot?: boolean;
  /** Fondo del badge. Por defecto `error` (el rojo clásico de notificaciones). */
  tone?: BadgeTone;
  /**
   * Texto para el lector de pantalla. Sin esto lee solo el número suelto ("3"),
   * que fuera de contexto no significa nada. Ej: "3 notificaciones sin leer".
   */
  accessibilityLabel?: string;
}
