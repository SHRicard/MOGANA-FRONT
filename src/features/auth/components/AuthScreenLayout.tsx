import { useMemo, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/shared/ui/atoms/Logo';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

interface AuthScreenLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Zona inferior fija: links a las otras pantallas de auth. */
  footer?: ReactNode;
}

/**
 * Marco común de las 3 pantallas de auth: safe area, teclado que no tapa los
 * campos, y encabezado consistente.
 *
 * Vive en la feature (no en `shared/ui`) porque solo lo usa auth.
 * Si otra feature lo necesitara, recién ahí sube a `shared/`.
 */
export function AuthScreenLayout({ title, subtitle, children, footer }: AuthScreenLayoutProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * Logo protagonista, pero responsivo: 72% del ancho de pantalla con tope de
   * 320pt. Un ancho fijo grande se desbordaría en un teléfono chico, y en una
   * tablet quedaría perdido en el medio.
   */
  const logoWidth = Math.min(screenWidth * 0.72, 320);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + theme.spacing.xl,
            paddingBottom: insets.bottom + theme.spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.hero}>
          <Logo width={logoWidth} />

          {/* Centrado para acompañar al logo: con el título a la izquierda y el
              logo al medio, el bloque superior se lee desalineado. */}
          <View style={styles.header}>
            <Text variant="title" weight="bold" align="center">
              {title}
            </Text>
            <Text variant="small" color="textMuted" align="center">
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.body}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    // El centrado es decisión de ESTA pantalla, no del atom: en un header
    // interno el mismo Logo va alineado a la izquierda.
    // Aire generoso entre el logo y el título: son dos bloques distintos (marca
    // vs. contexto de la pantalla) y pegados se leen como uno solo.
    hero: { alignItems: 'center', gap: theme.spacing.xl },
    header: { gap: theme.spacing.xxs },
    body: { gap: theme.spacing.md },
    footer: {
      marginTop: 'auto', // empuja el footer al fondo si sobra pantalla
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  });
