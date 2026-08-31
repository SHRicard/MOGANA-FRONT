import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import {
  comoPagaDe,
  facturasEnCurso,
  FormasDePagar,
  textoComoPaga,
  type ComoPaga,
  type CumplimientoDelCliente,
  type FacturasDelCliente,
} from '../types';

export interface PatasDelCumplimientoProps {
  cumplimiento: CumplimientoDelCliente;
  /** Para poder decir cuántas facturas todavía están corriendo. */
  facturas: FacturasDelCliente;
}

/** El color de la lectura: solo grita cuando hay algo que no está. */
const TONO_COMO_PAGA: Record<ComoPaga, keyof ThemeColors> = {
  [FormasDePagar.SIN_FACTURAS]: 'textMuted',
  [FormasDePagar.SIN_VENCIMIENTOS]: 'textMuted',
  [FormasDePagar.NUNCA_PAGO]: 'statusLate',
  [FormasDePagar.SIEMPRE_EN_FECHA]: 'success',
  [FormasDePagar.SE_ATRASA]: 'statusSoon',
};

/**
 * De qué está hecha la tasa: **las tres patas de la cuenta**.
 *
 * Es el renglón que el doc pide no saltear, y la razón es concreta: un
 * "cumple 20 %" suelto hace parecer iguales a dos clientes opuestos —el que
 * paga todo tarde y el que no paga— y son dos problemas distintos. Con
 * `sinPagar` a la vista, el que mira sabe si tiene que apretar la cobranza o
 * cortarle el fiado.
 *
 * `exigibles = enFecha + tarde + sinPagar`. Las que **todavía están en fecha no
 * entran**, ni arriba ni abajo: una factura emitida ayer a 30 días no cumplió ni
 * incumplió nada, y contarla como incumplimiento haría que comprar mucho hunda
 * la tasa. Por eso el pie dice cuántas están corriendo — si no, la cuenta no
 * cierra contra las facturas que se ven en la cuenta corriente.
 *
 * La línea de abajo —qué clase de pagador es— **viene resuelta del backend**
 * (`comoPaga`): deducirla acá cruzando demoras nulas con contadores es
 * justamente donde el que nunca pagó terminaba mostrándose como el mejor.
 */
function PatasDelCumplimientoComponent({ cumplimiento, facturas }: PatasDelCumplimientoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const lectura = textoComoPaga(cumplimiento, facturas);
  const tono = TONO_COMO_PAGA[comoPagaDe(cumplimiento, facturas)];
  const corriendo = facturasEnCurso(cumplimiento, facturas);

  return (
    <View
      style={styles.tarjeta}
      accessible
      accessibilityLabel={[
        `De ${cumplimiento.exigibles} facturas que ya se tenían que pagar:`,
        `${cumplimiento.enFecha} en fecha,`,
        `${cumplimiento.tarde} tarde,`,
        `${cumplimiento.sinPagar} sin pagar.`,
        `${lectura}.`,
      ].join(' ')}
    >
      <Text variant="small" weight="semibold">
        De qué está hecha la tasa
      </Text>

      <View style={styles.patas}>
        <Pata etiqueta="En fecha" valor={cumplimiento.enFecha} tono="success" styles={styles} />
        <Pata etiqueta="Tarde" valor={cumplimiento.tarde} tono="statusSoon" styles={styles} />
        <Pata
          etiqueta="Sin pagar"
          valor={cumplimiento.sinPagar}
          tono="statusLate"
          styles={styles}
        />
      </View>

      <Text variant="caption" color={tono} weight="medium">
        {lectura}
      </Text>

      {/* Sin esta línea, la cuenta no cierra contra las facturas que el
          administrador ve en la cuenta corriente. */}
      {corriendo > 0 && (
        <Text variant="micro" color="textMuted">
          {corriendo === 1
            ? 'Hay 1 factura más que todavía está en fecha: no entra en la cuenta.'
            : `Hay ${corriendo} facturas más que todavía están en fecha: no entran en la cuenta.`}
        </Text>
      )}
    </View>
  );
}

interface PataProps {
  etiqueta: string;
  valor: number;
  tono: keyof ThemeColors;
  styles: Estilos;
}

/**
 * Una pata de la cuenta. **El color solo aparece con algo adentro**: un cero
 * pintado de rojo haría que un cliente perfecto se vea como un problema.
 */
function Pata({ etiqueta, valor, tono, styles }: PataProps) {
  return (
    // Decorativo: la tarjeta entera ya se lee como una frase.
    <View
      style={styles.pata}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant="subtitle" weight="bold" color={valor > 0 ? tono : 'textMuted'}>
        {`${valor}`}
      </Text>
      <Text variant="micro" color="textMuted" numberOfLines={1}>
        {etiqueta}
      </Text>
    </View>
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
    patas: { flexDirection: 'row', gap: theme.spacing.sm },
    pata: { flex: 1, gap: theme.spacing.xxs },
  });

export const PatasDelCumplimiento = memo(PatasDelCumplimientoComponent);
