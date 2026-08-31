import { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { createStyles } from './Button.styles';
import type { ButtonProps } from './Button.types';

function ButtonComponent({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  fullWidth = false,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isDisabled = disabled || loading;
  // El spinner va del color del texto de cada variante: en las rellenas, el que
  // contrasta con el fondo; en las que no lo son, el de marca.
  const spinnerColor =
    variant === 'primary'
      ? theme.colors.onPrimary
      : variant === 'danger'
        ? theme.colors.onError
        : theme.colors.primary;
  const esChico = size === 'sm';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      // El botón chico se DIBUJA chico pero se TOCA grande: sin esto, una
      // acción de 36 de alto queda abajo del mínimo táctil accesible.
      hitSlop={esChico ? theme.spacing.sm : undefined}
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        esChico && styles.sm,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text style={[styles.label, esChico && styles.smLabel, styles[`${variant}Label`]]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export const Button = memo(ButtonComponent);
