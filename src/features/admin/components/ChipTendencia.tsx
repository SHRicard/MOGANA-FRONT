import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import ArrowDownRight from 'lucide-react-native/icons/arrow-down-right';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import Minus from 'lucide-react-native/icons/minus';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Square from 'lucide-react-native/icons/square';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import { aTendencia, TENDENCIA_LABEL, Tendencias, type Tendencia } from '../types';

const ICON_SIZE = 12;

export interface ChipTendenciaProps {
  /** El valor crudo de la API: `nueva`, `sube`, `estable`, `baja` o `parada`. */
  tendencia: string;
}

/** El color de cada chip. `parada` es la única que grita. */
const TONO: Record<Tendencia, keyof ThemeColors> = {
  [Tendencias.NUEVA]: 'primary',
  [Tendencias.SUBE]: 'success',
  [Tendencias.ESTABLE]: 'textMuted',
  [Tendencias.BAJA]: 'statusSoon',
  [Tendencias.PARADA]: 'statusLate',
};

/** Y su dibujo. La parada lleva un cuadrado: no es una flecha, es un freno. */
const ICONO: Record<Tendencia, typeof Minus> = {
  [Tendencias.NUEVA]: Sparkles,
  [Tendencias.SUBE]: ArrowUpRight,
  [Tendencias.ESTABLE]: Minus,
  [Tendencias.BAJA]: ArrowDownRight,
  [Tendencias.PARADA]: Square,
};

/**
 * Qué le está pasando a una especie: **el chip que se lee sin números**.
 *
 * ⚠️ `parada` **no es una caída grande**: es que este período no se vendió
 * ninguna. Viene con `-100 %` de variación, y mostrarlo como "bajó un 100 %"
 * cuenta otra historia — por eso tiene chip propio y no una flecha más.
 *
 * Una tendencia que esta versión no conoce **no se dibuja**: los números que
 * están al lado dicen lo mismo, y un chip inventado no.
 */
function ChipTendenciaComponent({ tendencia }: ChipTendenciaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const conocida = aTendencia(tendencia);
  if (conocida === null) {
    return null;
  }

  const Icono = ICONO[conocida];
  const color = theme.colors[TONO[conocida]];

  return (
    <View style={styles.chip} accessible accessibilityLabel={TENDENCIA_LABEL[conocida]}>
      <Icono size={ICON_SIZE} color={color} />
      <Text variant="micro" weight="medium" color={TONO[conocida]}>
        {TENDENCIA_LABEL[conocida]}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xxs,
      // No mide más que su texto: va al final de un renglón, no como título.
      alignSelf: 'flex-start',
    },
  });

export const ChipTendencia = memo(ChipTendenciaComponent);
