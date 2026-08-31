import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/**
 * Factory de estilos: recibe el theme activo y devuelve el StyleSheet.
 * Así el atom se re-estiliza solo al cambiar de tema (claro/oscuro).
 * ❌ Cero valores hardcodeados: todo sale de tokens semánticos.
 */
export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 52, // acompaña el alto de los inputs; supera el mínimo táctil de 44
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /**
     * Chico: para acciones dentro de una fila. No baja de 36 de alto —abajo de
     * eso el texto queda apretado contra el borde— y lo que falta para el
     * mínimo táctil de 44 lo pone el `hitSlop` del componente.
     */
    sm: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md,
    },
    smLabel: {
      fontSize: theme.typography.small,
      lineHeight: theme.lineHeight.small,
    },

    fullWidth: { alignSelf: 'stretch' },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: theme.typography.body,
      lineHeight: theme.lineHeight.body,
      // Spreado, no un `fontWeight` suelto: ver el atom Text.
      ...theme.fonts.semibold,
    },

    // Variantes: fondo
    primary: { backgroundColor: theme.colors.primary },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    ghost: { backgroundColor: 'transparent' },
    /** Rojo pleno: una acción que destruye tiene que verse antes de tocarla. */
    danger: { backgroundColor: theme.colors.error },

    // Variantes: color del texto
    primaryLabel: { color: theme.colors.onPrimary },
    secondaryLabel: { color: theme.colors.primary },
    ghostLabel: { color: theme.colors.primary },
    dangerLabel: { color: theme.colors.onError },

    // Estados
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
  });
