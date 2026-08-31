import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      backgroundColor: theme.colors.surfaceVariant,
      borderColor: theme.colors.border,
    },
    /**
     * Los chips que se tocan son más altos y más anchos: necesitan área táctil
     * (se completa con `hitSlop`) y se leen como un control. Los informativos
     * quedan compactos — son una etiqueta al lado de un texto, y si miden lo
     * mismo que un botón le roban peso a la fila.
     */
    tocable: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
    },

    // ── Tonos ──
    // `neutral` no pinta nada: es la `base`. Existe como entrada para que el
    // componente pueda hacer `styles[tone]` sin un caso especial.
    neutral: {},
    brand: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primaryMuted,
    },
    /** Falta un dato: ámbar teñido. Se completa, no es un castigo. */
    warning: {
      backgroundColor: theme.colors.warningMuted,
      borderColor: theme.colors.warningMuted,
    },
    /** Advertencia: teñido, no pleno — es una etiqueta, no un badge de estado. */
    danger: {
      backgroundColor: theme.colors.errorMuted,
      borderColor: theme.colors.errorMuted,
    },

    /**
     * Seleccionado invierte el chip (fondo lleno) además de cambiar el color:
     * el estado no se comunica solo con el tono, que es lo que dejaría afuera a
     * una persona daltónica.
     */
    selected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pressed: { opacity: 0.7 },
  });
