import { palette } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography, lineHeight, fontWeight } from '../tokens/typography';
import { radius } from '../tokens/radius';
import type { ThemeBase } from '../types';

/**
 * Capa 2 — Tokens SEMÁNTICOS, tema claro.
 * Cada semántico apunta a un primitivo. Cambiás la identidad de la app
 * reapuntando acá, sin tocar un solo componente.
 */
export const lightTheme: ThemeBase = {
  colors: {
    primary: palette.blue500,
    primaryMuted: palette.blue100,
    onPrimary: palette.white,

    background: palette.white,
    surface: palette.gray50,
    surfaceVariant: palette.gray100,
    border: palette.gray200,

    text: palette.gray900,
    textMuted: palette.gray600,
    textInverse: palette.white,

    /**
     * El rojo profundo y no el `red500`: es el color del texto de error y el
     * fondo del botón de una acción destructiva, y en los dos casos el 3.9:1 del
     * tono anterior quedaba abajo del mínimo AA sobre blanco.
     */
    error: palette.red600,
    errorMuted: palette.red100,
    onError: palette.white,
    success: palette.green500,
    successMuted: palette.green100,
    warning: palette.amber500,
    warningMuted: palette.amber100,
    onWarningMuted: palette.amber700,

    /**
     * Badges de estado. Los mismos plenos en claro y en oscuro: un badge tiene
     * que ser reconocible por su color, y bajarle la saturación en oscuro haría
     * que "vencida" y "por vencer" se parezcan justo cuando hay que separarlas.
     */
    statusOk: palette.green500,
    statusWait: palette.yellow500,
    statusSoon: palette.orange500,
    statusLate: palette.redVivid500,
    onStatus: palette.black,

    // Mismo valor en ambos temas: debe coincidir con la splash nativa.
    splashBackground: palette.white,

    overlay: palette.blackAlpha50,
    shadow: palette.black,
  },
  spacing,
  typography,
  lineHeight,
  fontWeight,
  radius,
};
