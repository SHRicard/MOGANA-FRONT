import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme } from '@/theme';
import { createStyles } from './EmptyState.styles';
import type { EmptyStateProps } from './EmptyState.types';

/**
 * Tamaño del ícono que acompaña a un estado vacío. Se exporta para que quien lo
 * arme no invente un número: todos los estados vacíos se ven igual de grandes.
 */
export const EMPTY_STATE_ICON_SIZE = 40;

/**
 * Estado vacío centrado: lista sin resultados, sección todavía sin contenido.
 * Es puro UI — no sabe POR QUÉ está vacío, se lo dicen por props.
 */
function EmptyStateComponent({ icon, title, description, action }: EmptyStateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}

      <Text variant="subtitle" weight="semibold" align="center">
        {title}
      </Text>

      {description ? (
        <Text variant="small" color="textMuted" align="center">
          {description}
        </Text>
      ) : null}

      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export const EmptyState = memo(EmptyStateComponent);
