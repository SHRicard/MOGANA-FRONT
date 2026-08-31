import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /**
   * Ícono ilustrativo. Es decorativo: lo que comunica es el `title`, así que no
   * hace falta que tenga label propio.
   */
  icon?: ReactNode;
  title: string;
  /** Qué pasó y, si aplica, qué puede hacer la persona al respecto. */
  description?: string;
  /** Acción sugerida (un Button, normalmente). */
  action?: ReactNode;
}
