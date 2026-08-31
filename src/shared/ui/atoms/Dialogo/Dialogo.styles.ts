import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/** Lado del círculo que enmarca el ícono. */
const CIRCULO = 64;

/**
 * Ancho máximo de la tarjeta. En un celular se lleva casi todo el ancho; en una
 * tablet se planta acá en vez de estirarse de borde a borde, que es lo que hace
 * que un diálogo se vea como una franja.
 */
const ANCHO_MAXIMO = 420;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /** Capa que cubre la pantalla y come los toques de lo que hay detrás. */
    overlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },

    /**
     * La caja que centra la tarjeta. Es la que se achica cuando sube el teclado
     * (`KeyboardAvoidingView`), así el diálogo con un campo adentro no queda
     * tapado.
     */
    centro: {
      width: '100%',
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
    },

    tarjeta: {
      width: '100%',
      maxWidth: ANCHO_MAXIMO,
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      // Sombra para despegarla del fondo oscurecido: sin relieve, la tarjeta se
      // lee como un recorte del mismo plano.
      elevation: 12,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },

    /** El círculo del ícono. El color de fondo lo pone el tono, en runtime. */
    circulo: {
      width: CIRCULO,
      height: CIRCULO,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      marginBottom: theme.spacing.xs,
    },

    /** El contenido libre, con aire arriba y ocupando todo el ancho. */
    cuerpo: {
      width: '100%',
      marginTop: theme.spacing.xs,
    },

    acciones: {
      width: '100%',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
  });
