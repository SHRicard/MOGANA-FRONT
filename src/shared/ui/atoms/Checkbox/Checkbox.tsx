import { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Minus from 'lucide-react-native/icons/minus';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme } from '@/theme';
import { CAJA, createStyles } from './Checkbox.styles';
import type { CheckboxProps } from './Checkbox.types';

/** El tilde ocupa casi toda la caja: si es chico se lee como un punto. */
const ICON_SIZE = CAJA - 6;

/**
 * Casilla de selección.
 *
 * Nació para el listado del store de comprobantes —marcar varios y borrarlos
 * juntos— y va en `atoms` y no en la feature porque es **transversal y agnóstica
 * del dominio**: no sabe qué se está tildando.
 *
 * Tres cosas que la hacen usable y que es fácil olvidarse:
 *
 * - **el estado no es solo color**: tildada se rellena y aparece el tilde, así
 *   que se distingue en escala de grises;
 * - **`indeterminado`** para el "seleccionar todo" a medias. Sin eso, "ninguno"
 *   y "algunos" se ven igual;
 * - **el área táctil llega a 44** con `hitSlop`, aunque el cuadrito mida 22:
 *   una casilla de 22 en una lista es imposible de tocar sin equivocarse.
 */
function CheckboxComponent({
  checked,
  onChange,
  label,
  disabled = false,
  accessibilityLabel,
  testID,
}: CheckboxProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const marcada = checked === true;
  const aMedias = checked === 'indeterminado';

  // Desde `indeterminado` se va a `true`: "algunos tildados" + un toque tiene
  // que ser "todos", que es lo que se está por pedir.
  const alternar = useCallback(() => onChange(!marcada), [onChange, marcada]);

  return (
    <Pressable
      onPress={alternar}
      disabled={disabled}
      // El cuadrito mide 22 pero se toca como 44: sin esto, tildar una fila de
      // una lista es un ejercicio de puntería.
      hitSlop={theme.spacing.md}
      testID={testID}
      accessible
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: aMedias ? 'mixed' : marcada, disabled }}
      style={({ pressed }) => [
        styles.fila,
        disabled && styles.deshabilitada,
        pressed && !disabled && styles.presionada,
      ]}
    >
      <View style={[styles.caja, (marcada || aMedias) && styles.marcada]}>
        {marcada ? (
          <Check size={ICON_SIZE} color={theme.colors.onPrimary} />
        ) : aMedias ? (
          // Una raya y no un tilde: dice "algunos", que es otra cosa que "todos".
          <Minus size={ICON_SIZE} color={theme.colors.onPrimary} />
        ) : null}
      </View>

      {label ? (
        <View style={styles.label}>
          <Text variant="small">{label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export const Checkbox = memo(CheckboxComponent);
