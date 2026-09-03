import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/** Lado del cuadrito. Chico, pero el área táctil la agranda el `hitSlop`. */
export const CAJA = 22;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },

    caja: {
      width: CAJA,
      height: CAJA,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface,
    },
    /**
     * Tildada se **rellena** además de cambiar el borde: el estado no se
     * comunica solo con el color, que es lo que dejaría afuera a una persona
     * daltónica. El tilde de adentro lo termina de decir.
     */
    marcada: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    deshabilitada: { opacity: 0.4 },
    presionada: { opacity: 0.6 },

    /** `flex: 1` para que el texto baje de línea en vez de empujar la caja. */
    label: { flex: 1 },
  });
