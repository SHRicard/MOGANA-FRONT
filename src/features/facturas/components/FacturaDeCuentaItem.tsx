import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { esFacturaAnulada, labelDeEstado, textoVencimiento, type FacturaDeCuenta } from '../types';
import { EstadoBadge } from './EstadoBadge';

export interface FacturaDeCuentaItemProps {
  factura: FacturaDeCuenta;
  /** Abrir el detalle, que es donde se cobra. */
  onPress: (factura: FacturaDeCuenta) => void;
}

const ICON_SIZE = 18;

/**
 * Una factura dentro de la cuenta del cliente.
 *
 * Muestra **lo que decide si hay que hacer algo con ella**: su número, en qué
 * estado está, cuándo vence y —lo que más importa— cuánto falta cobrarle. El
 * total va arriba, apagado, porque es el dato de contexto: la pregunta del
 * mostrador es cuánto se le debe hoy, no de cuánto era la factura.
 *
 * El renglón es **liviano**: no trae los productos ni los cobros, sino cuántos
 * tiene y una línea armada por el backend (`detalle`) para reconocer la factura.
 * El detalle completo se pide recién al tocarla — sobre mil facturas, mandarlas
 * enteras para pintar una lista es lo que hace que la pantalla no abra.
 */
function FacturaDeCuentaItemComponent({ factura, onPress }: FacturaDeCuentaItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const abrir = useCallback(() => onPress(factura), [onPress, factura]);

  const saldada = factura.saldo <= 0;
  const vencimiento = textoVencimiento(factura.estado, factura.diasParaVencer);
  /**
   * Una anulada se muestra **apagada**: no se cobra, no vence y no cuenta para
   * la deuda, así que no tiene que competir con las que sí hay que atender. Se
   * muestra igual —no se borra— y con su motivo al lado, que es lo que explica
   * el número que falta en la numeración.
   */
  const anulada = esFacturaAnulada(factura);
  /**
   * Lo que hay que devolverle de esta factura: solo pasa en una anulada que ya
   * se había cobrado. Va en el lugar del saldo porque es lo mismo pero al revés
   * —plata que se debe, no que deben— y es lo único que una anulada todavía
   * pide que alguien haga.
   */
  const aDevolver = factura.aReembolsar ?? 0;

  /**
   * Cuántos renglones y cuántos cobros tiene, para el pie de la fila. Los cobros
   * solo si hay: un "0 cobros" es ruido, y que no entró nada ya lo dice el saldo.
   */
  const conteos = useMemo(() => {
    const items = `${factura.items} ${factura.items === 1 ? 'producto' : 'productos'}`;
    if (factura.pagos === 0) {
      return items;
    }
    return `${items} · ${factura.pagos} ${factura.pagos === 1 ? 'cobro' : 'cobros'}`;
  }, [factura.items, factura.pagos]);

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [
        styles.card,
        anulada && styles.cardAnulada,
        pressed && styles.presionado,
      ]}
      accessibilityRole="button"
      // Toda la factura en una frase: el lector de pantalla no tiene columnas.
      accessibilityLabel={[
        `Factura ${factura.numero}, ${labelDeEstado(factura.estado).toLowerCase()}.`,
        anulada
          ? `${formatMonto(factura.total)}. ${factura.motivoAnulacion ?? ''}${
              aDevolver > 0 ? ` Hay que devolver ${formatMonto(aDevolver)}.` : ''
            }`
          : saldada
          ? `Saldada, ${formatMonto(factura.total)}.`
          : `Debe ${formatMonto(factura.saldo)} de ${formatMonto(factura.total)}.`,
        vencimiento ? `${vencimiento}.` : '',
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
            <EstadoBadge estado={factura.estado} />
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
            {/* En una anulada el vencimiento no significa nada: en su lugar va
                el motivo, que es lo que explica por qué está de baja. */}
            <Text variant="caption" color="textMuted" numberOfLines={2}>
              {anulada
                ? factura.motivoAnulacion ?? 'Anulada'
                : `Vence ${formatFecha(factura.fechaFin)}${
                    vencimiento ? ` · ${vencimiento.toLowerCase()}` : ''
                  }`}
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {conteos}
            </Text>
          </View>

          {/* Lo que falta cobrar, que es lo que se busca en esta lista. En una
              anulada no va nada: el saldo es cero porque dejó de contar, y un
              "Saldada" ahí se leería como que se cobró. */}
          {anulada ? (
            // En una anulada no va el saldo —es cero porque dejó de contar, y un
            // "Saldada" ahí se leería como que se cobró—, pero sí lo que haya
            // que devolver.
            aDevolver > 0 ? (
              <Text variant="small" weight="semibold" color="error">
                {`Devolver ${formatMonto(aDevolver)}`}
              </Text>
            ) : null
          ) : (
            <Text variant="small" weight="semibold" color={saldada ? 'textMuted' : 'text'}>
              {saldada ? 'Saldada' : `Debe ${formatMonto(factura.saldo)}`}
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
    encabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    /** `flex: 1` para que el contexto se corte él y no empuje el saldo. */
    contexto: { flex: 1, gap: theme.spacing.xxs },
  });

export const FacturaDeCuentaItem = memo(FacturaDeCuentaItemComponent);
