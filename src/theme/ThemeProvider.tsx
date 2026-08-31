import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { storageService, StorageKeys } from '@/services/storage';
import { buildFonts, Fonts, type FontPreference } from './tokens/fonts';
import { lightTheme } from './themes/lightTheme';
import { darkTheme } from './themes/darkTheme';
import type { Theme, ThemeMode, ThemeModePreference } from './types';

interface ThemeContextValue {
  /** El theme activo. Es lo que devuelve `useTheme()`. */
  theme: Theme;
  /** Tema efectivamente aplicado ('system' ya resuelto). */
  mode: ThemeMode;
  /** Lo que eligió el usuario: 'light' | 'dark' | 'system'. */
  preference: ThemeModePreference;
  /** Cambia la preferencia y la persiste. */
  setPreference: (preference: ThemeModePreference) => void;
  /** Alterna entre claro y oscuro (fija la preferencia, sale de 'system'). */
  toggleMode: () => void;
  /** La tipografía elegida: la del sistema o una propia. */
  font: FontPreference;
  /** Cambia la tipografía y la persiste. */
  setFont: (font: FontPreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const VALID_PREFERENCES: readonly ThemeModePreference[] = ['light', 'dark', 'system'];

function isThemePreference(value: string | null): value is ThemeModePreference {
  return value !== null && (VALID_PREFERENCES as readonly string[]).includes(value);
}

/** Lee la preferencia persistida. MMKV es síncrono → no hay flash de tema al arrancar. */
function readStoredPreference(): ThemeModePreference {
  const stored = storageService.getString(StorageKeys.THEME_MODE);
  return isThemePreference(stored) ? stored : 'system';
}

const VALID_FONTS: readonly FontPreference[] = Object.values(Fonts);

function isFontPreference(value: string | null): value is FontPreference {
  return value !== null && (VALID_FONTS as readonly string[]).includes(value);
}

/**
 * La tipografía guardada. Mismo criterio que el tema: se lee síncrono, así el
 * primer frame ya sale con la fuente elegida y el texto no salta de una a otra.
 *
 * Sin nada guardado arranca en **Inter**, que es la tipografía de la app; la del
 * sistema queda como la alternativa para quien la prefiera. Arrancar en Inter no
 * es riesgoso: si el `.ttf` no estuviera compilado —alguien lo sacó del
 * proyecto—, el sistema pone la suya igual y la app se ve como antes.
 */
function readStoredFont(): FontPreference {
  const stored = storageService.getString(StorageKeys.FONT_FAMILY);
  return isFontPreference(stored) ? stored : Fonts.INTER;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreferenceState] = useState<ThemeModePreference>(readStoredPreference);
  const [font, setFontState] = useState<FontPreference>(readStoredFont);

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const setPreference = useCallback((next: ThemeModePreference) => {
    setPreferenceState(next);
    storageService.setString(StorageKeys.THEME_MODE, next);
  }, []);

  const setFont = useCallback((next: FontPreference) => {
    setFontState(next);
    storageService.setString(StorageKeys.FONT_FAMILY, next);
  }, []);

  const toggleMode = useCallback(() => {
    setPreferenceState((current) => {
      const resolved: ThemeMode =
        current === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : current;
      const next: ThemeModePreference = resolved === 'dark' ? 'light' : 'dark';
      storageService.setString(StorageKeys.THEME_MODE, next);
      return next;
    });
  }, [systemScheme]);

  // Los cuatro fragmentos de peso de la fuente activa. Se rearman solo cuando
  // cambia la tipografía, no en cada render del árbol.
  const fonts = useMemo(() => buildFonts(font), [font]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      // Acá se juntan las dos elecciones: el tema decide los colores y la
      // tipografía las fuentes. Son independientes a propósito — cambiar de
      // claro a oscuro no tiene por qué tocar la letra.
      theme: { ...(mode === 'dark' ? darkTheme : lightTheme), fonts },
      mode,
      preference,
      setPreference,
      toggleMode,
      font,
      setFont,
    }),
    [mode, preference, setPreference, toggleMode, fonts, font, setFont],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(hookName: string): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(`${hookName} debe usarse dentro de <ThemeProvider>`);
  }
  return ctx;
}

/**
 * Única puerta de acceso al theme desde los componentes.
 * ❌ Nunca importes lightTheme/darkTheme ni los primitivos directo en un componente.
 */
export function useTheme(): Theme {
  return useThemeContext('useTheme').theme;
}

/** Para pantallas de ajustes: leer y cambiar el modo de tema. */
export function useThemeMode() {
  const { mode, preference, setPreference, toggleMode } = useThemeContext('useThemeMode');
  return { mode, preference, setPreference, toggleMode };
}

/**
 * Para pantallas de ajustes: leer y cambiar la tipografía.
 *
 * Va aparte de `useThemeMode` para que una pantalla que solo alterna claro y
 * oscuro no se vuelva a renderizar cuando alguien cambia la letra.
 */
export function useFont() {
  const { font, setFont } = useThemeContext('useFont');
  return { font, setFont };
}
