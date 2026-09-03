import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { Text } from '@/shared/ui/atoms/Text';
import { formatBytes, formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { huerfanos, type ConsumoDelStore } from '../types';
import { BarraDeUso } from './BarraDeUso';

export interface ResumenDelStoreProps {
  consumo: ConsumoDelStore;
}

const ICON_SIZE = 16;

/**
 * Cuántos archivos sin dueño hacen falta para que valga la pena decirlo.
 *
 * Uno o dos son ruido —una subida a medias, una prueba— y sacarlos en pantalla
 * haría que el panel parezca roto. A partir de ahí es plata que se está pagando
 * por archivos que no le sirven a nadie.
 */
const HUERFANOS_QUE_IMPORTAN = 10;

/**
 * **Cuánto ocupa el store**, por los dos lados
 * (`MORGANA-BACK/docs/flujo_comprobantes.md` §5.1).
 *
 * Los dos bloques **miden cosas distintas y ninguno reemplaza al otro**, así que
 * van los dos y separados:
 *
 * - **lo nuestro** es lo que subió esta app. Es exacto e instantáneo, y es el
 *   único número con el que se decide qué borrar;
 * - **la cuenta** es el estado real de Cloudinary: los créditos, que son los que
 *   la suspenden.
 *
 * ⚠️ **`cuenta` puede venir en `null`** —el store sin configurar, o su API que no
 * contestó— y el panel sigue mostrando lo nuestro igual: no puede caerse porque
 * un tercero esté lento.
 */
function ResumenDelStoreComponent({ consumo }: ResumenDelStoreProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { propio, cuenta } = consumo;
  const sinDuenio = huerfanos(consumo);

  return (
    <View style={styles.bloques}>
      <View style={styles.tarjeta}>
        <Text variant="caption" color="textMuted">
          Comprobantes de la app
        </Text>
        <View style={styles.linea}>
          <Text variant="display" weight="semibold">
            {formatBytes(propio.bytes)}
          </Text>
          <Text variant="small" color="textMuted">
            {`${propio.comprobantes} ${propio.comprobantes === 1 ? 'archivo' : 'archivos'}`}
          </Text>
        </View>
        {propio.masViejo ? (
          <Text variant="caption" color="textMuted">
            {`El más viejo es del ${formatFechaHora(propio.masViejo)}.`}
          </Text>
        ) : null}
        {propio.borrados.comprobantes > 0 ? (
          <Text variant="caption" color="textMuted">
            {`Ya liberaste ${formatBytes(propio.borrados.bytes)} borrando ${
              propio.borrados.comprobantes
            }.`}
          </Text>
        ) : null}
      </View>

      {cuenta ? (
        <View style={styles.tarjeta}>
          <Text variant="caption" color="textMuted">
            {`Tu cuenta de ${cuenta.plan}`}
          </Text>
          {/*
            La barra va ANTES que los números, y no es un adorno: es lo único de
            este panel que se entiende sin detenerse a leer. Los créditos son los
            que suspenden la cuenta, así que "cuánto falta para el límite" es la
            pregunta que el administrador viene a responder.
          */}
          <BarraDeUso
            porcentaje={cuenta.porcentajeUsado}
            accessibilityLabel={`Créditos usados de tu cuenta de ${cuenta.plan}`}
          />
          <Text variant="small" color="textMuted">
            {`${cuenta.creditosUsados} de ${cuenta.creditosDelPlan} créditos`}
          </Text>
          <Text variant="caption" color="textMuted">
            {`${formatBytes(cuenta.almacenamientoBytes)} guardados · ${formatBytes(
              cuenta.anchoDeBandaBytes,
            )} de tráfico · ${cuenta.recursos} archivos.`}
          </Text>
          {/* Puede ser de hasta diez minutos atrás: decirlo evita que alguien
              piense que el borrado no hizo efecto. */}
          <Text variant="caption" color="textMuted">
            {`Medido el ${formatFechaHora(cuenta.medidoEn)}.`}
          </Text>
        </View>
      ) : (
        /*
          Sin cuenta no se cae nada: lo de arriba sigue siendo exacto y es con lo
          que se decide. Lo que falta es el dato de los créditos, que son los que
          suspenden el store.
        */
        <View style={styles.tarjeta}>
          <View style={styles.conIcono}>
            <CloudOff size={ICON_SIZE} color={theme.colors.textMuted} />
            <View style={styles.textoDelIcono}>
              <Text variant="small" weight="medium">
                No pudimos leer tu cuenta del store
              </Text>
              <Text variant="caption" color="textMuted">
                O no está configurada, o no contestó. Lo de arriba sigue siendo exacto: es lo que
                subió esta app.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/*
        La diferencia entre lo que ve Cloudinary y lo que esta app sabe que subió
        son huérfanos: archivos que ningún aviso explica. Son bytes pagos que no
        le sirven a nadie, y hoy solo se limpian a mano desde la consola.
      */}
      {sinDuenio >= HUERFANOS_QUE_IMPORTAN ? (
        <View style={styles.aviso} accessible accessibilityRole="alert">
          <TriangleAlert size={ICON_SIZE} color={theme.colors.onWarningMuted} />
          <View style={styles.textoDelIcono}>
            <Text variant="caption" color="onWarningMuted">
              {`Hay ${sinDuenio} archivos en tu cuenta que ningún aviso explica. No se pueden borrar desde acá: se limpian desde la consola de Cloudinary.`}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bloques: { gap: theme.spacing.sm },

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
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    conIcono: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al ícono. */
    textoDelIcono: { flex: 1, gap: theme.spacing.xxs },

    aviso: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.lg,
    },
  });

export const ResumenDelStore = memo(ResumenDelStoreComponent);
