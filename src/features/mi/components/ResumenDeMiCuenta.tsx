import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { EstadosCuenta } from '@/features/facturas';
import { EstadoBadge, type EstadoTono } from '@/shared/ui/atoms/EstadoBadge';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { cuandoVence, ESTADO_DE_MI_CUENTA, type MiCuenta } from '../types';

export interface ResumenDeMiCuentaProps {
  cuenta: MiCuenta;
}

/** El mismo semáforo del panel, con la frase del cliente al lado. */
const TONO: Record<string, EstadoTono> = {
  [EstadosCuenta.AL_DIA]: 'ok',
  [EstadosCuenta.PENDIENTE]: 'espera',
  [EstadosCuenta.PROXIMA_A_VENCER]: 'pronto',
  [EstadosCuenta.VENCIDA]: 'tarde',
};

/**
 * **Cuánto debo** (`docs/user_cliente_flujo.md` §4): el encabezado del inicio.
 *
 * El número grande es la deuda, y debajo de qué está hecha: lo que ya se pasó de
 * fecha y lo que todavía tiene plazo.
 *
 * ⚠️ **`vencido + porVencer = deuda`, siempre**, y esa cuenta la hizo el
 * servidor: acá no se resta nada. Restar plata en el teléfono es la forma más
 * fácil de que el encabezado y la lista no cierren.
 *
 * ⚠️ **Lo que hay a favor va para el otro lado que la deuda.** `aReembolsar` es
 * plata que el negocio tiene que devolver —de facturas que se pagaron y después
 * se anularon—, así que va en una fila aparte, con otro color y **solo si es
 * mayor que cero**. Restarla de la deuda en la misma línea sería mezclar dos
 * platas distintas.
 *
 * ⚠️ **`proximoVencimiento: null` no es una fecha vacía**: es que no hay nada
 * que vencer, y entonces no se muestra ninguna línea de vencimiento.
 */
function ResumenDeMiCuentaComponent({ cuenta }: ResumenDeMiCuentaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const debeAlgo = cuenta.deuda > 0;
  /**
   * El vencimiento más urgente de lo que se debe. Los dos campos van juntos —o
   * hay vencimiento y días, o no hay nada— pero se preguntan los dos: sin el
   * número no se puede decir "hace cuánto".
   */
  const urgente =
    cuenta.proximoVencimiento !== null && cuenta.diasParaVencer !== null
      ? `Lo más urgente ${cuandoVence(cuenta.diasParaVencer)} (${formatFecha(
          cuenta.proximoVencimiento,
        )})`
      : null;

  return (
    <View style={styles.tarjeta}>
      <View style={styles.linea}>
        <Text variant="small" color="textMuted">
          {debeAlgo ? 'Debés' : 'No debés nada'}
        </Text>
        <EstadoBadge
          label={ESTADO_DE_MI_CUENTA[cuenta.estado]}
          tono={TONO[cuenta.estado] ?? 'apagado'}
        />
      </View>

      <Text variant="display" weight="bold">
        {formatMonto(cuenta.deuda)}
      </Text>

      {/* De qué está hecha la deuda. Solo si debe algo: un "$0 vencido · $0 por
          vencer" debajo de un cero es ruido. */}
      {debeAlgo && (
        <Text variant="small" color="textMuted">
          {`${formatMonto(cuenta.vencido)} vencido · ${formatMonto(cuenta.porVencer)} por vencer`}
        </Text>
      )}

      {urgente && (
        <Text
          variant="small"
          weight="medium"
          color={cuenta.diasParaVencer !== null && cuenta.diasParaVencer < 0 ? 'error' : 'text'}
        >
          {urgente}
        </Text>
      )}

      {/*
        Plata a favor: lo que el negocio te tiene que devolver. Va aparte y con
        otro color porque se mueve para el otro lado que la deuda — y no se
        resta de ella nunca.
      */}
      {cuenta.aReembolsar > 0 && (
        <View style={styles.aFavor} accessible accessibilityRole="alert">
          <Text variant="small" weight="semibold" color="success">
            {`Te devolvemos ${formatMonto(cuenta.aReembolsar)}`}
          </Text>
          <Text variant="caption" color="textMuted">
            De facturas que pagaste y después se anularon.
          </Text>
        </View>
      )}

      <View style={styles.historico}>
        <Dato etiqueta="Facturas" valor={textoDeFacturas(cuenta)} />
        <Dato etiqueta="Te facturaron" valor={formatMonto(cuenta.totalFacturado)} />
        <Dato etiqueta="Pagaste" valor={formatMonto(cuenta.totalPagado)} />
      </View>
    </View>
  );
}

/**
 * "23 · 5 sin pagar" o "23 en total". **Las anuladas no se cuentan**: la API ya
 * las deja afuera de las dos cifras.
 */
function textoDeFacturas(cuenta: MiCuenta): string {
  if (cuenta.facturasImpagas === 0) {
    return `${cuenta.facturas} en total`;
  }
  return `${cuenta.facturas} · ${cuenta.facturasImpagas} sin pagar`;
}

interface DatoProps {
  etiqueta: string;
  valor: string;
}

/** Un dato del histórico: etiqueta arriba, valor abajo. */
function Dato({ etiqueta, valor }: DatoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.dato} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Text variant="caption" color="textMuted">
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
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    linea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    aFavor: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.successMuted,
      borderRadius: theme.radius.md,
    },

    /** Los tres datos del histórico, repartidos en una fila. */
    historico: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    dato: { flex: 1, gap: theme.spacing.xxs },
  });

export const ResumenDeMiCuenta = memo(ResumenDeMiCuentaComponent);
