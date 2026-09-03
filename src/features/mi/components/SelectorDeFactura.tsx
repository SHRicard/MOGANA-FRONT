import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Hourglass from 'lucide-react-native/icons/hourglass';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { cuandoVence, ESTADO_DE_MI_FACTURA, type MiFacturaDeLaLista } from '../types';
import { EstadoDeMiFactura } from './EstadoDeMiFactura';

export interface SelectorDeFacturaProps {
  /** Solo impagas, **lo que vence primero arriba**. */
  facturas: readonly MiFacturaDeLaLista[];
  facturaId: string | null;
  onElegir: (facturaId: string) => void;
  /** Las que ya tienen un aviso esperando: se marcan, no se esconden. */
  yaAvisadas: ReadonlySet<string>;
}

const ICON_SIZE = 18;

/**
 * **¿A qué factura corresponde este comprobante?**
 * (`docs/compartir_comprobante.md` §3).
 *
 * Trae **solo las impagas**, que es lo único que puede ser: una factura ya
 * pagada no puede ser la de este comprobante. Y **lo que vence primero va
 * arriba** —o sea, las vencidas—: es lo que el cliente probablemente acaba de
 * pagar.
 *
 * Cada renglón dice lo que hace falta para reconocerla en dos segundos: el
 * número, cuándo vence y **cuánto debe**. El total no va: la pregunta acá no es
 * de cuánto era la factura sino cuánto queda, que es el monto que se va a
 * proponer al elegirla.
 *
 * ⚠️ Las que **ya tienen un aviso sin confirmar se marcan pero se dejan
 * elegibles** (§5.4). El backend cuenta esos avisos contra el saldo, así que
 * informar de nuevo puede terminar en un `400` — pero puede ser legítimo si
 * quedó saldo por informar, y esconderlas dejaría al cliente sin la factura que
 * está buscando y sin ninguna explicación.
 */
function SelectorDeFacturaComponent({
  facturas,
  facturaId,
  onElegir,
  yaAvisadas,
}: SelectorDeFacturaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.lista}>
      {facturas.map((factura, indice) => (
        <Renglon
          key={factura.id}
          factura={factura}
          elegida={factura.id === facturaId}
          avisada={yaAvisadas.has(factura.id)}
          conBorde={indice > 0}
          onElegir={onElegir}
        />
      ))}
    </View>
  );
}

interface RenglonProps {
  factura: MiFacturaDeLaLista;
  elegida: boolean;
  avisada: boolean;
  conBorde: boolean;
  onElegir: (facturaId: string) => void;
}

function Renglon({ factura, elegida, avisada, conBorde, onElegir }: RenglonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const elegir = useCallback(() => onElegir(factura.id), [onElegir, factura.id]);

  return (
    <Pressable
      onPress={elegir}
      style={({ pressed }) => [
        styles.opcion,
        conBorde && styles.opcionConBorde,
        elegida && styles.opcionElegida,
        pressed && styles.presionado,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      // Toda la factura en una frase: el lector de pantalla no tiene columnas.
      accessibilityLabel={[
        `Factura ${factura.numero}, ${ESTADO_DE_MI_FACTURA[factura.estado].toLowerCase()}.`,
        `Debés ${formatMonto(factura.saldo)}.`,
        `Vence el ${formatFecha(factura.fechaFin)}, ${cuandoVence(factura.diasParaVencer)}.`,
        avisada ? 'Ya avisaste un pago de esta factura que todavía no confirmamos.' : '',
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

          <Text variant="small" weight="semibold">
            {formatMonto(factura.saldo)}
          </Text>
        </View>

        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {`Vence ${formatFecha(factura.fechaFin)} · ${cuandoVence(factura.diasParaVencer)}`}
        </Text>

        {/* Se avisa acá y no al mandar: mejor que ni llegue a intentarlo (§5.4). */}
        {avisada && (
          <View style={styles.avisada}>
            <Hourglass size={ICON_SIZE} color={theme.colors.onWarningMuted} />
            <View style={styles.avisadaTexto}>
              <Text variant="caption" color="onWarningMuted">
                Ya avisaste un pago de esta factura y todavía no lo confirmamos.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Lo elegido se marca con el tilde además del borde: el estado no se
          comunica solo con el color. */}
      {elegida ? (
        <Check size={ICON_SIZE} color={theme.colors.primary} />
      ) : (
        <View style={styles.tildeVacio} />
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    lista: {
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 56,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    /** Línea entre opciones, menos arriba de la primera. */
    opcionConBorde: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    opcionElegida: { backgroundColor: theme.colors.primaryMuted },
    presionado: { opacity: 0.7 },

    /** `flex: 1` para que el tilde quede pegado al borde y no flote. */
    datos: { flex: 1, gap: theme.spacing.xxs },
    linea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },

    avisada: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xxs,
    },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al ícono. */
    avisadaTexto: { flex: 1 },

    /** Reserva el ancho del tilde para que los renglones no bailen al elegir. */
    tildeVacio: { width: ICON_SIZE },
  });

export const SelectorDeFactura = memo(SelectorDeFacturaComponent);
