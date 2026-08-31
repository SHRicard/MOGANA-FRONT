import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import type { MiPago } from '../types';

export interface MiPagoItemProps {
  pago: MiPago;
}

/**
 * Un pago anotado en la factura: cuándo entró y cuánto.
 *
 * Vienen **del más viejo al más nuevo** para que la lista se lea como un
 * extracto. Es lo que se anotó de verdad del lado del negocio, no lo que se
 * avisó: los avisos son otra cosa y viven en su propia pantalla (§9).
 */
function MiPagoItemComponent({ pago }: MiPagoItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={`Pago del ${formatFecha(pago.fecha)}: ${formatMonto(pago.monto)}.`}
    >
      <Text variant="small" color="textMuted">
        {formatFecha(pago.fecha)}
      </Text>
      <Text variant="small" weight="semibold">
        {formatMonto(pago.monto)}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
  });

export const MiPagoItem = memo(MiPagoItemComponent);
