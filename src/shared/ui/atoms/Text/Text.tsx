import { memo, useMemo } from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '@/theme';
import type { TextProps } from './Text.types';

/**
 * Atom tipográfico. Es la única forma de escribir texto en la app:
 * garantiza que tamaño, interlineado, peso y color salgan siempre del theme.
 */
function TextComponent({
  children,
  variant = 'body',
  color = 'text',
  weight = 'regular',
  align,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const style = useMemo(
    () => ({
      fontSize: theme.typography[variant],
      lineHeight: theme.lineHeight[variant],
      color: theme.colors[color],
      textAlign: align,
      // El peso llega spreado y no como `fontWeight` suelto: con la fuente del
      // sistema es un `fontWeight`, pero con una fuente propia es un
      // `fontFamily` (un archivo por peso). Lo resuelve el theme, no acá.
      ...theme.fonts[weight],
    }),
    [theme, variant, weight, color, align],
  );

  return (
    <RNText style={style} {...rest}>
      {children}
    </RNText>
  );
}

export const Text = memo(TextComponent);
