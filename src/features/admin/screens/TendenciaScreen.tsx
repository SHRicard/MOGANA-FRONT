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
import Lock from 'lucide-react-native/icons/lock';
import PackageSearch from 'lucide-react-native/icons/package-search';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto, nombreDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  EspecieDeTendenciaItem,
  FiltroOrden,
  SelectorDeMes,
  TarjetaMetrica,
  type OpcionDeOrden,
} from '../components';
import { useTendencia } from '../hooks';
import {
  ORDEN_TENDENCIA_AYUDA,
  ORDEN_TENDENCIA_LABEL,
  OrdenesDeTendencia,
  textoUnidades,
  type EspecieDeTendencia,
  type OrdenDeTendencia,
} from '../mercaderia';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/** Los cuatro órdenes, en el orden en que se ofrecen. */
const ORDENES: readonly OpcionDeOrden<OrdenDeTendencia>[] = [
  OrdenesDeTendencia.MONTO,
  OrdenesDeTendencia.CANTIDAD,
  OrdenesDeTendencia.CRECIMIENTO,
  OrdenesDeTendencia.CAIDA,
].map((valor) => ({
  valor,
  label: ORDEN_TENDENCIA_LABEL[valor],
  ayuda: ORDEN_TENDENCIA_AYUDA[valor],
}));

const keyExtractor = (especie: EspecieDeTendencia) => especie.especieId;

/** Aire entre tarjetas: cada una ya trae su borde. */
const Separador = memo(function SeparadorComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
});

/**
 * La tendencia de compra (`docs/flujo_metricas.md` §5): **qué se llevan los
 * clientes, mes a mes**.
 *
 * Es la única pantalla que no mira la plata sino la mercadería. El tablero dice
 * cuánto se facturó; esta dice *"este mes se llevaron 100 zapatillas y 10
 * remeras, y el mes pasado eran 60 y 40"*.
 *
 * ⚠️ **La lista trae también lo que no se vendió**: no es "lo que se vendió este
 * mes" sino todo lo que se movió en la ventana, con los números de este mes. Una
 * especie que se vendía siempre y este mes no aparece viene igual, en cero y con
 * el chip `parada` — y *"dejaron de llevar remeras"* es exactamente el dato que
 * esta pantalla tiene que dar.
 *
 * Sin lógica de negocio: todo sale de `useTendencia`.
 */
export function TendenciaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tendencia = useTendencia();
  const refresco = useRefrescar(tendencia.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const contra = tendencia.contra ? nombreDeMesApi(tendencia.contra) : 'el mes anterior';

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<EspecieDeTendencia>) => (
      <EspecieDeTendenciaItem especie={item} contra={contra} />
    ),
    [contra],
  );

  const header: ReactElement = (
    <View style={styles.filtros}>
      <SelectorDeMes
        mes={tendencia.mes}
        onAnterior={tendencia.mesAnterior}
        onSiguiente={tendencia.mesSiguiente}
        esUltimoMes={tendencia.esUltimoMes}
      />

      {/* El mes en curso todavía no terminó: compararlo con uno entero es
          comparar cualquier cosa, y acá el chip de cada especie sale de esa
          comparación. */}
      {tendencia.enCurso && (
        <View style={styles.aviso}>
          <Text variant="caption" color="onWarningMuted">
            El mes está en curso: las unidades son parciales y los chips se calculan contra un mes
            entero.
          </Text>
        </View>
      )}

      {tendencia.totales && (
        <View style={styles.fila}>
          <TarjetaMetrica
            etiqueta="Salieron"
            valor={textoUnidades(tendencia.totales.cantidad)}
            detalle={`${tendencia.totales.especies} ${
              tendencia.totales.especies === 1 ? 'especie' : 'especies'
            }`}
          />
          <TarjetaMetrica
            etiqueta="Fueron"
            valor={formatMonto(tendencia.totales.monto)}
            detalle={`${tendencia.totales.facturas} ${
              tendencia.totales.facturas === 1 ? 'factura' : 'facturas'
            }`}
          />
          <TarjetaMetrica
            etiqueta="Se lo llevaron"
            valor={`${tendencia.totales.clientes}`}
            detalle={tendencia.totales.clientes === 1 ? 'cliente' : 'clientes'}
          />
        </View>
      )}

      <FiltroOrden orden={tendencia.orden} opciones={ORDENES} onChange={tendencia.onOrdenChange} />

      <Text variant="micro" color="textMuted">
        La lista trae todo lo que se movió en el último año, no solo lo de este mes: la que dejó de
        venderse aparece en cero.
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
            Qué se llevan
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            La mercadería, mes a mes
          </Text>
        </View>

        <View style={styles.headerAction}>
          {tendencia.isFetching && !tendencia.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando la tendencia"
            />
          )}
        </View>
      </View>

      {tendencia.sinPermiso ? (
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esta sección no es para tu cuenta"
          description={
            tendencia.mensajeError ?? 'Las métricas del negocio las ven solo los administradores.'
          }
        />
      ) : tendencia.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer la tendencia"
          description={tendencia.mensajeError}
          action={<Button label="Reintentar" onPress={tendencia.reintentar} />}
        />
      ) : tendencia.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tendencia.especies}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon={<PackageSearch size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
              title="Todavía no hay nada que mirar"
              description="Acá va a aparecer qué se llevan tus clientes a medida que factures con especies cargadas."
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

    /** Las tarjetas chicas, repartidas en partes iguales. */
    fila: { flexDirection: 'row', gap: theme.spacing.sm },

    aviso: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.lg,
    },

    separador: { height: theme.spacing.sm },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
