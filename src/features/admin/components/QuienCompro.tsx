import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@/shared/ui/atoms/Text';
import { formatearDni, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import type { TicketTopCliente } from '../types';

const ICON_SIZE = 16;

export interface QuienComproProps {
  /** Los que más compraron en el mes, por plata. Hasta cinco. */
  clientes: readonly TicketTopCliente[];
  /** Abrir la ficha de ese cliente, que es donde están las acciones. */
  onPress: (cliente: TicketTopCliente) => void;
}

/**
 * Quién compró en el mes: los cinco más grandes, por plata.
 *
 * ⚠️ **`facturado` y `cobrado` no son la misma plata.** Lo facturado es del mes,
 * pero lo cobrado puede ser de facturas viejas: puede aparecer alguien con
 * `facturado` en cero y un cobro alto —no compró nada, pagó lo que debía— y eso
 * es un dato bueno, no un bug. Por eso el renglón los muestra por separado en
 * vez de sumarlos.
 */
function QuienComproComponent({ clientes, onPress }: QuienComproProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tarjeta}>
      <Text variant="small" weight="semibold">
        Quién compró
      </Text>

      {clientes.map((cliente, indice) => (
        <FilaCliente
          key={cliente.clienteId}
          cliente={cliente}
          conBorde={indice > 0}
          onPress={onPress}
          styles={styles}
          colorFlecha={theme.colors.textMuted}
        />
      ))}
    </View>
  );
}

interface FilaClienteProps {
  cliente: TicketTopCliente;
  conBorde: boolean;
  onPress: (cliente: TicketTopCliente) => void;
  styles: Estilos;
  colorFlecha: string;
}

function FilaCliente({ cliente, conBorde, onPress, styles, colorFlecha }: FilaClienteProps) {
  const abrir = useCallback(() => onPress(cliente), [onPress, cliente]);

  const detalle = [
    cliente.dni ? formatearDni(cliente.dni) : null,
    cliente.facturas === 1 ? '1 factura' : `${cliente.facturas} facturas`,
    // Solo si pagó algo: un "pagó $0" en cada renglón es ruido, y encima suena a
    // reproche cuando la factura recién se emitió y todavía está en fecha.
    cliente.cobrado > 0 ? `pagó ${formatMonto(cliente.cobrado)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [
        styles.fila,
        conBorde && styles.filaConBorde,
        pressed && styles.presionada,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${cliente.nombre}. Facturado ${formatMonto(
        cliente.facturado,
      )}. ${detalle}.`}
    >
      <View style={styles.identidad}>
        <Text variant="caption" weight="medium" numberOfLines={1}>
          {cliente.nombre}
        </Text>
        <Text variant="micro" color="textMuted" numberOfLines={1}>
          {detalle}
        </Text>
      </View>

      <Text variant="body" weight="semibold" numberOfLines={1}>
        {formatMonto(cliente.facturado)}
      </Text>
      <ChevronRight size={ICON_SIZE} color={colorFlecha} />
    </Pressable>
  );
}

type Estilos = ReturnType<typeof createStyles>;

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
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
    },
    /** Línea entre renglones, menos arriba del primero. */
    filaConBorde: {
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    presionada: { opacity: 0.7 },
    /** `flex: 1` para que los importes queden alineados a la derecha. */
    identidad: { flex: 1, gap: theme.spacing.xxs },
  });

export const QuienCompro = memo(QuienComproComponent);
