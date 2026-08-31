import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/** Tamaño del ícono de cada tab. */
export const TAB_ICON_SIZE = 24;

/**
 * Alto de la barra, sin contar el safe area de abajo (ese se suma en runtime).
 * Entra el ícono de 24 + su label, y supera el mínimo táctil de 44pt.
 */
const BAR_HEIGHT = 56;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      // Hairline y no 1: en pantallas densas un borde de 1dp se ve como una
      // franja gris. Acá tiene que ser apenas una separación.
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    item: {
      flex: 1,
      height: BAR_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.xxs,
    },
    pressed: { opacity: 0.6 },

    /** Caja del tamaño exacto del ícono: es el ancla del badge. */
    iconSlot: {
      width: TAB_ICON_SIZE,
      height: TAB_ICON_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeSlot: {
      position: 'absolute',
      top: -theme.spacing.sm,
      right: -theme.spacing.sm,
    },
  });
