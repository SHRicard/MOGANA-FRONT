import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import type { Theme, ThemeMode } from '@/theme';

/**
 * Traduce nuestro theme al formato que espera React Navigation, para que los
 * fondos de las pantallas y los headers nativos sigan el mismo tema.
 */
export function buildNavigationTheme(theme: Theme, mode: ThemeMode): NavigationTheme {
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.error,
    },
  };
}
