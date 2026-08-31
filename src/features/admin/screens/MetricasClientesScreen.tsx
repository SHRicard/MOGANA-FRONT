import { memo, useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
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
import Lock from 'lucide-react-native/icons/lock';
import Search from 'lucide-react-native/icons/search';
import SearchX from 'lucide-react-native/icons/search-x';
import Users from 'lucide-react-native/icons/users';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Ruta profunda y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Input } from '@/shared/ui/atoms/Input';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { FiltroOrden, MetricaClienteItem, type OpcionDeOrden } from '../components';
import { useMetricasClientes } from '../hooks';
import {
  ORDEN_AYUDA,
  ORDEN_LABEL,
  OrdenesMetricaCliente,
  type MetricaCliente,
  type OrdenMetricaCliente,
} from '../types';

/**
 * Los cinco órdenes, en el orden en que se ofrecen. Se arman acá y no adentro
 * del selector: el selector es genérico y lo comparten las tres listas del
 * panel.
 */
const ORDENES: readonly OpcionDeOrden<OrdenMetricaCliente>[] = [
  OrdenesMetricaCliente.FACTURADO,
  OrdenesMetricaCliente.DEUDA,
  OrdenesMetricaCliente.CUMPLIMIENTO,
  OrdenesMetricaCliente.FRECUENCIA,
  OrdenesMetricaCliente.INACTIVIDAD,
].map((valor) => ({ valor, label: ORDEN_LABEL[valor], ayuda: ORDEN_AYUDA[valor] }));

const ICON_SIZE = 20;
const SEARCH_ICON_SIZE = 18;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

const keyExtractor = (cliente: MetricaCliente) => cliente.clienteId;

/** Aire entre tarjetas: cada una ya trae su borde, así que no va una línea más. */
const Separador = memo(function SeparadorComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
});

/**
 * Métricas por cliente (`docs/flujo_metricas.md` §4): la misma pregunta que las
 * del negocio, pero **uno por uno**.
 *
 * ⚠️ **No reemplaza al tablero de facturación.** Son dos pantallas con dos
 * preguntas: el tablero contesta *a quién llamo hoy*, y esta *qué clase de
 * cliente es*. Un cliente puede deber cero y ser malísimo —compró una vez hace
 * un año— y otro puede deber plata y ser el mejor que tenés.
 *
 * El selector de orden es el corazón: el mismo listado ordenado por inactividad
 * es la lista de a quiénes llamar para recuperar, y por cumplimiento es la de a
 * quiénes cortarles el fiado.
 *
 * Tocar un renglón abre **su ficha** (`docs/flujo_metricas_cliente.md`): acá se
 * barre y se elige, y ahí adentro se entiende.
 *
 * Sin lógica de negocio: todo sale de `useMetricasClientes`.
 */
export function MetricasClientesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const listado = useMetricasClientes();
  const refresco = useRefrescar(listado.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * Al cambiar de página la lista vuelve arriba: sin esto, tocar "siguiente"
   * deja la vista a la misma altura y el primer renglón de la página nueva queda
   * fuera de la pantalla. También corre al cambiar el orden, porque el hook
   * vuelve a la página 1.
   */
  const listaRef = useRef<FlatList<MetricaCliente>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [listado.pagina]);

  const verFicha = useCallback(
    (cliente: MetricaCliente) => {
      /**
       * A la ficha de métricas (`docs/flujo_metricas_cliente.md`), que contesta
       * la misma pregunta que el renglón pero entera: de qué está hecha la tasa,
       * cuánto tarda cuando se atrasa y hace cuánto que no aparece.
       *
       * El listado tiene tres números por renglón a propósito —sirve para barrer
       * y elegir— y todo lo que no entra ahí vive adentro. Desde la ficha se
       * sigue a la cuenta corriente o a la ficha de la persona, que es donde
       * están las acciones.
       */
      navigation.navigate(RootRoutes.FICHA_CLIENTE, {
        clienteId: cliente.clienteId,
        clienteNombre: cliente.nombre,
      });
    },
    [navigation],
  );

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad, y eso anularía el `memo` de
   * cada renglón en cada paso de página.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MetricaCliente>) => (
      <MetricaClienteItem cliente={item} onPress={verFicha} />
    ),
    [verFicha],
  );

  /**
   * Se pasa como **elemento**, no como componente.
   *
   * ⚠️ Con una función inline, `FlatList` ve un tipo de componente nuevo en cada
   * render, desmonta el header y lo vuelve a montar: el input perdería el foco y
   * el teclado se cerraría a la primera letra.
   */
  const header: ReactElement = (
    <View style={styles.filtros}>
      <Input
        value={listado.texto}
        onChangeText={listado.onTextoChange}
        placeholder="Buscá por nombre, DNI o email"
        leftIcon={<Search size={SEARCH_ICON_SIZE} color={theme.colors.textMuted} />}
        onClear={listado.limpiarBusqueda}
        autoCapitalize="none"
        autoCorrect={false}
        // `search` en vez de "enter": la búsqueda sale sola con el debounce,
        // pero el teclado tiene que decir lo que el campo hace.
        returnKeyType="search"
        accessibilityLabel="Buscar clientes por nombre, DNI o email"
      />

      <FiltroOrden orden={listado.orden} opciones={ORDENES} onChange={listado.onOrdenChange} />
    </View>
  );

  /**
   * Dos vacíos distintos: **con búsqueda** hay clientes pero ninguno coincide, y
   * **sin búsqueda** todavía no se le facturó a nadie — este listado solo trae a
   * los que tienen al menos una factura, así que sin historial está vacío de
   * verdad. Ninguno de los dos es un error: la API contesta `200` con `datos: []`.
   */
  const vacio: ReactElement = listado.hayBusqueda ? (
    <EmptyState
      icon={<SearchX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Sin resultados"
      description={`No hay clientes con facturas que coincidan con "${listado.busqueda}".`}
      action={
        <Button label="Limpiar búsqueda" variant="secondary" onPress={listado.limpiarBusqueda} />
      }
    />
  ) : (
    <EmptyState
      icon={<Users size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Todavía no hay nada que medir"
      description="Acá van a aparecer los clientes a medida que les emitas facturas. Sin historial no hay métricas."
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
          <Text variant="title" weight="semibold" accessibilityRole="header">
            Métricas por cliente
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Tus clientes hoy
          </Text>
        </View>

        {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
        <View style={styles.headerAction}>
          {listado.isFetching && !listado.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando el listado"
            />
          )}
        </View>
      </View>

      {listado.sinPermiso ? (
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esta sección no es para tu cuenta"
          description={
            listado.mensajeError ?? 'Las métricas del negocio las ven solo los administradores.'
          }
        />
      ) : listado.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer el listado"
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
          ref={listaRef}
          data={listado.clientes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          contentContainerStyle={[
            styles.content,
            listado.paginas > 1 ? styles.contentConPie : styles.contentSinPie,
          ]}
          refreshControl={refresco.control}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/*
        El paginador va FUERA de la lista, fijo abajo: adentro habría que bajar
        todos los renglones para llegar a él. Se dibuja solo con más de una página.
      */}
      {listado.paginas > 1 && (
        <View style={[styles.pie, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
          <Paginacion
            pagina={listado.pagina}
            paginas={listado.paginas}
            onCambiar={listado.irAPagina}
            accessibilityLabel="Páginas del listado de clientes"
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
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },

    content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, flexGrow: 1 },
    contentSinPie: { paddingBottom: theme.spacing.lg },
    contentConPie: { paddingBottom: theme.spacing.md },

    filtros: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },

    separador: { height: theme.spacing.sm },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    pie: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
  });
