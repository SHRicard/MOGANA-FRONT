import { memo, useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { nombreDeEmisor, type Pago } from '../types';

export interface PagoItemProps {
  pago: Pago;
  /**
   * Borrar este cobro. La confirmación la pide el componente.
   *
   * **Sin esto no se dibuja el tacho**: es el caso de una factura anulada, donde
   * los cobros quedan congelados como registro de la plata que hay que devolver.
   */
  onBorrar?: (pagoId: string) => void;
  /** Hay un borrado en vuelo: se bloquean todos los tachos, no solo el tocado. */
  borrando?: boolean;
}

const ICON_SIZE = 18;

/**
 * Un cobro anotado: cuánto entró, cuándo, con qué nota y quién lo cargó.
 *
 * **Se borra, no se edita.** Por eso hay un tacho y no un lápiz: si el importe
 * está mal, se borra el cobro y se vuelve a anotar. Corregirlo en el lugar
 * dejaría sin rastro cuánto se había cargado antes, que es justo lo que un
 * registro de pagos tiene que conservar.
 *
 * En una factura **anulada** no se pasa `onBorrar` y el tacho desaparece: esos
 * cobros quedan congelados porque son el registro de la plata que entró y que
 * hay que devolver.
 */
function PagoItemComponent({ pago, onBorrar, borrando = false }: PagoItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const monto = formatMonto(pago.monto);
  const fecha = formatFecha(pago.fecha);
  const quien = nombreDeEmisor(pago.registradoPor);

  /**
   * Borrar un cobro cambia el saldo de la factura y no se deshace, así que se
   * pregunta antes. El texto dice el importe y el día: en una lista de tres
   * cobros parecidos, "¿borrar este pago?" no alcanza para saber cuál se toca.
   */
  const confirmarBorrado = useCallback(() => {
    if (!onBorrar) {
      return;
    }
    Alert.alert(
      'Borrar el cobro',
      `Se borra el cobro de ${monto} del ${fecha}. La factura vuelve a deber ese importe.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: () => onBorrar(pago.id) },
      ],
    );
  }, [monto, fecha, onBorrar, pago.id]);

  return (
    // Todo el cobro en una frase: el lector de pantalla no tiene columnas.
    <View style={styles.fila}>
      <View
        style={styles.datos}
        accessible
        accessibilityLabel={`${monto} el ${fecha}. ${
          pago.nota ? `${pago.nota}. ` : ''
        }Lo anotó ${quien}.`}
      >
        <Text variant="body" weight="semibold">
          {monto}
        </Text>
        <Text variant="small" color="textMuted">
          {pago.nota ? `${fecha} · ${pago.nota}` : fecha}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {`Lo anotó ${quien}`}
        </Text>
      </View>

      {/* Sin `onBorrar` no hay tacho: los cobros de una anulada no se tocan. */}
      {onBorrar && (
        <Pressable
          onPress={confirmarBorrado}
          disabled={borrando}
          hitSlop={theme.spacing.sm}
          style={({ pressed }) => [
            styles.borrar,
            borrando && styles.borrarDeshabilitado,
            pressed && !borrando && styles.presionado,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Borrar el cobro de ${monto} del ${fecha}`}
          accessibilityState={{ disabled: borrando }}
        >
          <Trash2 size={ICON_SIZE} color={theme.colors.error} />
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    /** `flex: 1` para que el tacho quede pegado al borde y no flote. */
    datos: { flex: 1, gap: theme.spacing.xxs },

    borrar: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
    borrarDeshabilitado: { opacity: 0.4 },
    presionado: { backgroundColor: theme.colors.errorMuted },
  });

export const PagoItem = memo(PagoItemComponent);
