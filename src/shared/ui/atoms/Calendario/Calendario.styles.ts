import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/**
 * Alto de una celda. No sale de la escala de espaciados: es el mínimo con el que
 * una grilla de 7 columnas sigue teniendo celdas cómodas de tocar en un celular
 * angosto (el ancho lo reparte `flexBasis`, y 44 de alto es el mínimo táctil).
 */
const CELDA_ALTO = 44;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    // ── Encabezado ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    flecha: {
      width: CELDA_ALTO,
      height: CELDA_ALTO,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
    flechaApagada: { opacity: 0.3 },

    // ── Grilla ──
    semana: { flexDirection: 'row' },
    /**
     * `flexBasis` en porcentaje y no un ancho fijo: la grilla tiene que repartir
     * el ancho real de la pantalla, que cambia entre un celular chico y una
     * tablet.
     */
    celda: {
      flexBasis: '14.2857%',
      height: CELDA_ALTO,
      alignItems: 'center',
      justifyContent: 'center',
    },
    grilla: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },

    /** El día elegido: círculo lleno, como en cualquier calendario. */
    dia: {
      width: CELDA_ALTO - theme.spacing.xs,
      height: CELDA_ALTO - theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
    elegido: { backgroundColor: theme.colors.primary },
    /**
     * Hoy se marca con el borde y no con relleno: el relleno ya significa
     * "elegido", y dos cosas llenas compiten.
     */
    hoy: { borderWidth: 1, borderColor: theme.colors.primary },
    presionado: { backgroundColor: theme.colors.surfaceVariant },
  });
