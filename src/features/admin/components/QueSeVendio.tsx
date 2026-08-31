import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { textoCantidad, type TicketTopProducto } from '../types';

export interface QueSeVendioProps {
  /** Lo más vendido del mes, por plata. Hasta diez. */
  productos: readonly TicketTopProducto[];
}

/**
 * Qué se vendió en el mes, ordenado por plata.
 *
 * El nombre es **el que tipeó el mostrador: no hay catálogo**. El backend agrupa
 * ignorando mayúsculas y espacios de más —"Bidón" y "bidón " son la misma
 * línea— y muestra una de las dos escrituras, así que el texto se pinta tal cual
 * viene: corregirlo acá haría que dos pantallas llamen distinto a lo mismo.
 */
function QueSeVendioComponent({ productos }: QueSeVendioProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text variant="small" weight="semibold">
          El detalle, producto por producto
        </Text>
        <Text variant="caption" color="textMuted">
          Como se escribió al facturar: no se puede comparar entre meses
        </Text>
      </View>

      {productos.map((producto, indice) => (
        <View
          key={producto.producto}
          style={[styles.fila, indice > 0 && styles.filaConBorde]}
          accessible
          accessibilityLabel={`${producto.producto}: ${formatMonto(
            producto.monto,
          )}. ${textoCantidad(producto.cantidad)} en ${
            producto.facturas === 1 ? '1 factura' : `${producto.facturas} facturas`
          }.`}
        >
          <View style={styles.nombre}>
            <Text variant="caption" weight="medium" numberOfLines={2}>
              {producto.producto}
            </Text>
            <Text variant="micro" color="textMuted" numberOfLines={1}>
              {`${textoCantidad(producto.cantidad)} · ${
                producto.facturas === 1 ? '1 factura' : `${producto.facturas} facturas`
              }`}
            </Text>
          </View>

          <Text variant="body" weight="semibold" numberOfLines={1}>
            {formatMonto(producto.monto)}
          </Text>
        </View>
      ))}

      <Text variant="micro" color="textMuted">
        El nombre es el que se escribió al facturar: no hay catálogo.
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tarjeta: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    encabezado: { gap: theme.spacing.xxs },

    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    /** Línea entre renglones, menos arriba del primero. */
    filaConBorde: {
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    /** `flex: 1` para que los importes queden alineados a la derecha. */
    nombre: { flex: 1, gap: theme.spacing.xxs },
  });

export const QueSeVendio = memo(QueSeVendioComponent);
