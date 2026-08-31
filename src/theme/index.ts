/** API pública del theme. Los componentes importan SOLO desde acá. */
export { ThemeProvider, useTheme, useThemeMode, useFont } from './ThemeProvider';
export { lightTheme } from './themes/lightTheme';
export { darkTheme } from './themes/darkTheme';

/**
 * Las tipografías entre las que se puede elegir y cómo se llaman en pantalla.
 * Los archivos y el porqué de cada nombre, en `tokens/fonts.ts`.
 */
export { Fonts, FONT_LABEL } from './tokens';

export type { Theme, ThemeBase, ThemeColors, ThemeMode, ThemeModePreference } from './types';
export type { FontPreference, ThemeFonts } from './tokens';
