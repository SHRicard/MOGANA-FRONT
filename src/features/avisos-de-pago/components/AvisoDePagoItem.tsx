import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import { Button } from '@/shared/ui/atoms/Button';
import { EstadoBadge, type EstadoTono } from '@/shared/ui/atoms/EstadoBadge';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatFechaHora, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  ESTADO_DE_AVISO_LABEL,
  EstadosDeAvisoDePago,
  MEDIO_DE_PAGO_LABEL,
  nombreDelCliente,
  seAnotoDistinto,
  type AvisoDePago,
  type EstadoDeAvisoDePago,
} from '../types';
import { ComprobanteDelAviso } from './ComprobanteDelAviso';

export interface AvisoDePagoItemProps {
  aviso: AvisoDePago;
  /** Abrir el comprobante en grande. */
  onVerComprobante: (url: string) => void;
  /** Anotar el cobro. Solo en los pendientes. */
  onConfirmar: (aviso: AvisoDePago) => void;
  /** No tomarlo, con el motivo. Solo en los pendientes. */
  onRechazar: (aviso: AvisoDePago) => void;
  /** Se apagan los botones mientras se está resolviendo alguno. */
  resolviendo: boolean;
}

const ICON_SIZE = 16;

/** El tono de cada estado, con el mismo semáforo del resto de la app. */
const TONO: Record<EstadoDeAvisoDePago, EstadoTono> = {
  pendiente: 'espera',
  confirmado: 'ok',
  rechazado: 'tarde',
};

/**
 * **Un cliente diciendo que pagó**, con todo lo que hace falta para decidir sin
 * salir de la pantalla.
 *
 * ⚠️ Lo primero, porque le da forma a la tarjeta: **esto no es un cobro**. Es lo
 * que el cliente *dice*. Por eso el botón dice "Anotar el cobro" y no "Aceptar",
 * y por eso al lado va el saldo de la factura: lo que se está por hacer es
 * escribir plata en una cuenta.
 *
 * El orden de arriba hacia abajo es el orden en que se decide:
 *
 * 1. **quién y cuánto** — de un vistazo, para saber si vale la pena mirar;
 * 2. **la referencia** — es con lo que se lo busca en el resumen del banco;
 * 3. **el comprobante** — la captura, que es lo que evita buscar a ojo;
 * 4. **los botones**.
 *
 * ⚠️ **`entraEnElSaldo` en `false` se avisa antes de tocar nada.** Confirmarlo
 * tal cual va a fallar: o el cliente se equivocó, o alguien ya anotó ese cobro a
 * mano. Decirlo acá ahorra el `400` y explica qué mirar.
 */
function AvisoDePagoItemComponent({
  aviso,
  onVerComprobante,
  onConfirmar,
  onRechazar,
  resolviendo,
}: AvisoDePagoItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const confirmar = useCallback(() => onConfirmar(aviso), [onConfirmar, aviso]);
  const rechazar = useCallback(() => onRechazar(aviso), [onRechazar, aviso]);

  const pendiente = aviso.estado === EstadosDeAvisoDePago.PENDIENTE;
  const distinto = seAnotoDistinto(aviso);

  return (
    <View style={styles.tarjeta}>
      {/* 1. Quién y cuánto. */}
      <View style={styles.encabezado}>
        <View style={styles.quien}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {nombreDelCliente(aviso)}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {`Factura #${aviso.factura.numero} · vence ${formatFecha(aviso.factura.fechaFin)}`}
          </Text>
        </View>
        <EstadoBadge label={ESTADO_DE_AVISO_LABEL[aviso.estado]} tono={TONO[aviso.estado]} />
      </View>

      <View style={styles.plata}>
        <Text variant="title" weight="semibold">
          {formatMonto(aviso.monto)}
        </Text>
        <Text variant="caption" color="textMuted">
          {`${MEDIO_DE_PAGO_LABEL[aviso.medio]} · ${formatFecha(aviso.fecha)}`}
        </Text>
      </View>

      <Text variant="caption" color="textMuted">
        {`De esta factura falta cobrar ${formatMonto(
          aviso.factura.saldo,
        )}. Avisó el ${formatFechaHora(aviso.informadoEn)}.`}
      </Text>

      {/*
        No entra en el saldo: confirmarlo tal cual va a fallar. Se dice ANTES de
        que alguien toque el botón, no después con un 400 que no explica nada.
      */}
      {pendiente && !aviso.entraEnElSaldo ? (
        <View style={styles.alerta} accessible accessibilityRole="alert">
          <CircleAlert size={ICON_SIZE} color={theme.colors.onWarningMuted} />
          <View style={styles.alertaTexto}>
            <Text variant="caption" color="onWarningMuted">
              Este monto no entra en lo que falta cobrar. O el cliente se equivocó, o alguien ya
              anotó este cobro a mano. Revisá la factura antes de confirmarlo.
            </Text>
          </View>
        </View>
      ) : null}

      {/* 2. Con qué se lo busca en el banco. */}
      {aviso.referencia ? (
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {`Referencia: ${aviso.referencia}`}
        </Text>
      ) : null}
      {aviso.nota ? (
        <Text variant="caption" color="textMuted">
          {`Nota del cliente: ${aviso.nota}`}
        </Text>
      ) : null}

      {/* 3. La captura. Es lo que se mira antes de decidir. */}
      <ComprobanteDelAviso comprobante={aviso.comprobante} onAmpliar={onVerComprobante} />

      {/*
        Lo que se anotó de verdad, cuando no es lo que dijo el cliente. Se
        muestran LOS DOS: el aviso guarda lo que dijo y el cobro lo que vio el
        negocio, y esa diferencia es lo que después hay que poder explicar.
      */}
      {distinto ? (
        <View style={styles.resuelto}>
          <Text variant="caption" color="textMuted">
            {`Se anotó ${formatMonto(aviso.montoCobrado ?? 0)}${
              aviso.fechaCobrada ? ` con fecha ${formatFecha(aviso.fechaCobrada)}` : ''
            }, distinto de lo que informó.`}
          </Text>
        </View>
      ) : null}

      {aviso.motivoRechazo ? (
        <View style={styles.motivo}>
          <Text variant="caption" color="error">
            {`No se tomó: ${aviso.motivoRechazo}`}
          </Text>
        </View>
      ) : null}

      {aviso.resueltoEn ? (
        <Text variant="caption" color="textMuted">
          {`Resuelto el ${formatFechaHora(aviso.resueltoEn)}${
            aviso.resueltoPor?.displayName ? ` por ${aviso.resueltoPor.displayName}` : ''
          }.`}
        </Text>
      ) : null}

      {/* 4. Los botones. Solo mientras haya algo que decidir. */}
      {pendiente ? (
        <View style={styles.acciones}>
          <View style={styles.accion}>
            <Button
              label="No tomarlo"
              variant="secondary"
              size="sm"
              onPress={rechazar}
              disabled={resolviendo}
              fullWidth
            />
          </View>
          <View style={styles.accion}>
            {/* "Anotar el cobro" y no "Aceptar": acá recién se escribe plata. */}
            <Button
              label="Anotar el cobro"
              size="sm"
              onPress={confirmar}
              disabled={resolviendo}
              fullWidth
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

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

    encabezado: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    /** `flex: 1` para que el nombre se corte antes de empujar al badge. */
    quien: { flex: 1, gap: theme.spacing.xxs },

    plata: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    alerta: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.md,
    },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al ícono. */
    alertaTexto: { flex: 1 },

    resuelto: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.md,
    },
    motivo: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
    },

    acciones: { flexDirection: 'row', gap: theme.spacing.sm },
    /** Los dos se reparten el ancho: ninguno es "el chiquito". */
    accion: { flex: 1 },
  });

export const AvisoDePagoItem = memo(AvisoDePagoItemComponent);
