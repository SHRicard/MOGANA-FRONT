import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
      // `surfaceVariant` y no `surface`: sobre fondo blanco, surface (#FAFAFA)
      // casi no se distingue y el campo se ve lavado.
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    // Al enfocar, el borde se engrosa además de cambiar de color: el estado no
    // se comunica solo con color (ver checklist de a11y).
    focused: { borderColor: theme.colors.primary, borderWidth: 2 },
    error: { borderColor: theme.colors.error, borderWidth: 2 },
    disabled: { opacity: 0.5 },

    input: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.body,
      lineHeight: theme.lineHeight.body,
      color: theme.colors.text,
      // Un TextInput no puede usar el atom Text, así que la fuente elegida se
      // aplica acá a mano. Sin esto, lo que se escribe queda con la letra del
      // sistema y el resto de la pantalla con la elegida.
      ...theme.fonts.regular,
    },

    toggle: {
      // Touch target accesible sin agrandar la caja del input
      padding: theme.spacing.xs,
      margin: -theme.spacing.xs,
    },
  });
