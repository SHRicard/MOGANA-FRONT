import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Images from 'lucide-react-native/icons/images';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { LimpiezaDialogo, ResumenDelStore, TramosDelStore } from '../components';
import { useStoreDeComprobantes } from '../hooks';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * **El panel del store de comprobantes**
 * (`MORGANA-BACK/docs/flujo_comprobantes.md` §5).
 *
 * Responde una pregunta —*¿cuánto estoy ocupando y qué puedo tirar?*— y ofrece
 * una sola acción, que **borra archivos y no se puede deshacer**.
 *
 * Por eso la limpieza es de tres pasos y el del medio no se puede saltear:
 *
 * 1. se elige un tramo de antigüedad;
 * 2. **se mira qué se llevaría** — cuántos, cuánto pesan, de qué fechas, de
 *    cuántos clientes, y cuáles quedan afuera por estar sin resolver;
 * 3. recién ahí se borra, y el número que se confirmó viaja al backend para que
 *    lo verifique: si cambió en el medio, contesta `409` y hay que volver a
 *    mirar.
 *
 * ⚠️ **No hay limpieza automática, y es a propósito.** Nada se borra solo por el
 * paso del tiempo: la retención es una decisión de negocio que cambia, y un cron
 * que ya borró no deja arrepentirse.
 *
 * ⚠️ Nada de esto lo ve el cliente. Que su comprobante se haya borrado sí lo ve
 * —en su propio aviso, con el motivo—, pero cuánto ocupa el store y quién lo
 * limpia es del negocio.
 */
export function StoreDeComprobantesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const store = useStoreDeComprobantes();
  const refresco = useRefrescar(store.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const verLista = useCallback(() => {
    navigation.navigate(RootRoutes.COMPROBANTES_DEL_STORE);
  }, [navigation]);

  /** El botón de cada tramo **no borra**: abre la vista previa. */
  const mirar = useCallback((meses: number) => store.mirar({ meses }), [store]);

  const consumo = store.consumo;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={volver}
          style={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={ICON_SIZE} color={theme.colors.text} />
        </Pressable>

        <View style={styles.headerTexts}>
          <Text variant="title" weight="semibold" accessibilityRole="header" numberOfLines={1}>
            Comprobantes guardados
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Cuánto ocupan y qué podés liberar
          </Text>
        </View>

        <View style={styles.headerAction}>
          {store.isFetching && !store.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando el consumo"
            />
          )}
        </View>
      </View>

      {store.sinPermiso ? (
        <EmptyState
          icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No tenés acceso a este apartado"
          description="Solo administración puede ver y limpiar el store."
        />
      ) : store.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer el consumo"
          description={store.mensajeError}
          action={<Button label="Reintentar" onPress={store.reintentar} />}
        />
      ) : store.isLoading || !consumo ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={refresco.control}>
          <ResumenDelStore consumo={consumo} />

          <View style={styles.seccion}>
            <Text variant="body" weight="semibold">
              Por antigüedad
            </Text>
            <Text variant="caption" color="textMuted">
              El botón dice lo que se libera de verdad: los avisos sin resolver no se tocan.
            </Text>
            <TramosDelStore
              tramos={consumo.propio.porAntiguedad}
              onMirar={mirar}
              deshabilitado={store.mirando || store.borrando}
            />
          </View>

          {consumo.propio.porEstado.length > 0 ? (
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Por estado del aviso
              </Text>
              <View style={styles.porEstado}>
                {consumo.propio.porEstado.map((fila) => (
                  <View key={fila.estado} style={styles.filaEstado}>
                    <Text variant="small">{fila.estado}</Text>
                    <Text variant="small" color="textMuted">
                      {`${fila.comprobantes}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <Button
            label="Ver los comprobantes uno por uno"
            variant="secondary"
            leftIcon={<Images size={ICON_SIZE} color={theme.colors.primary} />}
            onPress={verLista}
            fullWidth
          />

          {/* Mientras se pide la previa: el botón ya está apagado, pero el
              spinner dice que algo está pasando. */}
          {store.mirando ? (
            <View style={styles.centrado}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null}

          {/* La previa falló y ni se abrió el cartel: el error va acá. */}
          {store.mensajeErrorLimpieza && !store.previa && !store.hecho ? (
            <View style={styles.error} accessible accessibilityRole="alert">
              <Text variant="small" color="error">
                {store.mensajeErrorLimpieza}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/*
        Hermano del scroll y no adentro: es una view absoluta —no un `Modal`, que
        no hereda el edge-to-edge— así que tiene que colgar de la raíz.
      */}
      <LimpiezaDialogo
        previa={store.previa}
        hecho={store.hecho}
        onBorrar={store.borrar}
        onCerrar={store.cancelar}
        borrando={store.borrando}
        hayQueVolverAMirar={store.hayQueVolverAMirar}
        mensajeError={store.mensajeErrorLimpieza}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerAction: {
      width: HEADER_ACTION_SIZE,
      height: HEADER_ACTION_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
    /** `flex: 1` para que el título se corte antes de empujar lo que sigue. */
    headerTexts: { flex: 1 },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    seccion: { gap: theme.spacing.sm },

    porEstado: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      gap: theme.spacing.xs,
    },
    filaEstado: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    error: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
