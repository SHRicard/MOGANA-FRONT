import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  formatParticipacion,
  formatVariacion,
  Tendencias,
  textoDesdeLaUltima,
  type EspecieQueCompro,
} from '../types';
import { ChipDeTendencia } from './ChipDeTendencia';

export interface EspecieQueComproItemProps {
  especie: EspecieQueCompro;
  /** Los días de cada ventana, para poder decir "vs. los 90 anteriores". */
  ventanaDias: number;
}

/**
 * Una cosa que me llevo, con su historia (`docs/user_cliente_flujo.md` §10).
 *
 * `cantidad` y `monto` son **desde siempre**, no de la ventana: es lo que
 * contesta "¿cuánto llevo de esto?". La ventana aparece en la comparación de
 * abajo, que es lo que contesta "¿estoy llevando más o menos que antes?".
 *
 * ⚠️ **`variacionCantidad: null` no es 0 %.** Es que en la ventana anterior no
 * llevó ninguna, así que no hay contra qué comparar: para eso está el chip
 * "Empezaste a llevar esto", y pintar un `0 %` o un `∞` ahí sería un bug.
 *
 * ⚠️ Con `parada` **tampoco se muestra la variación**: llega como `-100 %` y
 * eso se lee como una caída fuerte cuando lo que pasó es que dejó de llevarla.
 *
 * ⚠️ El "hace tanto" es **de esta especie**, no de la última compra: se puede
 * haber comprado ayer y hace ocho meses no llevar gaseosa.
 */
function EspecieQueComproItemComponent({ especie, ventanaDias }: EspecieQueComproItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const parada = especie.tendencia === Tendencias.PARADA;
  const variacion = parada ? null : formatVariacion(especie.variacionCantidad);

  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={[
        `${especie.nombre}:`,
        `${especie.cantidad} unidades por ${formatMonto(especie.monto)},`,
        `el ${formatParticipacion(especie.participacion)} de lo que te facturaron.`,
        `La última vez, ${textoDesdeLaUltima(especie.diasSinComprar).toLowerCase()}.`,
      ].join(' ')}
    >
      <View style={styles.identidad}>
        <Text variant="small" weight="medium" numberOfLines={2}>
          {especie.nombre}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {`${especie.cantidad} u · ${formatParticipacion(
            especie.participacion,
          )} · ${textoDesdeLaUltima(especie.diasSinComprar).toLowerCase()}`}
        </Text>
        <ChipDeTendencia tendencia={especie.tendencia} />
      </View>

      <View style={styles.numeros}>
        <Text variant="small" weight="semibold" numberOfLines={1}>
          {formatMonto(especie.monto)}
        </Text>
        <Text variant="micro" color="textMuted" numberOfLines={1}>
          {`${especie.reciente.cantidad} u en ${ventanaDias} días`}
        </Text>
        {variacion ? (
          <Text
            variant="micro"
            weight="medium"
            color={
              especie.variacionCantidad !== null && especie.variacionCantidad < 0
                ? 'statusSoon'
                : 'success'
            }
            numberOfLines={1}
          >
            {variacion}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    /** `flex: 1` para que los importes queden alineados a la derecha. */
    identidad: { flex: 1, gap: theme.spacing.xxs },
    numeros: { alignItems: 'flex-end', gap: theme.spacing.xxs },
  });

export const EspecieQueComproItem = memo(EspecieQueComproItemComponent);
