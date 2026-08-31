import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Hourglass from 'lucide-react-native/icons/hourglass';
import X from 'lucide-react-native/icons/x';
import { EstadoBadge, type EstadoTono } from '@/shared/ui/atoms/EstadoBadge';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import {
  ESTADO_DE_AVISO_LABEL,
  EstadosDeAviso,
  MEDIO_DE_PAGO_LABEL,
  seAnotoDistinto,
  type EstadoDeAviso,
  type MiAvisoDePago,
} from '../types';

export interface MiAvisoItemProps {
  aviso: MiAvisoDePago;
  /** Abrir la factura de la que habla el aviso. */
  onPress: (aviso: MiAvisoDePago) => void;
}

const ICON_SIZE = 16;

/** El tono de cada estado, con el mismo semáforo del resto de la app. */
const TONO: Record<EstadoDeAviso, EstadoTono> = {
  [EstadosDeAviso.PENDIENTE]: 'espera',
  [EstadosDeAviso.CONFIRMADO]: 'ok',
  [EstadosDeAviso.RECHAZADO]: 'tarde',
};

/** Y su dibujo, para que el estado no se comunique solo con el color. */
const ICONO: Record<EstadoDeAviso, typeof Check> = {
  [EstadosDeAviso.PENDIENTE]: Hourglass,
  [EstadosDeAviso.CONFIRMADO]: Check,
  [EstadosDeAviso.RECHAZADO]: X,
};

const COLOR_ICONO: Record<EstadoDeAviso, keyof ThemeColors> = {
  [EstadosDeAviso.PENDIENTE]: 'textMuted',
  [EstadosDeAviso.CONFIRMADO]: 'success',
  [EstadosDeAviso.RECHAZADO]: 'error',
};

/**
 * Un aviso de pago y en qué quedó (`docs/user_cliente_flujo.md` §9).
 *
 * ⚠️ **`motivoRechazo` va entero**, sin truncar y sin "ver más": es lo único que
 * explica por qué alguien avisó que pagó y le sigue figurando la deuda. Cortarlo
 * en dos líneas deja afuera justo la parte que sirve.
 *
 * ⚠️ Cuando **lo que se anotó no es lo que se informó**, van los dos números: la
 * diferencia es exactamente lo que explica por qué el saldo no bajó lo esperado.
 *
 * ⚠️ El saldo que muestra la factura es el de **hoy**, no el de cuando avisó.
 */
function MiAvisoItemComponent({ aviso, onPress }: MiAvisoItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const abrir = useCallback(() => onPress(aviso), [onPress, aviso]);

  const Icono = ICONO[aviso.estado];
  const distinto = seAnotoDistinto(aviso);

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [styles.card, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityLabel={[
        `${ESTADO_DE_AVISO_LABEL[aviso.estado]}, factura ${aviso.factura.numero}.`,
        `Avisaste ${formatMonto(aviso.monto)} el ${formatFecha(aviso.fecha)} por ${
          MEDIO_DE_PAGO_LABEL[aviso.medio]
        }.`,
        distinto && aviso.montoCobrado !== null
          ? `Se anotaron ${formatMonto(aviso.montoCobrado)}.`
          : '',
        aviso.motivoRechazo ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View style={styles.linea}>
        <View style={styles.encabezado}>
          <Icono size={ICON_SIZE} color={theme.colors[COLOR_ICONO[aviso.estado]]} />
          <EstadoBadge label={ESTADO_DE_AVISO_LABEL[aviso.estado]} tono={TONO[aviso.estado]} />
        </View>

        <Text variant="caption" color="textMuted">
          {`Factura #${aviso.factura.numero}`}
        </Text>
      </View>

      <Text variant="small">
        {`Avisaste ${formatMonto(aviso.monto)} el ${formatFecha(aviso.fecha)} por ${
          MEDIO_DE_PAGO_LABEL[aviso.medio]
        }`}
      </Text>

      {/* Lo que se anotó de verdad, cuando no coincide con lo informado. Es lo
          que explica por qué el saldo no bajó lo que se esperaba. */}
      {distinto && aviso.montoCobrado !== null && (
        <Text variant="small" weight="semibold" color="success">
          {`Se anotaron ${formatMonto(aviso.montoCobrado)}`}
        </Text>
      )}

      {/* El motivo, entero. Sin `numberOfLines`: cortarlo sería quedarse
          justamente sin la explicación. */}
      {aviso.motivoRechazo ? (
        <View style={styles.motivo}>
          <Text variant="small" color="error">
            {aviso.motivoRechazo}
          </Text>
        </View>
      ) : null}

      {aviso.referencia ? (
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {`Referencia: ${aviso.referencia}`}
        </Text>
      ) : null}

      <Text variant="caption" color="textMuted">
        {aviso.factura.saldo > 0
          ? `Hoy esa factura tiene ${formatMonto(aviso.factura.saldo)} sin pagar`
          : 'Esa factura ya está saldada'}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    presionado: { opacity: 0.7 },

    linea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },

    motivo: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
    },
  });

export const MiAvisoItem = memo(MiAvisoItemComponent);
