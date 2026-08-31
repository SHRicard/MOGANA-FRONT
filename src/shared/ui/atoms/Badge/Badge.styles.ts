import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/**
 * Alto del badge con número. No sale de la escala de espaciados a propósito:
 * es el mínimo en el que entra un contador de dos dígitos con la tipografía
 * `micro` sin que se recorte.
 */
const BADGE_SIZE = 18;

/** Diámetro del badge en modo `dot`. */
const DOT_SIZE = 8;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minWidth: BADGE_SIZE,
      height: BADGE_SIZE,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      minWidth: DOT_SIZE,
      width: DOT_SIZE,
      height: DOT_SIZE,
      paddingHorizontal: 0,
    },

    // Tonos
    error: { backgroundColor: theme.colors.error },
    primary: { backgroundColor: theme.colors.primary },
  });
