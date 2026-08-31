import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@/shared/ui/atoms/Text';
import { tituloDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';

const ICON_SIZE = 18;
/** Área táctil de cada flecha. */
const FLECHA = 44;

export interface RangoDeMesesProps {
  /** El período que se está mirando, **ya resuelto** por la API. */
  desde: string;
  hasta: string;
  /** Cuántos meses entran. Es lo que dice si el rango tiene sentido. */
  meses: number;
  onCorrerDesde: (cantidad: number) => void;
  onCorrerHasta: (cantidad: number) => void;
  /** Volver a todo el historial. Se apaga cuando ya se está mirando todo. */
  onVerTodo: () => void;
  hayFiltro: boolean;
}

/**
 * De qué mes a qué mes se está mirando.
 *
 * **Acotar el período es el uso menos obvio y el más interesante** de la métrica
 * global: con el mismo endpoint, pedir el verano y pedir el año dan dos rankings
 * distintos, y ese cambio de puesto *es* el dato — en verano el negocio es otro.
 *
 * Los extremos arrancan en el período **efectivo** que devolvió la API —el mes
 * de la primera venta y hoy—, así que el primer toque acota el rango real en vez
 * de saltar a un mes cualquiera.
 */
function RangoDeMesesComponent({
  desde,
  hasta,
  meses,
  onCorrerDesde,
  onCorrerHasta,
  onVerTodo,
  hayFiltro,
}: RangoDeMesesProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.campo}>
      <View style={styles.encabezado}>
        <Text variant="small" weight="medium">
          Período
        </Text>
        <Text variant="micro" color="textMuted">
          {meses === 1 ? '1 mes' : `${meses} meses`}
        </Text>
      </View>

      <View style={styles.extremos}>
        <Extremo
          etiqueta="Desde"
          mes={desde}
          onCorrer={onCorrerDesde}
          styles={styles}
          color={theme.colors.text}
        />
        <Extremo
          etiqueta="Hasta"
          mes={hasta}
          onCorrer={onCorrerHasta}
          styles={styles}
          color={theme.colors.text}
        />
      </View>

      {/* Solo cuando hay algo que soltar: un botón que no hace nada es ruido. */}
      {hayFiltro && (
        <Pressable
          onPress={onVerTodo}
          hitSlop={theme.spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="Ver todo el período"
        >
          <Text variant="caption" color="primary" weight="medium">
            Ver todo el período
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface ExtremoProps {
  etiqueta: string;
  mes: string;
  onCorrer: (cantidad: number) => void;
  styles: Estilos;
  color: string;
}

/** Un extremo del rango: ‹ Agosto 2026 ›. */
function Extremo({ etiqueta, mes, onCorrer, styles, color }: ExtremoProps) {
  return (
    <View style={styles.extremo}>
      <Text variant="micro" color="textMuted">
        {etiqueta}
      </Text>

      <View style={styles.control}>
        <Pressable
          onPress={() => onCorrer(-1)}
          style={({ pressed }) => [styles.flecha, pressed && styles.presionada]}
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta}: un mes antes`}
        >
          <ChevronLeft size={ICON_SIZE} color={color} />
        </Pressable>

        <View style={styles.titulo}>
          <Text variant="caption" weight="medium" align="center" numberOfLines={1}>
            {tituloDeMesApi(mes)}
          </Text>
        </View>

        <Pressable
          onPress={() => onCorrer(1)}
          style={({ pressed }) => [styles.flecha, pressed && styles.presionada]}
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta}: un mes después`}
        >
          <ChevronRight size={ICON_SIZE} color={color} />
        </Pressable>
      </View>
    </View>
  );
}

type Estilos = ReturnType<typeof createStyles>;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    campo: { gap: theme.spacing.xs },
    encabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    extremos: { flexDirection: 'row', gap: theme.spacing.sm },
    extremo: { flex: 1, gap: theme.spacing.xxs },

    control: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
    },
    flecha: {
      width: FLECHA,
      height: FLECHA,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presionada: { opacity: 0.6 },
    titulo: { flex: 1 },
  });

export const RangoDeMeses = memo(RangoDeMesesComponent);
