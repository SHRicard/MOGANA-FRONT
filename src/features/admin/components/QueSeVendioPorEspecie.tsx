import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { textoCantidad, type EspecieDelTicket } from '../types';

export interface QueSeVendioPorEspecieProps {
  /** Hasta diez, de mayor a menor plata. */
  especies: readonly EspecieDelTicket[];
}

/**
 * Lo más vendido del mes **por especie** (`docs/flujo_metricas.md` §4.4).
 *
 * Va **arriba del ranking por producto** y no al revés: este es el único de los
 * dos que se puede leer de un mes a otro. El de productos agrupa por el texto
 * que tipeó el mostrador —"12 Coca 500ml" y "Coca 500" son dos líneas, y el mes
 * que viene pueden ser tres—; este agrupa por la etiqueta del catálogo.
 *
 * Es también el único que trae `clientes`: **cabezas distintas, no facturas**.
 * Una especie que se llevaron ocho personas y otra que se llevó una sola en ocho
 * facturas suman lo mismo y no son lo mismo.
 */
function QueSeVendioPorEspecieComponent({ especies }: QueSeVendioPorEspecieProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text variant="small" weight="semibold">
          Qué se vendió
        </Text>
        <Text variant="caption" color="textMuted">
          Por especie: es lo que se puede comparar con otro mes
        </Text>
      </View>

      {especies.map((especie, indice) => (
        <View
          key={especie.especieId}
          style={[styles.fila, indice > 0 && styles.filaConBorde]}
          accessible
          accessibilityLabel={`${especie.nombre}: ${formatMonto(especie.monto)}. ${textoCantidad(
            especie.cantidad,
          )} en ${especie.facturas === 1 ? '1 factura' : `${especie.facturas} facturas`}, a ${
            especie.clientes === 1 ? '1 cliente' : `${especie.clientes} clientes`
          }.`}
        >
          <View style={styles.nombre}>
            <Text variant="caption" weight="medium" numberOfLines={2}>
              {especie.nombre}
            </Text>
            <Text variant="micro" color="textMuted" numberOfLines={1}>
              {`${textoCantidad(especie.cantidad)} · ${
                especie.clientes === 1 ? '1 cliente' : `${especie.clientes} clientes`
              }`}
            </Text>
          </View>

          <Text variant="body" weight="semibold" numberOfLines={1}>
            {formatMonto(especie.monto)}
          </Text>
        </View>
      ))}
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
    filaConBorde: {
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    /** `flex: 1` para que los importes queden alineados a la derecha. */
    nombre: { flex: 1, gap: theme.spacing.xxs },
  });

export const QueSeVendioPorEspecie = memo(QueSeVendioPorEspecieComponent);
