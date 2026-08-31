/**
 * Capa 1 — Tokens PRIMITIVOS.
 * La paleta cruda, nombrada por lo que ES (no por para qué se usa).
 *
 * ❌ Los componentes NUNCA importan de acá. Usan solo los tokens semánticos
 *    (theme.colors.primary, theme.colors.background...) vía useTheme().
 */
export const palette = {
  // Marca
  blue100: '#E3ECFB',
  blue300: '#7FA5EA',
  blue500: '#2D6CDF',
  blue600: '#1F4FB0',
  blue700: '#173B84',

  // Neutrales
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F2F2F2',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray500: '#8A8A8A',
  gray600: '#6B6B6B',
  gray700: '#3F3F3F',
  gray800: '#2A2A2A',
  gray900: '#1F1F1F',
  black: '#121212',

  // Estados.
  // Cada color de estado tiene la misma tríada que la marca: un tono suave
  // (100) para fondos en tema claro, el pleno (300/500) para el trazo, y uno
  // profundo (700) para fondos en tema oscuro.
  red100: '#FBE5E5',
  red300: '#F08A89',
  red500: '#E24B4A',
  /**
   * Rojo profundo para el tema CLARO. Es el `red500` bajado hasta que el blanco
   * encima llega a 5.5:1 —el `red500` daba 3.9:1, abajo del mínimo AA— y de paso
   * el texto de error se lee mejor sobre el fondo claro (3.8:1 → 5.3:1).
   */
  red600: '#C42F2D',
  red700: '#5E2323',
  green100: '#E3F4E7',
  green300: '#6FCB80',
  green500: '#2EA043',
  green700: '#1C4A28',
  amber100: '#FAF0DA',
  amber300: '#EBC15F',
  amber500: '#D99A0B',
  amber700: '#5C4208',

  // Escala de urgencia de los badges de estado. Son colores PLENOS y saturados
  // —tienen que separarse de un vistazo en una lista— y siempre llevan texto
  // oscuro encima, así que no hace falta la tríada suave/pleno/profundo.
  yellow500: '#F2C230',
  orange500: '#F07C1E',
  /** Rojo brillante. Es más vivo que `red500`, que se usa para texto de error. */
  redVivid500: '#F5322F',

  // Transparencias
  blackAlpha50: 'rgba(0, 0, 0, 0.5)',
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',
} as const;
