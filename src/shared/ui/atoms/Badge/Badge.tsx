import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme } from '@/theme';
import type { TextColor } from '@/shared/ui/atoms/Text';
import { createStyles } from './Badge.styles';
import type { BadgeProps, BadgeTone } from './Badge.types';

/** Qué token de texto contrasta con cada fondo. */
const LABEL_COLOR: Record<BadgeTone, TextColor> = {
  error: 'onError',
  primary: 'onPrimary',
};

/**
 * Contador chico que se monta sobre otro elemento (un ícono de la tab bar, un
 * avatar). No se posiciona solo: el que lo usa decide dónde va.
 */
function BadgeComponent({
  count,
  max = 99,
  dot = false,
  tone = 'error',
  accessibilityLabel,
}: BadgeProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (dot) {
    return (
      <View
        style={[styles.base, styles.dot, styles[tone]]}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  // Un badge en cero no aporta nada: mejor no renderizar el nodo.
  if (!count) {
    return null;
  }

  const value = count > max ? `${max}+` : String(count);

  return (
    <View
      style={[styles.base, styles[tone]]}
      accessible
      // El label describe el contador; el número suelto lo leería sin contexto.
      accessibilityLabel={accessibilityLabel ?? value}
    >
      <Text variant="micro" weight="bold" color={LABEL_COLOR[tone]}>
        {value}
      </Text>
    </View>
  );
}

export const Badge = memo(BadgeComponent);
