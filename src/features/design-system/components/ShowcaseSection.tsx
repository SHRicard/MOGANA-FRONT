import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

interface ShowcaseSectionProps {
  title: string;
  /** Para qué sirve / cuándo usarlo. */
  description?: string;
  /** Ruta de import, para copiar y pegar. */
  importPath?: string;
  children: ReactNode;
}

/** Bloque de un componente dentro del catálogo: título, para qué es, y demos. */
export function ShowcaseSection({
  title,
  description,
  importPath,
  children,
}: ShowcaseSectionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="title" weight="bold">
          {title}
        </Text>
        {description ? (
          <Text variant="small" color="textMuted">
            {description}
          </Text>
        ) : null}
        {importPath ? (
          <View style={styles.importBox}>
            <Text variant="caption" color="textMuted">
              {importPath}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: { gap: theme.spacing.md },
    header: { gap: theme.spacing.xs },
    importBox: {
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surfaceVariant,
    },
    body: { gap: theme.spacing.lg },
  });
