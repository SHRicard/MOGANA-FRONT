import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

interface ShowcaseItemProps {
  /** Qué variante/estado se está mostrando. */
  label: string;
  children: ReactNode;
  /** Pone las demos en fila (para piezas chicas que entran juntas). */
  row?: boolean;
}

/** Una variante concreta de un componente, con su etiqueta. */
export function ShowcaseItem({ label, children, row = false }: ShowcaseItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.item}>
      <Text variant="caption" color="textMuted" weight="medium">
        {label}
      </Text>
      <View style={[styles.canvas, row && styles.canvasRow]}>{children}</View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    item: { gap: theme.spacing.sm },
    canvas: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.sm,
    },
    canvasRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
  });
