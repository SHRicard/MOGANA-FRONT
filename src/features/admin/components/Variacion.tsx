import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Minus from 'lucide-react-native/icons/minus';
import TrendingDown from 'lucide-react-native/icons/trending-down';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import {
  DireccionesVariacion,
  direccionVariacion,
  FormatosVariacion,
  magnitudVariacion,
  textoVariacion,
  type DireccionVariacion,
  type FormatoVariacion,
} from '../types';

const ICON_SIZE = 14;

export interface VariacionProps {
  /**
   * Cuánto cambió. **`null` no es `0`**: es que no hay con qué comparar —el mes
   * anterior fue cero— y de cero a un millón no es "un 100 % más".
   */
  valor: number | null;
  /** En qué unidad se lee: un porcentaje contra el mes anterior, o plata. */
  formato?: FormatoVariacion;
  /**
   * Qué dirección es la buena. En la facturación y la cobranza, **subir**; en la
   * deuda, **bajar**. Sin esto, una deuda que creció se pintaría de verde.
   */
  mejorSi?: typeof DireccionesVariacion.SUBE | typeof DireccionesVariacion.BAJA;
}

/**
 * Un delta: la flecha, cuánto cambió y el color que dice si eso es bueno.
 *
 * Va **al lado de un total, nunca en su lugar**: es lo que el doc pide para la
 * variación de la deuda —"pintalo como un delta con flecha, no como un total"— y
 * lo mismo vale para la comparación contra el mes anterior.
 *
 * La flecha sola no dice nada en un lector de pantalla, así que el componente se
 * lee en palabras ("39,6 % menos"). Adentro de una tarjeta que ya se lee como
 * una frase entera, el texto va en la prop de esa tarjeta y esto queda
 * decorativo.
 */
function VariacionComponent({
  valor,
  formato = FormatosVariacion.PORCENTAJE,
  mejorSi = DireccionesVariacion.SUBE,
}: VariacionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const direccion = direccionVariacion(valor);
  const tono = tonoDe(direccion, mejorSi);
  const Icono = ICONOS[direccion];

  return (
    <View style={styles.linea} accessible accessibilityLabel={textoVariacion(valor, formato)}>
      {/* Sin dato no hay flecha: no hubo movimiento que señalar. */}
      {Icono && <Icono size={ICON_SIZE} color={theme.colors[tono]} />}
      <Text variant="micro" weight="medium" color={tono} numberOfLines={1}>
        {direccion === DireccionesVariacion.SIN_DATO
          ? 'Sin comparación'
          : magnitudVariacion(valor, formato)}
      </Text>
    </View>
  );
}

/** La flecha de cada dirección. Sin comparación no lleva ninguna. */
const ICONOS: Record<DireccionVariacion, typeof Minus | null> = {
  [DireccionesVariacion.SUBE]: TrendingUp,
  [DireccionesVariacion.BAJA]: TrendingDown,
  [DireccionesVariacion.IGUAL]: Minus,
  [DireccionesVariacion.SIN_DATO]: null,
};

/**
 * Verde si fue para donde conviene, rojo si fue para el otro lado.
 *
 * Quedarse igual y no tener con qué comparar van en gris: ninguno de los dos es
 * una noticia, y pintarlos de color haría que toda la pantalla grite.
 */
function tonoDe(
  direccion: DireccionVariacion,
  mejorSi: VariacionProps['mejorSi'],
): keyof ThemeColors {
  if (direccion === DireccionesVariacion.IGUAL || direccion === DireccionesVariacion.SIN_DATO) {
    return 'textMuted';
  }
  return direccion === mejorSi ? 'success' : 'error';
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    linea: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs },
  });

export const Variacion = memo(VariacionComponent);
