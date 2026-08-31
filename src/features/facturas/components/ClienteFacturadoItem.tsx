import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  clienteSinFiado,
  EstadosCuenta,
  labelDeEstado,
  textoImpagas,
  textoVencimiento,
  type ClienteFacturado,
} from '../types';
import { EstadoBadge } from './EstadoBadge';

export interface ClienteFacturadoItemProps {
  cliente: ClienteFacturado;
  /** Abrir la cuenta de ese cliente. */
  onPress: (cliente: ClienteFacturado) => void;
}

const ICON_SIZE = 18;

/**
 * Un renglón del tablero: **la cuenta de un cliente**, no una factura.
 *
 * Se lee en el orden en que se pregunta en el mostrador: quién, **cuánto debe en
 * total**, qué tan urgente es y desde cuándo. La deuda va arriba a la derecha
 * porque es la columna que se escanea en vertical, y abajo va lo que la explica:
 * cuántas facturas le faltan pagar y cuándo vence la más vieja de esas — no la
 * última que se le emitió, que es lo que antes escondía lo que arrastraba.
 *
 * El clic lleva a la cuenta del cliente, que es donde está el detalle de esa
 * deuda; desde ahí se entra a cada factura a cobrar.
 */
function ClienteFacturadoItemComponent({ cliente, onPress }: ClienteFacturadoItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const abrir = useCallback(() => onPress(cliente), [onPress, cliente]);

  const alDia = cliente.estado === EstadosCuenta.AL_DIA;
  const deuda = formatMonto(cliente.deuda);
  const vencimiento = textoVencimiento(cliente.estado, cliente.diasParaVencer);
  const impagas = textoImpagas(cliente);
  const vence = cliente.vencimientoMasViejo
    ? `Vence ${formatFecha(cliente.vencimientoMasViejo)}`
    : null;

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [styles.card, pressed && styles.presionado]}
      accessibilityRole="button"
      // Todo el renglón en una frase: el lector de pantalla no tiene columnas.
      accessibilityLabel={[
        `${cliente.nombre}.`,
        alDia
          ? 'Al día, no debe nada.'
          : `Debe ${deuda}, ${labelDeEstado(cliente.estado).toLowerCase()}.`,
        clienteSinFiado(cliente) ? 'No se le fía.' : '',
        vencimiento ? `${vencimiento}.` : '',
        `${impagas}.`,
        cliente.dni ? `DNI ${cliente.dni}.` : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View style={styles.datos}>
        <View style={styles.linea}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {cliente.nombre}
          </Text>
          {/* Sin deuda el número se apaga: un `$0,00` en negro al lado de otros
              en negro se lee como plata a cobrar. */}
          <Text variant="body" weight="semibold" color={alDia ? 'textMuted' : 'text'}>
            {deuda}
          </Text>
        </View>

        <View style={styles.estado}>
          <EstadoBadge estado={cliente.estado} />
          {/* En el tablero alcanza con la marca: el motivo va en la cuenta, que
              es donde se decide si se le sigue fiando. */}
          {clienteSinFiado(cliente) && <Chip label="No se le fía" tone="danger" />}
          {/* El aviso en texto al lado del chip: el color dice "urgente", pero
              hace cuánto se pasó solo lo dice el número. */}
          {vencimiento && (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {vencimiento}
            </Text>
          )}
        </View>

        <View style={styles.linea}>
          <Text variant="small" numberOfLines={1}>
            {impagas}
          </Text>
          {/* El vencimiento que se muestra es el MÁS VIEJO de lo que debe: es el
              que decide a quién hay que llamar hoy. */}
          {vence && (
            <Text variant="caption" color="textMuted">
              {vence}
            </Text>
          )}
        </View>

        {/* Contexto, en una línea apagada. El DNI solo si la cuenta tiene: las de
            Google o email no. */}
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {cliente.dni
            ? `DNI ${cliente.dni} · Facturado ${formatMonto(cliente.totalFacturado)}`
            : `Facturado ${formatMonto(cliente.totalFacturado)}`}
        </Text>
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
    presionado: { opacity: 0.7 },

    /** `flex: 1` para que el chevron quede pegado al borde y no flote. */
    datos: { flex: 1, gap: theme.spacing.xs },
    linea: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    estado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  });

export const ClienteFacturadoItem = memo(ClienteFacturadoItemComponent);
