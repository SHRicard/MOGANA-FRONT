import { forwardRef, memo, useMemo } from 'react';
import { View, type TextInput } from 'react-native';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme } from '@/theme';
import { createStyles } from './InputField.styles';
import type { InputFieldProps } from './InputField.types';

/**
 * Etiqueta + Input + mensaje de error/ayuda.
 *
 * Vive en `atoms` porque lo usa (o lo va a usar) cualquier feature con
 * formularios, no porque sea "atómico" en el sentido estricto: en esta
 * arquitectura `atoms` = la pieza compartida por toda la app.
 *
 * Sin lógica de negocio: recibe el error ya calculado por props.
 */
const InputFieldComponent = forwardRef<TextInput, InputFieldProps>(function InputField(
  { label, error, helperText, ...inputProps },
  ref,
) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      {/* Etiqueta atenuada: el protagonista es el valor que escribe la persona,
          no el rótulo. En negro pleno los labels compiten con el contenido. */}
      <Text variant="small" weight="medium" color="textMuted">
        {label}
      </Text>

      <Input
        ref={ref}
        hasError={hasError}
        accessibilityLabel={label}
        // El error no se comunica solo con el color del borde: también va como texto.
        accessibilityHint={error ?? helperText}
        {...inputProps}
      />

      {hasError ? (
        <Text variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color="textMuted">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});

export const InputField = memo(InputFieldComponent);
