import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Hourglass from 'lucide-react-native/icons/hourglass';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { MEDIO_DE_PAGO_LABEL, type MiAvisoDePago } from '../types';

export interface AvisosSinResolverProps {
  /** Solo los de **esta** factura, y solo los que todavía nadie resolvió. */
  avisos: readonly MiAvisoDePago[];
}

const ICON_SIZE = 16;

/**
 * *"Avisaste $12.000 el 20/08, sin confirmar"*: los avisos de esta factura que
 * todavía están esperando (`docs/user_cliente_flujo.md` §6).
 *
 * Hace dos cosas, y las dos importan:
 *
 * 1. **Explica por qué la deuda no bajó.** Sin este renglón, alguien que avisó
 *    ayer ve el mismo saldo y concluye que el aviso se perdió.
 * 2. **Evita informar de más.** Lo ya informado y sin resolver cuenta como si
 *    estuviera cobrado, así que sin verlo se avisa dos veces lo mismo y el
 *    segundo intento vuelve con un `400`.
 *
 * No se dibuja si no hay ninguno: un cartel vacío diciendo "no avisaste nada" en
 * cada factura es ruido.
 */
function AvisosSinResolverComponent({ avisos }: AvisosSinResolverProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (avisos.length === 0) {
    return null;
  }

  return (
    <View style={styles.tarjeta} accessible accessibilityRole="alert">
      <View style={styles.encabezado}>
        <Hourglass size={ICON_SIZE} color={theme.colors.textMuted} />
        <Text variant="small" weight="semibold">
          {avisos.length === 1 ? 'Avisaste un pago' : `Avisaste ${avisos.length} pagos`}
        </Text>
      </View>

      {avisos.map((aviso) => (
        <Text key={aviso.id} variant="caption" color="textMuted">
          {`${formatMonto(aviso.monto)} el ${formatFecha(aviso.fecha)} por ${MEDIO_DE_PAGO_LABEL[
            aviso.medio
          ].toLowerCase()}`}
        </Text>
      ))}

      <Text variant="caption" color="textMuted">
        Todavía no lo confirmamos, así que la deuda sigue igual. Cuando lo tomemos, te avisamos.
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tarjeta: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.lg,
    },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  });

export const AvisosSinResolver = memo(AvisosSinResolverComponent);
