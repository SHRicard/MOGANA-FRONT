import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/** Tamaño del ícono de cada fila: acompaña al texto, no compite con él. */
export const MENU_ICON_SIZE = 22;

/** Barrita de agarre de arriba. Señal visual de "esto es un panel deslizable". */
const HANDLE_WIDTH = 40;
const HANDLE_HEIGHT = 4;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /** Capa que cubre toda la app, tab bar incluida. */
    overlay: StyleSheet.absoluteFill,

    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
    },

    /**
     * Anclado a los cuatro lados menos arriba (el `top` se calcula en runtime
     * con el safe area): es un panel VERTICAL, de alto casi completo, que se
     * desplaza por el eje Y. El `translateY` de la entrada se calcula contra ese
     * alto real, medido en el layout.
     */
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface,
      // Solo las esquinas de arriba: las de abajo se van fuera de pantalla.
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      paddingTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      // Sombra hacia arriba para despegarlo del contenido que tapa.
      elevation: 12,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: -4 },
    },

    handle: {
      alignSelf: 'center',
      width: HANDLE_WIDTH,
      height: HANDLE_HEIGHT,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },

    header: {
      gap: theme.spacing.xxs,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },

    item: {
      // Mínimo táctil de las filas que navegan. Las que todavía no tienen
      // pantalla miden lo mismo para que el panel no cambie de ritmo.
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    /**
     * Caja de ancho fijo para el ícono, sin fondo: es solo el riel que alinea
     * todos los textos entre sí (los dibujos de lucide no miden todos igual).
     * El color va en el trazo del ícono, no en una caja detrás.
     */
    itemIcon: {
      width: MENU_ICON_SIZE,
      alignItems: 'center',
    },
    /**
     * `flex: 1` para que el texto ocupe lo que sobra y pueda cortarse con
     * puntos suspensivos en vez de empujar la fila.
     */
    itemText: { flex: 1 },
    /** La última fila no lleva divisor: quedaría un borde suelto contra el aire. */
    lastItem: { borderBottomWidth: 0 },
    /** Feedback del toque en las filas que navegan. */
    itemPressed: { opacity: 0.6 },
  });
