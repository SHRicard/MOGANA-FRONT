import { useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import FileText from 'lucide-react-native/icons/file-text';
import SearchX from 'lucide-react-native/icons/search-x';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { FiltroEstado } from '@/shared/ui/atoms/FiltroEstado';
import { FiltroFechas } from '@/shared/ui/atoms/FiltroFechas';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { MiFacturaItem, OPCIONES_DE_MIS_FACTURAS } from '../components';
import { useMisFacturas } from '../hooks';
import type { MiFacturaDeLaLista } from '../types';

type MisFacturasRoute = RouteProp<RootStackParamList, typeof RootRoutes.MIS_FACTURAS>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

const keyExtractor = (factura: MiFacturaDeLaLista) => factura.id;

/** Aire entre facturas. Cada una ya es una tarjeta con borde. */
function Separador() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
}

/**
 * **Mis facturas** (`docs/user_cliente_flujo.md` §5): la lista de todo lo que me
 * facturaron, la última primero.
 *
 * ⚠️ **Los filtros filtran la lista, no lo que debo.** El resumen del inicio es
 * siempre el de la cuenta entera: mirar solo las vencidas no puede cambiar
 * cuánto se debe. Por eso esta pantalla **no muestra la deuda arriba** — sería
 * el único lugar donde el número podría parecer que cambia al filtrar.
 *
 * ⚠️ **El rango de fechas es por emisión, no por vencimiento**: contesta "qué me
 * facturaron en julio". Para "qué está vencido" está el estado.
 *
 * Los dos vacíos son distintos y confundirlos manda a buscar facturas que no se
 * perdieron: *"no hay con este filtro"* invita a sacarlo, *"todavía no tenés"*
 * no (§15).
 */
export function MisFacturasScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<MisFacturasRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // El filtro inicial solo llega desde el aviso de deuda vencida de la
  // campanita, que lleva directo a lo que ya venció (§11).
  const listado = useMisFacturas(params?.estado ?? null);
  const refresco = useRefrescar(listado.refrescar);

  /** Al cambiar de página la lista vuelve arriba, o la primera fila queda fuera. */
  const listaRef = useRef<FlatList<MiFacturaDeLaLista>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [listado.pagina]);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const verFactura = useCallback(
    (factura: MiFacturaDeLaLista) => {
      navigation.navigate(RootRoutes.MI_FACTURA, { facturaId: factura.id });
    },
    [navigation],
  );

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MiFacturaDeLaLista>) => (
      <MiFacturaItem factura={item} onPress={verFactura} />
    ),
    [verFactura],
  );

  const header: ReactElement = (
    <View style={styles.encabezado}>
      <View style={styles.tituloLista}>
        <Text variant="body" weight="semibold">
          {listado.hayFiltros ? 'Con este filtro' : 'Todas'}
        </Text>
        {listado.total > 0 && (
          <Text variant="caption" color="textMuted">
            {listado.total === 1 ? '1 factura' : `${listado.total} facturas`}
          </Text>
        )}
      </View>

      <View style={styles.filtros}>
        <FiltroEstado
          label="Estado"
          opciones={OPCIONES_DE_MIS_FACTURAS}
          estado={listado.estado}
          onChange={listado.onEstadoChange}
        />
        <FiltroFechas
          label="Emitidas"
          desde={listado.desde}
          hasta={listado.hasta}
          onDesdeChange={listado.onDesdeChange}
          onHastaChange={listado.onHastaChange}
        />
      </View>
    </View>
  );

  const vacio: ReactElement = listado.hayFiltros ? (
    <EmptyState
      icon={<SearchX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="No hay facturas con ese filtro"
      description="Probá sacando el filtro para ver todas las tuyas."
      action={
        <Button label="Limpiar filtros" variant="secondary" onPress={listado.limpiarFiltros} />
      }
    />
  ) : (
    <EmptyState
      icon={<FileText size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Todavía no tenés facturas"
      description="Cuando te emitamos la primera, la vas a ver acá con su vencimiento y cuánto queda por pagar."
    />
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
          <Text variant="title" weight="semibold" accessibilityRole="header" numberOfLines={1}>
            Mis facturas
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Todo lo que te facturamos
          </Text>
        </View>

        <View style={styles.headerAction}>
          {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
          {listado.isFetching && !listado.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando las facturas"
            />
          )}
        </View>
      </View>

      {listado.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer tus facturas"
          description={listado.mensajeError}
          action={<Button label="Reintentar" onPress={listado.reintentar} />}
        />
      ) : listado.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listaRef}
          data={listado.facturas}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          contentContainerStyle={styles.content}
          refreshControl={refresco.control}
        />
      )}

      {/* El paginador fijo abajo: se ve dónde termina la página en vez de tener
          que scrollear hasta el final. */}
      {listado.paginas > 1 && (
        <View style={styles.pie}>
          <Paginacion
            pagina={listado.pagina}
            paginas={listado.paginas}
            onCambiar={listado.irAPagina}
            accessibilityLabel="Páginas de mis facturas"
          />
        </View>
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
      borderRadius: theme.radius.full,
    },
    /** `flex: 1` para que el título se corte antes de empujar el indicador. */
    headerTexts: { flex: 1 },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    encabezado: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
    tituloLista: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    filtros: { gap: theme.spacing.md },

    separador: { height: theme.spacing.sm },

    pie: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
