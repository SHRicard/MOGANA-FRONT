import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Ruta profunda y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import {
  TarjetaDeActividad,
  TarjetaDeCuentas,
  TarjetaDelServidor,
  TarjetaDelStore,
} from '../components';
import { useResumenDelSistema } from '../hooks';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * **El tablero del sistema** (`docs/README_FRONT_SUPER_ADMIN.md` §3).
 *
 * ⚠️ **Acá no hay un solo número de plata, y es a propósito.** Lo facturado y lo
 * cobrado los contesta el panel del negocio (`GET /api/admin/metricas`); tener
 * dos pantallas con los mismos números calculados distinto termina siempre en
 * dos números que no coinciden y nadie sabe cuál creer.
 *
 * ⚠️ **La pantalla se dibuja aunque el store venga en `null`.** El super admin
 * entró justamente a ver si el sistema está bien: una pantalla en blanco porque
 * un tercero está lento es lo peor que se le puede dar.
 */
export function SistemaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tablero = useResumenDelSistema();

  /** Tirar para abajo vuelve a pedir el tablero. */
  const refresco = useRefrescar(tablero.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * El panel del store, que es donde se libera de verdad. Este tablero solo
   * dice cuánto hay: repetir sus acciones sería tener dos lugares desde los que
   * se borran archivos.
   */
  const verElStore = useCallback(
    () => navigation.navigate(RootRoutes.STORE_COMPROBANTES),
    [navigation],
  );

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
          <Text variant="title" weight="semibold" accessibilityRole="header">
            Estado del sistema
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Cómo está la instalación, no cómo va el negocio
          </Text>
        </View>

        {/* Ocupa el mismo lugar que el botón de volver para que el título quede
            quieto cuando el indicador aparece y desaparece. */}
        <View style={styles.headerAction}>
          {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
          {tablero.isFetching && !tablero.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando el tablero"
            />
          )}
        </View>
      </View>

      {tablero.sinPermiso ? (
        /*
          El 403 merece pantalla propia y no un toast: significa que la app
          mostró algo que no correspondía, y un toast lo esconde.
        */
        <EmptyState
          icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No tenés acceso a este panel"
          description="Este tablero es del super admin. Tu rol no alcanza."
        />
      ) : tablero.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer el tablero"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={tablero.mensajeError}
          action={<Button label="Reintentar" onPress={tablero.reintentar} />}
        />
      ) : tablero.isLoading || !tablero.resumen ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.spacing.xxl },
          ]}
          refreshControl={refresco.control}
        >
          <TarjetaDeCuentas
            cuentas={tablero.resumen.cuentas}
            altas={tablero.resumen.altas}
          />
          <TarjetaDeActividad actividad={tablero.resumen.actividad} />
          <TarjetaDelStore store={tablero.resumen.store} onVerElStore={verElStore} />
          <TarjetaDelServidor
            servidor={tablero.resumen.servidor}
            hoy={tablero.resumen.hoy}
            relojDesfasado={tablero.relojDesfasado}
          />
        </ScrollView>
      )}
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
    },
    /** `flex: 1` para que el título se corte antes de empujar el indicador. */
    headerTexts: { flex: 1, gap: theme.spacing.xxs },

    content: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
