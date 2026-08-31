import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto, tituloDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import type { MesTicket } from '../types';

const ICON_SIZE = 18;

export interface MesTicketItemProps {
  mes: MesTicket;
  /** Abrir el ticket de ese mes. */
  onPress: (mes: MesTicket) => void;
}

/**
 * Un mes del índice de tickets: lo que se facturó, lo que entró y **con cuánta
 * deuda cerró**.
 *
 * ⚠️ Esa deuda es **la del cierre de ese mes**, no la de hoy. Es lo contrario que
 * el tablero, y por eso el renglón lo dice con todas las letras: sin esa
 * etiqueta, la columna se lee como la deuda de ahora.
 *
 * **Los meses sin movimiento se dibujan igual**, apagados: si se saltearan, el
 * listado mostraría marzo pegado a junio como si fueran consecutivos. Y ojo, uno
 * sin movimiento puede tener deuda al cierre alta — es la de arrastre, que no
 * desaparece porque un mes no se haya facturado nada.
 */
function MesTicketItemComponent({ mes, onPress }: MesTicketItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const abrir = useCallback(() => onPress(mes), [onPress, mes]);

  const titulo = tituloDeMesApi(mes.mes);
  const apagado = !mes.conMovimiento;

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [styles.card, pressed && styles.presionado]}
      accessibilityRole="button"
      // Todo el renglón en una frase: el lector de pantalla no tiene columnas.
      accessibilityLabel={[
        `${titulo}.`,
        mes.cerrado ? '' : 'El mes está en curso.',
        apagado
          ? 'Sin movimiento.'
          : `Facturado ${formatMonto(mes.facturado)}, ${mes.facturas} ${
              mes.facturas === 1 ? 'factura' : 'facturas'
            }. Cobrado ${formatMonto(mes.cobrado)}, ${mes.cobros} ${
              mes.cobros === 1 ? 'cobro' : 'cobros'
            }.`,
        `Deuda al cierre ${formatMonto(mes.deudaAlCierre)}.`,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View style={styles.encabezado}>
        <View style={styles.titulo}>
          <Text
            variant="body"
            weight="semibold"
            color={apagado ? 'textMuted' : 'text'}
            numberOfLines={1}
          >
            {titulo}
          </Text>
        </View>

        {/* El mes que todavía no terminó: su ticket va a ser parcial y hay que
            decirlo desde acá, no recién adentro. */}
        {!mes.cerrado && <Chip label="En curso" tone="brand" />}

        <ChevronRight size={ICON_SIZE} color={theme.colors.textMuted} />
      </View>

      <View style={styles.columnas}>
        <Columna
          etiqueta="Facturado"
          valor={formatMonto(mes.facturado)}
          detalle={mes.facturas === 1 ? '1 factura' : `${mes.facturas} facturas`}
          styles={styles}
        />
        <Columna
          etiqueta="Cobrado"
          valor={formatMonto(mes.cobrado)}
          detalle={mes.cobros === 1 ? '1 cobro' : `${mes.cobros} cobros`}
          styles={styles}
        />
        <Columna
          etiqueta="Deuda al cierre"
          valor={formatMonto(mes.deudaAlCierre)}
          // Sin movimiento la deuda sigue estando: es la de arrastre.
          detalle={apagado ? 'Sin movimiento' : undefined}
          styles={styles}
        />
      </View>
    </Pressable>
  );
}

interface ColumnaProps {
  etiqueta: string;
  valor: string;
  detalle?: string;
  styles: Estilos;
}

/** Una de las tres columnas de números. */
function Columna({ etiqueta, valor, detalle, styles }: ColumnaProps) {
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
      <Text variant="small" weight="semibold" numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      {detalle !== undefined && (
        <Text variant="micro" color="textMuted" numberOfLines={1}>
          {detalle}
        </Text>
      )}
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
      gap: theme.spacing.sm,
    },
    /** `flex: 1` para que el chip y la flecha queden pegados al borde. */
    titulo: { flex: 1 },

    columnas: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    columna: { flex: 1, gap: theme.spacing.xxs },
  });

export const MesTicketItem = memo(MesTicketItemComponent);
