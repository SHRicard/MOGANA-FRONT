import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { cuandoVence, ESTADO_DE_MI_FACTURA, type MiFacturaDeLaLista } from '../types';
import { EstadoDeMiFactura } from './EstadoDeMiFactura';

export interface MiFacturaItemProps {
  factura: MiFacturaDeLaLista;
  /** Abrir el detalle, que es donde está el comprobante y el botón de avisar. */
  onPress: (factura: MiFacturaDeLaLista) => void;
}

const ICON_SIZE = 18;

/**
 * Una factura mía en la lista.
 *
 * Muestra **lo que decide si hay que hacer algo con ella**: su número, en qué
 * estado está, cuándo vence y cuánto falta pagar. El total va arriba y apagado
 * porque es el dato de contexto: la pregunta es cuánto se debe hoy, no de cuánto
 * era la factura.
 *
 * El renglón es **liviano**: no trae los productos ni los cobros, sino cuántos
 * tiene y una línea armada por el backend (`detalle`) para reconocer la factura.
 * El detalle completo se pide recién al tocarla.
 *
 * ⚠️ Una **anulada** se muestra apagada y sin saldo: dejó de ser una deuda el
 * día que se dio de baja. Si había plata pagada, lo que aparece es que **la
 * devuelven** — nunca restando de la deuda.
 */
function MiFacturaItemComponent({ factura, onPress }: MiFacturaItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const abrir = useCallback(() => onPress(factura), [onPress, factura]);

  const saldada = factura.saldo <= 0;
  const aDevolver = factura.aReembolsar;

  /**
   * Cuántos renglones tiene, y cuántos cobros si hay: un "0 pagos" es ruido, y
   * que no entró nada ya lo dice el saldo.
   */
  const conteos = useMemo(() => {
    const items = `${factura.items} ${factura.items === 1 ? 'producto' : 'productos'}`;
    if (factura.pagos === 0) {
      return items;
    }
    return `${items} · ${factura.pagos} ${factura.pagos === 1 ? 'pago' : 'pagos'}`;
  }, [factura.items, factura.pagos]);

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [
        styles.card,
        factura.anulada && styles.cardAnulada,
        pressed && styles.presionado,
      ]}
      accessibilityRole="button"
      // Toda la factura en una frase: el lector de pantalla no tiene columnas.
      accessibilityLabel={[
        `Factura ${factura.numero}, ${ESTADO_DE_MI_FACTURA[factura.estado].toLowerCase()}.`,
        factura.anulada
          ? `${formatMonto(factura.total)}. Dada de baja${
              aDevolver > 0 ? `, te devuelven ${formatMonto(aDevolver)}` : ''
            }.`
          : saldada
          ? `Pagada, ${formatMonto(factura.total)}.`
          : `Debés ${formatMonto(factura.saldo)} de ${formatMonto(factura.total)}.`,
        factura.anulada
          ? ''
          : `Vence el ${formatFecha(factura.fechaFin)}, ${cuandoVence(factura.diasParaVencer)}.`,
        factura.detalle ? `${factura.detalle}.` : '',
        `${conteos}.`,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View style={styles.datos}>
        <View style={styles.linea}>
          <View style={styles.encabezado}>
            <Text variant="body" weight="semibold">
              {`#${factura.numero}`}
            </Text>
            <EstadoDeMiFactura estado={factura.estado} />
          </View>

          <Text variant="caption" color="textMuted">
            {formatMonto(factura.total)}
          </Text>
        </View>

        {factura.detalle ? (
          <Text variant="small" numberOfLines={1}>
            {factura.detalle}
          </Text>
        ) : null}

        <View style={styles.linea}>
          <View style={styles.contexto}>
            {/* En una anulada el vencimiento no significa nada: no hay que
                pagarla, así que en su lugar va la fecha en que se emitió. */}
            <Text variant="caption" color="textMuted" numberOfLines={2}>
              {factura.anulada
                ? `Emitida el ${formatFecha(factura.fechaEmision)}`
                : `Vence ${formatFecha(factura.fechaFin)} · ${cuandoVence(factura.diasParaVencer)}`}
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {conteos}
            </Text>
          </View>

          {factura.anulada ? (
            // Lo único que una anulada todavía puede pedir: que te devuelvan lo
            // que habías pagado. Va en verde porque es plata a favor.
            aDevolver > 0 ? (
              <Text variant="small" weight="semibold" color="success">
                {`Te devuelven ${formatMonto(aDevolver)}`}
              </Text>
            ) : null
          ) : (
            <Text variant="small" weight="semibold" color={saldada ? 'textMuted' : 'text'}>
              {saldada ? 'Pagada' : `Debés ${formatMonto(factura.saldo)}`}
            </Text>
          )}
        </View>
      </View>

      {/* Decorativo: que la fila se toca ya lo dice el `accessibilityRole`. */}
      <ChevronRight size={ICON_SIZE} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    /** Apagada: fondo del mismo tono que la pantalla, para que se hunda. */
    cardAnulada: { backgroundColor: theme.colors.background },
    presionado: { opacity: 0.7 },

    /** `flex: 1` para que el chevron quede pegado al borde y no flote. */
    datos: { flex: 1, gap: theme.spacing.xs },
    linea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    /** `flex: 1` para que el contexto se corte él y no empuje el saldo. */
    contexto: { flex: 1, gap: theme.spacing.xxs },
  });

export const MiFacturaItem = memo(MiFacturaItemComponent);
