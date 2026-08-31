import { palette } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography, lineHeight, fontWeight } from '../tokens/typography';
import { radius } from '../tokens/radius';
import type { ThemeBase } from '../types';

/**
 * Capa 2 — Tokens SEMÁNTICOS, tema oscuro.
 * MISMA forma que `lightTheme`: lo único que cambia es a qué primitivo apunta
 * cada semántico. Por eso el modo oscuro no requiere tocar ningún componente.
 */
export const darkTheme: ThemeBase = {
  colors: {
    primary: palette.blue300,
    primaryMuted: palette.blue700,
    onPrimary: palette.gray900,

    background: palette.black,
    surface: palette.gray900,
    surfaceVariant: palette.gray800,
    border: palette.gray700,

    text: palette.gray50,
    textMuted: palette.gray500,
    textInverse: palette.gray900,

    error: palette.red300,
    errorMuted: palette.red700,
    onError: palette.gray900,
    success: palette.green300,
    successMuted: palette.green700,
    warning: palette.amber300,
    warningMuted: palette.amber700,
    onWarningMuted: palette.amber300,

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
