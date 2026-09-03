import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

export interface TarjetaProps {
  titulo: string;
  /** En una línea, qué está midiendo esta tarjeta. */
  bajada?: string;
  children: ReactNode;
}

/**
 * El marco de cada bloque del tablero del sistema.
 *
 * Existe para que las cinco tarjetas se vean iguales sin repetir el mismo
 * `StyleSheet` cinco veces: lo único que cambia entre ellas es lo que va adentro.
 */
function TarjetaComponent({ titulo, bajada, children }: TarjetaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text variant="body" weight="semibold" accessibilityRole="header">
          {titulo}
        </Text>
        {bajada ? (
          <Text variant="caption" color="textMuted">
            {bajada}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tarjeta: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    encabezado: { gap: theme.spacing.xxs },
  });

export const Tarjeta = memo(TarjetaComponent);
