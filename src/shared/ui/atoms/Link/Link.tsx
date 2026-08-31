import { memo, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import type { LinkProps } from './Link.types';

/**
 * Link de texto.
 *
 * Existe para no abusar del `Button variant="ghost"`: un ghost ocupa una fila
 * entera y tiene peso de botón, así que compite con la acción principal de la
 * pantalla. Un link es una acción secundaria y se lee como tal.
 *
 * El área táctil se agranda con `hitSlop` sin agrandar la caja visual, para no
 * romper el ritmo del layout.
 */
function LinkComponent({
  label,
  onPress,
  variant = 'small',
  muted = false,
  disabled = false,
  testID,
}: LinkProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      hitSlop={{
        top: theme.spacing.sm,
        bottom: theme.spacing.sm,
        left: theme.spacing.sm,
        right: theme.spacing.sm,
      }}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text variant={variant} weight="medium" color={muted ? 'textMuted' : 'primary'}>
        {label}
      </Text>
    </Pressable>
  );
}

export const Link = memo(LinkComponent);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Sin `alignSelf`: la alineación la decide el contenedor (`alignItems`).
    // Si el atom la impusiera, un `alignItems: 'flex-end'` del padre no tendría
    // efecto, porque alignSelf le gana.
    base: { paddingVertical: theme.spacing.xxs },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.6 },
  });
