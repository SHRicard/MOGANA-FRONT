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
import Boxes from 'lucide-react-native/icons/boxes';
import Lock from 'lucide-react-native/icons/lock';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  EspecieGlobalItem,
  FiltroOrden,
  RangoDeMeses,
  TarjetaFilas,
  type FilaDeDatos,
  type OpcionDeOrden,
} from '../components';
import { useProductosGlobales } from '../hooks';
import {
  ORDEN_PRODUCTO_AYUDA,
  ORDEN_PRODUCTO_LABEL,
  OrdenesDeProducto,
  textoParaLaMitad,
  textoUnidades,
  type EspecieGlobal,
  type OrdenDeProducto,
} from '../mercaderia';
import { formatTasa } from '../types';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/** Los seis órdenes, en el orden en que se ofrecen. */
const ORDENES: readonly OpcionDeOrden<OrdenDeProducto>[] = [
  OrdenesDeProducto.MONTO,
  OrdenesDeProducto.CANTIDAD,
  OrdenesDeProducto.CLIENTES,
  OrdenesDeProducto.CRECIMIENTO,
  OrdenesDeProducto.CAIDA,
  OrdenesDeProducto.OLVIDADAS,
].map((valor) => ({
  valor,
  label: ORDEN_PRODUCTO_LABEL[valor],
  ayuda: ORDEN_PRODUCTO_AYUDA[valor],
}));

const keyExtractor = (especie: EspecieGlobal) => especie.especieId;

/** Aire entre tarjetas: cada una ya trae su borde. */
const Separador = memo(function SeparadorComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
});

/**
 * La métrica global de productos (`docs/flujo_metricas.md` §6): de todo lo que
 * se vende, **qué manda y qué no se vende**.
 *
 * Es la tercera pantalla que mira mercadería y la única **no anclada al
 * calendario**: una especie que vende mucho pero cada tres meses se ve chica en
 * el ticket y en la tendencia, y acá se ve entera.
 *
 * ⚠️ **La lista arranca en el catálogo, no en las ventas**, así que trae también
 * lo que nadie compró nunca. Una lista de "lo más vendido" que esconde lo que no
 * se vende contesta media pregunta: el catálogo muerto es justamente lo que hay
 * que dejar de comprarle al proveedor.
 *
 * Sin lógica de negocio: todo sale de `useProductosGlobales`.
 */
export function ProductosScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const productos = useProductosGlobales();
  const refresco = useRefrescar(productos.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  // El Pareto solo se muestra con el orden por monto: es la única lista que va
  // de mayor a menor y donde el acumulado dibuja la curva.
  const porMonto = productos.orden === OrdenesDeProducto.MONTO;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<EspecieGlobal>) => (
      <EspecieGlobalItem especie={item} mostrarAcumulada={porMonto} />
    ),
    [porMonto],
  );

  const concentracion: readonly FilaDeDatos[] = productos.concentracion
    ? [
        {
          etiqueta: 'La mitad del negocio',
          valor: textoParaLaMitad(productos.concentracion.paraLaMitad),
          detalle: 'Cuántas especies hacen falta para llegar a la mitad',
          // Un negocio de una sola etiqueta es frágil: el día que falte ese
          // producto, falta el negocio entero.
          tono: productos.concentracion.paraLaMitad === 1 ? 'statusLate' : undefined,
        },
        {
          etiqueta: 'La más grande',
          valor: formatTasa(productos.concentracion.primera),
          detalle: `Las tres más grandes: ${formatTasa(productos.concentracion.tresPrimeras)}`,
        },
        {
          etiqueta: 'Sin vender',
          valor: `${productos.concentracion.sinVenta}`,
          detalle: 'Especies del catálogo que nadie compró en el período',
          tono: productos.concentracion.sinVenta > 0 ? 'statusSoon' : undefined,
        },
      ]
    : [];

  const header: ReactElement = (
    <View style={styles.filtros}>
      {productos.desde && productos.hasta && productos.meses !== undefined && (
        <RangoDeMeses
          desde={productos.desde}
          hasta={productos.hasta}
          meses={productos.meses}
          onCorrerDesde={productos.correrDesde}
          onCorrerHasta={productos.correrHasta}
          onVerTodo={productos.verTodo}
          hayFiltro={productos.hayFiltro}
        />
      )}

      {productos.totales && (
        <TarjetaFilas
          titulo="En el período"
          filas={[
            {
              etiqueta: 'Salieron',
              valor: textoUnidades(productos.totales.cantidad),
              detalle: `Por ${formatMonto(productos.totales.monto)}`,
            },
            {
              etiqueta: 'Especies con venta',
              valor: `${productos.totales.especiesConVenta} de ${productos.totales.especies}`,
              detalle: `${productos.totales.productos} productos distintos`,
            },
            {
              etiqueta: 'Clientes',
              valor: `${productos.totales.clientes}`,
              detalle: `${productos.totales.facturas} facturas`,
            },
          ]}
        />
      )}

      {concentracion.length > 0 && (
        <TarjetaFilas
          titulo="De cuántas cosas vive"
          filas={concentracion}
          nota="Es la lectura que nadie hace a mano y la que más rápido cambia una decisión de compra."
        />
      )}

      <FiltroOrden orden={productos.orden} opciones={ORDENES} onChange={productos.onOrdenChange} />

      <Text variant="micro" color="textMuted">
        La lista sale del catálogo, no de las ventas: lo que nunca se vendió aparece igual, y con
        "la que hace más que no se vende" va primero.
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
            Qué se vende
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Todo el período, de lo que más manda a lo que no sale
          </Text>
        </View>

        <View style={styles.headerAction}>
          {productos.isFetching && !productos.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando el ranking"
            />
          )}
        </View>
      </View>

      {productos.sinPermiso ? (
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esta sección no es para tu cuenta"
          description={
            productos.mensajeError ?? 'Las métricas del negocio las ven solo los administradores.'
          }
        />
      ) : productos.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer el ranking"
          description={productos.mensajeError}
          action={<Button label="Reintentar" onPress={productos.reintentar} />}
        />
      ) : productos.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={productos.especies}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon={<Boxes size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
              title="El catálogo está vacío"
              description="Cargá especies y facturá con ellas: acá vas a ver qué manda, qué crece y qué dejó de venderse."
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

    content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, flexGrow: 1 },
    filtros: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },

    separador: { height: theme.spacing.sm },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
