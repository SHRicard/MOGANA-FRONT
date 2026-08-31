import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import type { MiItem } from '../types';

export interface RenglonDeMiFacturaProps {
  item: MiItem;
}

/**
 * Un renglón de la factura: qué me llevé, cuánto salía la unidad y cuánto sumó.
 *
 * La **especie** va al lado del producto: es la etiqueta con la que se agrupa, y
 * es exactamente la misma de "qué compro" (§10), así que se puede leer una
 * pantalla con la otra sin traducir nada.
 *
 * Los importes se muestran **tal como llegan**: los calculó el backend con
 * decimales exactos, y `cantidad × precioUnitario` rehecho en el teléfono es
 * como termina apareciendo un `$80,17000000000002`.
 */
function RenglonDeMiFacturaComponent({ item }: RenglonDeMiFacturaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={`${item.cantidad} × ${item.producto}, ${
        item.especie.nombre
      }. ${formatMonto(item.precioUnitario)} cada uno, ${formatMonto(item.subtotal)} en total.`}
    >
      <View style={styles.identidad}>
        <Text variant="small" weight="medium" numberOfLines={2}>
          {`${item.cantidad}× ${item.producto}`}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {`${item.especie.nombre} · ${formatMonto(item.precioUnitario)} c/u`}
        </Text>
      </View>

      <Text variant="small" weight="semibold">
        {formatMonto(item.subtotal)}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    /** `flex: 1` para que los importes queden alineados a la derecha. */
    identidad: { flex: 1, gap: theme.spacing.xxs },
  });

export const RenglonDeMiFactura = memo(RenglonDeMiFacturaComponent);
