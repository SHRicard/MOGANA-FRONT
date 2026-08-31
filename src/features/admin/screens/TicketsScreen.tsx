import { memo, useCallback, useMemo, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import CalendarRange from 'lucide-react-native/icons/calendar-range';
import Lock from 'lucide-react-native/icons/lock';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Ruta profunda y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { MesTicketItem } from '../components';
import { useTicketsMeses } from '../hooks';
import type { MesTicket } from '../types';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

const keyExtractor = (mes: MesTicket) => mes.mes;

/** Aire entre tarjetas: cada una ya trae su borde, así que no va una línea más. */
const Separador = memo(function SeparadorComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
});

/**
 * El índice del apartado de tickets (`docs/flujo_metricas.md` §5.1): **qué meses
 * hay para mirar**.
 *
 * Va como una pantalla aparte y no como una sección del tablero de métricas, y
 * eso no es cuestión de gusto: en el tablero la deuda es **la de hoy** y acá es
 * **la del cierre de cada mes**. Mezclarlas es lo único de este apartado que
 * puede confundir de verdad, así que el aviso de arriba lo dice antes de que se
 * lea el primer número.
 *
 * Sin lógica de negocio: todo sale de `useTicketsMeses`.
 */
export function TicketsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const listado = useTicketsMeses();
  const refresco = useRefrescar(listado.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const verTicket = useCallback(
    (mes: MesTicket) => {
      navigation.navigate(RootRoutes.TICKET_MES, { mes: mes.mes });
    },
    [navigation],
  );

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad, y eso anularía el `memo` de
   * cada renglón.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MesTicket>) => <MesTicketItem mes={item} onPress={verTicket} />,
    [verTicket],
  );

  const header: ReactElement = (
    <View style={styles.aviso}>
      <Text variant="caption" color="textMuted">
        La deuda de cada mes es la que había al cerrarlo, no la de hoy. Por eso el ticket de julio
        sigue contando julio aunque después se haya cobrado.
      </Text>
    </View>
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
            Tickets por mes
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Qué pasó en cada mes
          </Text>
        </View>

        {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
        <View style={styles.headerAction}>
          {listado.isFetching && !listado.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando los meses"
            />
          )}
        </View>
      </View>

      {listado.sinPermiso ? (
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esta sección no es para tu cuenta"
          description={
            listado.mensajeError ?? 'Los tickets del negocio los ven solo los administradores.'
          }
        />
      ) : listado.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer los meses"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={listado.mensajeError}
          action={<Button label="Reintentar" onPress={listado.reintentar} />}
        />
      ) : listado.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={listado.meses}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          // Solo con meses: el aviso explica una columna que todavía no existe.
          ListHeaderComponent={listado.meses.length > 0 ? header : null}
          ListEmptyComponent={
            <EmptyState
              icon={<CalendarRange size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
              title="Todavía no hay meses que mirar"
              description="El primer ticket aparece con la primera factura: los meses arrancan cuando arranca el movimiento."
            />
          }
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.spacing.xl },
          ]}
          refreshControl={refresco.control}
        />
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
    headerTexts: { flex: 1, gap: theme.spacing.xxs },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      flexGrow: 1,
    },

    aviso: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.lg,
    },

    separador: { height: theme.spacing.sm },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
