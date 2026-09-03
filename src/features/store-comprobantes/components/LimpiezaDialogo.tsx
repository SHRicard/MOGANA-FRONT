import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Text } from '@/shared/ui/atoms/Text';
import { formatBytes, formatFecha, formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { noHayNadaQueBorrar, type LimpiezaHecha, type VistaPreviaDeLimpieza } from '../types';

export interface LimpiezaDialogoProps {
  /** Lo que se llevaría, o `null` si todavía no se miró. */
  previa: VistaPreviaDeLimpieza | null;
  /** El resultado del borrado, o `null`. Reemplaza a la previa cuando llega. */
  hecho: LimpiezaHecha | null;
  onBorrar: () => void;
  onCerrar: () => void;
  borrando: boolean;
  /** `true` con el `409`: el número cambió y hay que volver a mirar. */
  hayQueVolverAMirar: boolean;
  mensajeError: string | null;
}

/** Qué proporción de la pantalla puede ocupar el cuerpo, que trae una muestra. */
const ALTO_MAXIMO = 0.5;

/**
 * **Lo que la limpieza se va a llevar, antes de llevárselo**
 * (`MORGANA-BACK/docs/flujo_comprobantes.md` §5.3 y §5.4).
 *
 * ⚠️ Este diálogo **es la guarda**, no un trámite. El borrado no se puede
 * deshacer, y el número que se confirma acá es el que viaja como
 * `comprobantesEsperados`: si entre que se abre y se aprieta cambió algo, el
 * backend contesta `409` y hay que volver a mirar.
 *
 * Muestra tres cosas que el doc pide expresamente, y cada una ataja un problema
 * distinto:
 *
 * 1. **El cartel entero** — cuántos, cuánto pesan, de qué fechas y de cuántos
 *    clientes. Es la diferencia entre "borrá lo viejo" y saber qué se borra.
 * 2. **Los protegidos, en voz alta** — los pendientes que quedan afuera. Un
 *    número que aparece sin explicación se lee como un bug, y quien mira va a
 *    pensar que la limpieza no funcionó.
 * 3. **La muestra** — los cinco más viejos y los cinco más nuevos que se irían.
 *    Es lo que permite darse cuenta de que el filtro no es el que se quiso
 *    **antes** de apretar, y no después.
 */
export function LimpiezaDialogo({
  previa,
  hecho,
  onBorrar,
  onCerrar,
  borrando,
  hayQueVolverAMirar,
  mensajeError,
}: LimpiezaDialogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height } = useWindowDimensions();

  // Ya se borró: lo que va es el resumen de lo que pasó, no volver a confirmar.
  if (hecho) {
    return (
      <Dialogo
        visible
        onClose={onCerrar}
        tono="exito"
        icono={<CircleCheck size={DIALOGO_ICON_SIZE} color={theme.colors.success} />}
        titulo="Listo"
        descripcion={`Se borraron ${hecho.borrados} ${
          hecho.borrados === 1 ? 'comprobante' : 'comprobantes'
        } y liberaste ${formatBytes(hecho.bytesLiberados)}.`}
        acciones={[{ label: 'Cerrar', onPress: onCerrar }]}
      >
        <View style={styles.cuerpo}>
          {/*
            ⚠️ Se lleva hasta 500 por pasada. No se reintenta solo: se dice
            cuántos quedan y se vuelve a apretar. Automatizarlo sería hacer sola
            justo la parte que tiene que decidir alguien con el número delante.
          */}
          {hecho.restan > 0 ? (
            <View style={styles.nota}>
              <Text variant="small">
                {`Quedan ${hecho.restan} para la próxima pasada: se borran hasta 500 por vez. Volvé a apretar el mismo botón para seguir.`}
              </Text>
            </View>
          ) : null}

          {/*
            Los que no se pudieron soltar. Quedan sin marcar a propósito del lado
            del backend, así la próxima pasada los agarra.
          */}
          {hecho.fallados > 0 ? (
            <Text variant="caption" color="textMuted">
              {`${hecho.fallados} no se pudieron borrar y quedaron para el próximo intento.`}
            </Text>
          ) : null}
        </View>
      </Dialogo>
    );
  }

  if (!previa) {
    return null;
  }

  const vacia = noHayNadaQueBorrar(previa);

  return (
    <Dialogo
      visible
      onClose={onCerrar}
      // No se cierra tocando el fondo: se sale eligiendo. Lo que está en juego
      // son archivos que no vuelven.
      cerrarAlTocarFondo={false}
      tono="peligro"
      icono={<Trash2 size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
      titulo={vacia ? 'No hay nada para borrar' : 'Esto no se puede deshacer'}
      descripcion={
        vacia
          ? 'Con ese criterio no entra ningún comprobante.'
          : `Vas a borrar ${previa.comprobantes} ${
              previa.comprobantes === 1 ? 'comprobante' : 'comprobantes'
            } (${formatBytes(previa.bytes)}), de ${previa.clientes} ${
              previa.clientes === 1 ? 'cliente' : 'clientes'
            }.`
      }
      acciones={
        vacia
          ? [{ label: 'Cerrar', onPress: onCerrar }]
          : [
              {
                label: `Borrar ${previa.comprobantes}`,
                onPress: onBorrar,
                variant: 'danger',
                loading: borrando,
                disabled: borrando || hayQueVolverAMirar,
              },
              {
                label: 'Cancelar',
                onPress: onCerrar,
                variant: 'secondary',
                disabled: borrando,
              },
            ]
      }
    >
      <ScrollView style={{ maxHeight: height * ALTO_MAXIMO }} contentContainerStyle={styles.cuerpo}>
        {!vacia && previa.desde && previa.hasta ? (
          <Text variant="small" color="textMuted">
            {`Del ${formatFecha(previa.desde.slice(0, 10))} al ${formatFecha(
              previa.hasta.slice(0, 10),
            )}.`}
          </Text>
        ) : null}

        {/*
          ⚠️ Los protegidos se dicen EN VOZ ALTA. Sin esto, el que esperaba
          liberar 49 MB y liberó 47 no tiene dónde enterarse de por qué.
        */}
        {previa.protegidos.pendientes > 0 ? (
          <View style={styles.protegidos}>
            <Text variant="caption" color="onWarningMuted">
              {`${previa.protegidos.pendientes} ${
                previa.protegidos.pendientes === 1 ? 'aviso' : 'avisos'
              } sin resolver ${
                previa.protegidos.pendientes === 1 ? 'queda' : 'quedan'
              } afuera (${formatBytes(
                previa.protegidos.bytes,
              )}): su comprobante es con lo que todavía hay que decidir.`}
            </Text>
          </View>
        ) : null}

        {previa.porEstado.length > 0 ? (
          <View style={styles.detalle}>
            {previa.porEstado.map((fila) => (
              <Text key={fila.estado} variant="caption" color="textMuted">
                {`${fila.comprobantes} de avisos ${fila.estado}s · ${formatBytes(fila.bytes)}`}
              </Text>
            ))}
          </View>
        ) : null}

        {/*
          La muestra: los cinco más viejos y los cinco más nuevos. Es lo que deja
          darse cuenta de que el filtro no es el que se quiso ANTES de apretar.
        */}
        {previa.muestra.length > 0 ? (
          <View style={styles.detalle}>
            <Text variant="caption" weight="medium">
              Algunos de los que se van
            </Text>
            {previa.muestra.map((uno) => (
              <Text key={uno.avisoId} variant="caption" color="textMuted" numberOfLines={1}>
                {`#${uno.facturaNumero} · ${uno.cliente ?? 'sin nombre'} · ${formatFechaHora(
                  uno.informadoEn,
                )}`}
              </Text>
            ))}
          </View>
        ) : null}

        {/*
          El 409: se resolvió un aviso entre que se abrió el cartel y se apretó.
          No es un error de red — es la guarda haciendo su trabajo.
        */}
        {hayQueVolverAMirar ? (
          <View style={styles.error} accessible accessibilityRole="alert">
            <Text variant="small" color="error">
              Cambió el número mientras mirabas. Cerrá y volvé a mirar antes de borrar.
            </Text>
          </View>
        ) : mensajeError ? (
          <View style={styles.error} accessible accessibilityRole="alert">
            <Text variant="small" color="error">
              {mensajeError}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Dialogo>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /** Va en `contentContainerStyle`: el `gap` separa los hijos, no la lista. */
    cuerpo: { gap: theme.spacing.sm, paddingBottom: theme.spacing.xs },
    detalle: { gap: theme.spacing.xxs },

    protegidos: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.md,
    },
    nota: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: theme.radius.md,
    },
    error: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
    },
  });
