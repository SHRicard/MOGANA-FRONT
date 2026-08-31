import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { ChipTendencia } from './ChipTendencia';
import { formatTasa, textoDesdeLaUltima, type EspecieDelCliente } from '../types';

export interface QueSeLlevaProps {
  /** De mayor a menor plata, tal como viene. */
  especies: readonly EspecieDelCliente[];
}

/**
 * Qué se lleva este cliente, por especie (`docs/flujo_metricas.md` §3.8).
 *
 * Es la pregunta del mostrador —*"¿qué le vendo a este?"*— y la que **avisa que
 * algo cambió antes de que se note en la deuda**: el que dejó de llevar vestidos
 * y ahora solo lleva arreglos se está yendo, aunque siga pagando todo en fecha.
 *
 * ⚠️ La lista trae también **lo que dejó de llevar**, en cero y con el chip
 * `parada`. Filtrarlo sería quedarse justo sin el dato que la pantalla existe
 * para dar.
 *
 * ⚠️ El "hace tanto" de cada renglón es **de esa especie**, no de su última
 * compra: alguien puede haber comprado ayer y hace ocho meses que no lleva esto.
 */
function QueSeLlevaComponent({ especies }: QueSeLlevaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text variant="small" weight="semibold">
          Qué se lleva
        </Text>
        <Text variant="caption" color="textMuted">
          Sus compras de siempre, por especie
        </Text>
      </View>

      {especies.map((especie, indice) => (
        <View
          key={especie.especieId}
          style={[styles.fila, indice > 0 && styles.filaConBorde]}
          accessible
          accessibilityLabel={[
            `${especie.nombre}:`,
            `${especie.cantidad} unidades por ${formatMonto(especie.monto)},`,
            `el ${formatTasa(especie.participacion)} de lo que se le facturó.`,
            `Se la llevó por última vez ${textoDesdeLaUltima(
              especie.diasSinComprar,
            ).toLowerCase()}.`,
          ].join(' ')}
        >
          <View style={styles.identidad}>
            <Text variant="caption" weight="medium" numberOfLines={2}>
              {especie.nombre}
            </Text>
            <Text variant="micro" color="textMuted" numberOfLines={1}>
              {`${especie.cantidad} u · ${formatTasa(especie.participacion)} · ${textoDesdeLaUltima(
                especie.diasSinComprar,
              ).toLowerCase()}`}
            </Text>
          </View>

          <View style={styles.numeros}>
            <Text variant="small" weight="semibold" numberOfLines={1}>
              {formatMonto(especie.monto)}
            </Text>
            <ChipTendencia tendencia={especie.tendencia} />
          </View>
        </View>
      ))}

      <Text variant="micro" color="textMuted">
        Las que dejó de llevar aparecen igual, en cero: es el aviso más temprano de que algo cambió.
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
    filaConBorde: {
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    /** `flex: 1` para que los importes queden alineados a la derecha. */
    identidad: { flex: 1, gap: theme.spacing.xxs },
    numeros: { alignItems: 'flex-end', gap: theme.spacing.xxs },
  });

export const QueSeLleva = memo(QueSeLlevaComponent);
