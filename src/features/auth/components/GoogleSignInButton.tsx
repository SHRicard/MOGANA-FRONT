import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { isGoogleSignInEnabled } from '@/config';
import { useTheme, useThemeMode, type Theme, type ThemeMode } from '@/theme';
import { GoogleLogo } from './GoogleLogo';

/**
 * Colores exigidos por las guías de marca de Google para el botón.
 *
 * ⚠️ A propósito NO son tokens del theme: Google define exactamente estos valores
 * y el botón tiene que verse igual en cualquier app. Si los reemplazáramos por
 * `theme.colors.surface`, el botón cambiaría con nuestra identidad y dejaría de
 * cumplir la marca.
 *
 * Lo único que sí seguimos del theme es CUÁL de las dos variantes usar.
 * @see https://developers.google.com/identity/branding-guidelines
 */
const GOOGLE_BRAND = {
  light: {
    background: '#FFFFFF',
    border: '#747775',
    label: '#1F1F1F',
  },
  dark: {
    background: '#131314',
    border: '#8E918F',
    label: '#E3E3E3',
  },
} as const;

interface GoogleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Error del flujo de Google. Se muestra debajo del botón. */
  error?: string | null;
}

/**
 * Botón "Continuar con Google", construido con nuestro design system.
 *
 * Google permite botón propio siempre que se respeten: el logo oficial sin
 * alterar, uno de sus esquemas de color, un alto mínimo de 40pt y uno de sus
 * textos aprobados. Cumplimos las cuatro cosas, y a cambio el botón se integra
 * con el resto de la UI en vez de parecer pegado de otra app.
 *
 * Sin `GOOGLE_WEB_CLIENT_ID`: en DEV se muestra deshabilitado con un aviso; en
 * release se esconde.
 */
export function GoogleSignInButton({
  onPress,
  disabled,
  loading = false,
  error,
}: GoogleSignInButtonProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, mode), [theme, mode]);

  const isMisconfigured = !isGoogleSignInEnabled;

  if (isMisconfigured && !__DEV__) {
    return null;
  }

  const isDisabled = disabled || loading || isMisconfigured;
  const brand = GOOGLE_BRAND[mode];

  return (
    <View style={styles.container}>
      <View style={styles.separator}>
        <View style={styles.line} />
        <Text variant="caption" color="textMuted">
          o continuá con
        </Text>
        <View style={styles.line} />
      </View>

      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Continuar con Google"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [
          styles.button,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={brand.label} />
        ) : (
          <>
            <GoogleLogo size={20} />
            {/*
              RNText crudo y no nuestro atom Text: el color del texto lo manda la
              marca de Google, y el atom solo acepta tokens semánticos nuestros.
            */}
            <RNText style={styles.label}>Continuar con Google</RNText>
          </>
        )}
      </Pressable>

      {/* El `__DEV__` explícito hace que el minificador borre este aviso del build de release. */}
      {__DEV__ && isMisconfigured ? (
        <Text variant="caption" color="warning" align="center">
          ⚠️ Falta GOOGLE_WEB_CLIENT_ID en src/config. Este aviso solo se ve en desarrollo.
        </Text>
      ) : null}

      {error ? (
        <Text variant="caption" color="error" align="center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme, mode: ThemeMode) => {
  const brand = GOOGLE_BRAND[mode];

  return StyleSheet.create({
    container: { gap: theme.spacing.md },
    separator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    line: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },

    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      minHeight: 52, // Google exige 40 mínimo; 52 iguala a nuestro Button y a los inputs
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      backgroundColor: brand.background,
      borderColor: brand.border,
    },
    label: {
      // Tamaño y peso salen del theme; el COLOR lo manda la marca.
      fontSize: theme.typography.small,
      lineHeight: theme.lineHeight.small,
      // Sigue la tipografía elegida en la app, como cualquier otro texto. Las
      // guías de Google piden Roboto para este botón, pero eso ya no se cumple
      // en iOS —ahí la del sistema es San Francisco—, y una sola palabra en otra
      // letra en medio del login se ve como un error. Lo que las guías sí
      // protegen —el logo, los colores, el texto— queda intacto.
      ...theme.fonts.medium,
      color: brand.label,
    },

    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
  });
};
