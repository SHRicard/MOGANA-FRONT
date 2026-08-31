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

export interface ChipDeTendenciaProps {
  /** El valor crudo de la API: `nueva`, `sube`, `estable`, `baja` o `parada`. */
  tendencia: string;
}

/** El color de cada chip. Ninguno grita: acá no se le está reclamando a nadie. */
const TONO: Record<Tendencia, keyof ThemeColors> = {
  [Tendencias.NUEVA]: 'primary',
  [Tendencias.SUBE]: 'success',
  [Tendencias.ESTABLE]: 'textMuted',
  [Tendencias.BAJA]: 'statusSoon',
  [Tendencias.PARADA]: 'textMuted',
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
 * Qué le está pasando a algo que llevo: **el chip que se lee sin números**.
 *
 * Es el mismo dato que mira el panel, contado de otra manera: allá dice "Sube" y
 * acá "Estás llevando más". El panel está juzgando un producto; acá se le está
 * contando a alguien lo suyo.
 *
 * ⚠️ `parada` **no es una caída grande**: es que en este período no llevó
 * ninguna. Viene con `-100 %` de variación, y mostrarlo como "bajó un 100 %"
 * cuenta otra historia — por eso tiene chip propio y no una flecha más.
 *
 * Una tendencia que esta versión no conoce **no se dibuja**: los números que
 * están al lado dicen lo mismo, y un chip inventado no.
 */
function ChipDeTendenciaComponent({ tendencia }: ChipDeTendenciaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const conocida = aTendencia(tendencia);
  if (conocida === null) {
    return null;
  }

  const Icono = ICONO[conocida];

  return (
    <View style={styles.chip} accessible accessibilityLabel={TENDENCIA_LABEL[conocida]}>
      <Icono size={ICON_SIZE} color={theme.colors[TONO[conocida]]} />
      <View style={styles.texto}>
        <Text variant="micro" weight="medium" color={TONO[conocida]} numberOfLines={1}>
          {TENDENCIA_LABEL[conocida]}
        </Text>
      </View>
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
    /**
     * El atom `Text` no acepta `style` —los estilos salen del theme—, así que el
     * que se encoge es este `View`: las frases de este catálogo son largas y sin
     * esto empujarían al ícono fuera de la fila.
     */
    texto: { flexShrink: 1 },
  });

export const ChipDeTendencia = memo(ChipDeTendenciaComponent);
