import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Text, type TextColor } from '@/shared/ui/atoms/Text';
import { useTheme } from '@/theme';
import { createStyles } from './Chip.styles';
import type { ChipProps, ChipTone } from './Chip.types';

/** Qué token de texto contrasta con el fondo de cada tono. */
const LABEL_COLOR: Record<ChipTone, TextColor> = {
  neutral: 'text',
  brand: 'primary',
  // No es `warning`: ese ámbar sobre su propio muted da 2.16:1 y no se lee.
  warning: 'onWarningMuted',
  danger: 'error',
};

/**
 * Etiqueta corta y redonda. Hace dos papeles según reciba `onPress` o no:
 *
 *  - **informativa** (sin `onPress`): etiqueta un dato de una fila — el rol de
 *    una cuenta.
 *  - **filtro** (con `onPress`): una opción que se prende y se apaga.
 *
 * Nació en el listado de usuarios y subió acá cuando lo necesitó una segunda
 * feature (regla de promoción del `CLAUDE.md`). Sin lógica de negocio: recibe
 * todo por props.
 */
function ChipComponent({
  label,
  tone = 'neutral',
  onPress,
  selected = false,
  accessibilityLabel,
}: ChipProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const contenido = (
    <Text
      variant="caption"
      weight="medium"
      color={selected ? 'onPrimary' : LABEL_COLOR[tone]}
      numberOfLines={1}
    >
      {label}
    </Text>
  );

  if (!onPress) {
    // Informativo: es texto, no un control. Sin `accessibilityRole` de botón,
    // que le prometería al lector de pantalla una acción que no existe.
    return <View style={[styles.base, styles[tone]]}>{contenido}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      // Llega al mínimo táctil de 44 sin que el chip mida 44 de alto.
      hitSlop={theme.spacing.sm}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        styles.tocable,
        styles[tone],
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {contenido}
    </Pressable>
  );
}

export const Chip = memo(ChipComponent);
