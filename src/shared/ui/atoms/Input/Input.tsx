import { forwardRef, memo, useCallback, useMemo, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
// Import por ícono, no del barrel: `from 'lucide-react-native'` mete los ~1500
// íconos en el bundle (Metro no hace tree-shaking del barrel).
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import X from 'lucide-react-native/icons/x';
import { useTheme } from '@/theme';
import { createStyles } from './Input.styles';
import type { InputProps } from './Input.types';

// Derivados del propio TextInputProps: RN cambió estos tipos en 0.86
// (NativeSyntheticEvent → FocusEvent/BlurEvent) y así no se rompe en upgrades.
type InputFocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type InputBlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

const InputComponent = forwardRef<TextInput, InputProps>(function Input(
  {
    hasError = false,
    toggleSecureEntry = false,
    secureTextEntry = false,
    editable = true,
    leftIcon,
    onClear,
    value,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(false);

  const handleFocus = useCallback(
    (event: InputFocusEvent) => {
      setIsFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (event: InputBlurEvent) => {
      setIsFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const toggleVisibility = useCallback(() => setIsSecureVisible((visible) => !visible), []);

  const showToggle = toggleSecureEntry && secureTextEntry;
  const isTextHidden = secureTextEntry && !isSecureVisible;
  const ToggleIcon = isSecureVisible ? EyeOff : Eye;
  // El botón de limpiar solo existe cuando hay algo que limpiar.
  const showClear = onClear !== undefined && editable && !!value;

  return (
    <View
      style={[
        styles.container,
        isFocused && !hasError && styles.focused,
        hasError && styles.error,
        !editable && styles.disabled,
      ]}
    >
      {/* Decorativo: acompaña al placeholder, no lo reemplaza. */}
      {leftIcon}

      <TextInput
        ref={ref}
        style={styles.input}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry={isTextHidden}
        editable={editable}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />

      {showClear && (
        <Pressable
          onPress={onClear}
          style={styles.toggle}
          hitSlop={theme.spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="Borrar lo escrito"
        >
          <X size={18} color={theme.colors.textMuted} />
        </Pressable>
      )}

      {showToggle && (
        <Pressable
          onPress={toggleVisibility}
          style={styles.toggle}
          hitSlop={theme.spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={isSecureVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <ToggleIcon size={20} color={theme.colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
});

export const Input = memo(InputComponent);
