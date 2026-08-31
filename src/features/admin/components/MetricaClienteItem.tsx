import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Text } from '@/shared/ui/atoms/Text';
import { formatearDni, formatMonto } from '@/shared/utils';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import { EstadoDeCuentaBadge } from './EstadoDeCuentaBadge';
import { formatDias, type MetricaCliente } from '../types';

const ICON_SIZE = 18;

export interface MetricaClienteItemProps {
  cliente: MetricaCliente;
  /** Abrir su ficha, que es donde está todo lo que no entra en el renglón. */
  onPress: (cliente: MetricaCliente) => void;
}

/**
 * Un renglón del listado de clientes: **cuánto compró, cuánto debe y hace cuánto
 * que no aparece**.
 *
 * Son tres números y nada más, a propósito: esto es una pantalla para **barrer y
 * elegir**, no un informe. Con doce columnas por fila nadie encuentra nada.
 *
 * ⚠️ **Acá no va la tasa de cumplimiento.** Cómo paga alguien no se entiende con
 * un número suelto —un "cumple 20 %" es igual de bajo en el que paga todo tarde
 * que en el que directamente no paga, y son dos problemas distintos—, así que
 * eso vive en la ficha, con las tres patas de la cuenta al lado.
 *
 * El toque abre esa ficha (`docs/flujo_metricas_cliente.md`).
 */
function MetricaClienteItemComponent({ cliente, onPress }: MetricaClienteItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const abrir = useCallback(() => onPress(cliente), [onPress, cliente]);

  const debeAlgo = cliente.deuda > 0;

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [styles.card, pressed && styles.presionado]}
      accessibilityRole="button"
      // Todo el renglón en una frase: el lector de pantalla no tiene columnas.
      accessibilityLabel={[
        `${cliente.nombre}.`,
        `${cliente.facturas} ${cliente.facturas === 1 ? 'factura' : 'facturas'}.`,
        `Facturado ${formatMonto(cliente.totalFacturado)}.`,
        debeAlgo ? `Debe ${formatMonto(cliente.deuda)}.` : 'No debe nada.',
        cliente.vencido > 0 ? `De eso, ${formatMonto(cliente.vencido)} está vencido.` : '',
        `Compró por última vez hace ${formatDias(cliente.diasSinComprar)}.`,
        cliente.seLeFia ? '' : 'No se le fía.',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View style={styles.encabezado}>
        <View style={styles.identidad}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {cliente.nombre}
          </Text>
          <Text variant="micro" color="textMuted" numberOfLines={1}>
            {[
              cliente.dni ? formatearDni(cliente.dni) : null,
              `${cliente.facturas} ${cliente.facturas === 1 ? 'factura' : 'facturas'}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        {/* Una advertencia sobre la persona, no un estado de su cuenta: por eso
            va en rojo y no en el semáforo de la deuda. */}
        {!cliente.seLeFia && <Chip label="No se le fía" tone="danger" />}

        {/* El semáforo de su cuenta corriente, el mismo del tablero. */}
        <EstadoDeCuentaBadge estado={cliente.estado} />

        <ChevronRight size={ICON_SIZE} color={theme.colors.textMuted} />
      </View>

      <View style={styles.columnas}>
        <Columna etiqueta="Facturado" valor={formatMonto(cliente.totalFacturado)} styles={styles} />
        <Columna
          etiqueta="Debe"
          valor={formatMonto(cliente.deuda)}
          // Rojo solo si además hay algo VENCIDO: deber estando en fecha es
          // normal y pintarlo de rojo haría que todo el listado parezca un
          // problema.
          tono={cliente.vencido > 0 ? 'statusLate' : undefined}
          styles={styles}
        />
        <Columna
          etiqueta="Sin comprar"
          valor={formatDias(cliente.diasSinComprar)}
          styles={styles}
        />
      </View>
    </Pressable>
  );
}

interface ColumnaProps {
  etiqueta: string;
  valor: string;
  tono?: keyof ThemeColors;
  styles: Estilos;
}

/** Una de las tres columnas de números. */
function Columna({ etiqueta, valor, tono, styles }: ColumnaProps) {
  return (
    // Decorativo: el renglón entero ya se lee como una frase.
    <View
      style={styles.columna}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant="micro" color="textMuted" numberOfLines={1}>
        {etiqueta}
      </Text>
      <Text variant="small" weight="semibold" color={tono} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  );
}

type Estilos = ReturnType<typeof createStyles>;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    presionado: { opacity: 0.7 },

    encabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    /** `flex: 1` para que los chips y la flecha queden pegados al borde. */
    identidad: { flex: 1, gap: theme.spacing.xxs },

    columnas: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    columna: { flex: 1, gap: theme.spacing.xxs },
  });

export const MetricaClienteItem = memo(MetricaClienteItemComponent);
