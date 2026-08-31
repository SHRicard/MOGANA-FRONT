import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { textoDesdeLaUltima, type MisComprasDelHistorial } from '../types';

export interface ComoVengoComprandoProps {
  historial: MisComprasDelHistorial;
  /** Lo facturado desde siempre: el total del que salen las participaciones. */
  facturado: number;
}

/**
 * Mi ritmo de compra (`docs/user_cliente_flujo.md` §10).
 *
 * ⚠️ **Los `null` de acá no son ceros, y cada uno significa algo distinto**:
 *
 * - `diasEntreCompras: null` → tiene una sola factura. Entre una compra y
 *   ninguna otra no hay intervalo que promediar.
 * - `comprasPorMes: null` → es cliente hace menos de un mes. Tres compras en
 *   cuatro días no son "22 compras por mes".
 *
 * En los dos casos **la fila se oculta**. Mostrar un `0` diría algo falso, y un
 * `—` obliga a adivinar qué significa.
 */
function ComoVengoComprandoComponent({ historial, facturado }: ComoVengoComprandoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text variant="small" weight="semibold">
          Cómo venís comprando
        </Text>
        <Text variant="caption" color="textMuted">
          {`Te facturamos ${formatMonto(facturado)} desde que sos cliente`}
        </Text>
      </View>

      <View style={styles.filas}>
        {historial.ultimaCompra !== null && historial.diasSinComprar !== null && (
          <Fila
            etiqueta="Última compra"
            valor={`${formatFecha(historial.ultimaCompra)} · ${textoDesdeLaUltima(
              historial.diasSinComprar,
            ).toLowerCase()}`}
          />
        )}

        {historial.primeraCompra !== null && (
          <Fila etiqueta="Cliente desde" valor={formatFecha(historial.primeraCompra)} />
        )}

        {/* Se oculta con una sola factura: no hay intervalo que promediar. */}
        {historial.diasEntreCompras !== null && (
          <Fila
            etiqueta="Comprás cada"
            valor={`${historial.diasEntreCompras} ${
              historial.diasEntreCompras === 1 ? 'día' : 'días'
            }`}
          />
        )}

        {/* Se oculta con menos de un mes de historia: tres compras en cuatro
            días no son "22 compras por mes". */}
        {historial.comprasPorMes !== null && (
          <Fila
            etiqueta="Compras por mes"
            valor={historial.comprasPorMes.toFixed(1).replace('.', ',')}
          />
        )}
      </View>
    </View>
  );
}

interface FilaProps {
  etiqueta: string;
  /** Texto ya armado: es lo que se lee y lo que va al lector de pantalla. */
  valor: string;
}

/** Una fila del ritmo: etiqueta a la izquierda, valor a la derecha. */
function Fila({ etiqueta, valor }: FilaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.fila} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Text variant="small" color="textMuted">
        {etiqueta}
      </Text>
      <Text variant="small" weight="medium">
        {valor}
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
    filas: { gap: theme.spacing.xs },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
  });

export const ComoVengoComprando = memo(ComoVengoComprandoComponent);
