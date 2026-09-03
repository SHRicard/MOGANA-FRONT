import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { formatUptime, type ResumenDelSistema } from '../types';
import { Dato } from './Dato';
import { Tarjeta } from './Tarjeta';

export interface TarjetaDelServidorProps {
  servidor: ResumenDelSistema['servidor'];
  /** El día **del servidor**, que es el que usan los vencimientos y los cierres. */
  hoy: string;
  /** Si la hora del servidor se apartó de la de este teléfono más de lo tolerable. */
  relojDesfasado: boolean;
}

const ICON_SIZE = 16;

/**
 * **En qué estado está la instalación** (§3).
 *
 * ⚠️ `hora` no es un adorno: medio sistema depende de qué día es hoy —los
 * vencimientos, los meses de las métricas, el cron de las 8— y un servidor con
 * la hora corrida produce números que no cierran **sin que nada falle**. Por eso
 * cuando la diferencia pasa de un par de minutos se dice fuerte.
 *
 * ⚠️ `version` en `null` **se dice, no se esconde**: quiere decir que
 * `APP_VERSION` no está puesta del otro lado. Sin ese renglón, *"¿está deployado
 * el fix?"* no se contesta desde la app.
 */
function TarjetaDelServidorComponent({ servidor, hoy, relojDesfasado }: TarjetaDelServidorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Tarjeta titulo="Servidor">
      {relojDesfasado ? (
        <View style={styles.aviso} accessible accessibilityRole="alert">
          <TriangleAlert size={ICON_SIZE} color={theme.colors.onWarningMuted} />
          <View style={styles.textoDelIcono}>
            <Text variant="caption" color="onWarningMuted">
              La hora del servidor no coincide con la de este teléfono. Los vencimientos, los meses
              de las métricas y el aviso de las 8 se calculan con la del servidor.
            </Text>
          </View>
        </View>
      ) : null}

      <Dato etiqueta="Entorno" valor={servidor.entorno} />
      <Dato
        etiqueta="Versión"
        valor={servidor.version ?? 'Sin declarar'}
        nota={servidor.version ? undefined : 'Falta APP_VERSION en el servidor'}
      />
      <Dato etiqueta="Hace cuánto que está levantado" valor={formatUptime(servidor.uptimeSegundos)} />
      <Dato etiqueta="Arrancó" valor={formatFechaHora(servidor.arrancadoEn)} />
      <Dato
        etiqueta="Su hora"
        nota="Con la que se calculan los vencimientos"
        valor={formatFechaHora(servidor.hora)}
      />
      <Dato etiqueta="Su día de hoy" valor={formatFecha(hoy)} />
    </Tarjeta>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    aviso: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.lg,
    },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al ícono. */
    textoDelIcono: { flex: 1, gap: theme.spacing.xxs },
  });

export const TarjetaDelServidor = memo(TarjetaDelServidorComponent);
