import { useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import FileText from 'lucide-react-native/icons/file-text';
import Search from 'lucide-react-native/icons/search';
import SearchX from 'lucide-react-native/icons/search-x';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { FiltroEstado } from '@/shared/ui/atoms/FiltroEstado';
import { Input } from '@/shared/ui/atoms/Input';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { ClienteFacturadoItem, OPCIONES_ESTADO_CUENTA, TotalesDeuda } from '../components';
import { useClientesConFacturas } from '../hooks';
import { ESTADO_CUENTA_LABEL, type ClienteFacturado } from '../types';

const keyExtractor = (cliente: ClienteFacturado) => cliente.clienteId;

/** Tamaño de la lupa del buscador. Acompaña al texto, no compite con él. */
const SEARCH_ICON_SIZE = 18;

/**
 * Aire entre renglones. Las filas ya se separan solas por el borde de cada
 * tarjeta, así que acá va espacio y no una línea: dos separadores encima uno del
 * otro es lo que hace que una lista se vea sucia.
 */
function Separador() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
}

/**
 * Tablero de facturación: **quién debe, cuánto y desde cuándo**
 * (`docs/flujo_pagos.md` §3). Es la pantalla de entrada del apartado.
 *
 * **Un renglón es un cliente con su cuenta entera**, no una factura: su deuda
 * total, cuántas le faltan pagar y el vencimiento más viejo de lo que debe. El
 * orden lo pone la API por urgencia, y los que están al día quedan al final.
 *
 * El clic lleva a la **cuenta del cliente**, que es donde está el detalle; desde
 * ahí se entra a cada factura a cobrar. Los clientes que todavía no tienen
 * ninguna factura no aparecen acá: esos están en "Más → Todos los clientes".
 *
 * El buscador y el filtro por estado los resuelve **la base**: `total`,
 * `paginas` y `totales` ya vienen contando lo filtrado.
 *
 * 🚧 No hay orden configurable ni filtro por monto o por fecha: el endpoint no
 * los tiene. Dibujarlos sería prometer algo que el backend no hace.
 */
export function ClientesFacturadosScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tablero = useClientesConFacturas();

  /**
   * Tirar para abajo vuelve a pedir la página que se está viendo, con los
   * filtros puestos: el tablero cambia solo con el tiempo —una factura se vence
   * al pasar el día— y esta es la forma de traer eso sin salir y volver a
   * entrar.
   */
  const refresco = useRefrescar(tablero.refrescar);

  /**
   * Al cambiar de página la lista vuelve arriba.
   *
   * Es lo que separa una tabla paginada de un scroll infinito: sin esto, tocar
   * "siguiente" deja la vista en la misma altura y el renglón de arriba de la
   * página nueva queda fuera de la pantalla, como si la lista siguiera. También
   * corre cuando cambia un filtro, porque el hook vuelve a la página 1.
   */
  const listaRef = useRef<FlatList<ClienteFacturado>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [tablero.pagina]);

  const verCuenta = useCallback(
    (cliente: ClienteFacturado) => {
      // El renglón es la cuenta del cliente, no una factura: el clic lleva a la
      // cuenta, que es donde está el detalle de esa deuda. De ahí se entra a
      // cada factura a cobrar.
      navigation.navigate(RootRoutes.CUENTA, {
        clienteId: cliente.clienteId,
        clienteNombre: cliente.nombre,
      });
    },
    [navigation],
  );

  const verTodosLosClientes = useCallback(() => {
    navigation.navigate(RootRoutes.USUARIOS);
  }, [navigation]);

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad, y eso anularía el `memo` de
   * cada renglón en cada paso de página.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ClienteFacturado>) => (
      <ClienteFacturadoItem cliente={item} onPress={verCuenta} />
    ),
    [verCuenta],
  );

  /**
   * Header y footer se pasan como **elementos**, no como componentes.
   *
   * ⚠️ Con una función inline, `FlatList` ve un tipo de componente nuevo en cada
   * render, desmonta el header y lo vuelve a montar: el input perdería el foco y
   * el teclado se cerraría a la primera letra.
   */
  const header: ReactElement = (
    <View style={styles.filtros}>
      {/* Cuánto hay para cobrar, del filtro ENTERO y no de la página: viene
          calculado del backend, así que no se suman los renglones que se ven. */}
      <TotalesDeuda totales={tablero.totales} hayFiltros={tablero.hayFiltros} />

      <Input
        value={tablero.texto}
        onChangeText={tablero.onTextoChange}
        placeholder="Buscá por nombre, DNI o email"
        leftIcon={<Search size={SEARCH_ICON_SIZE} color={theme.colors.textMuted} />}
        onClear={tablero.limpiarBusqueda}
        autoCapitalize="none"
        autoCorrect={false}
        // `search` en vez de "enter": la búsqueda ya sale sola con el debounce,
        // pero el teclado tiene que decir lo que el campo hace.
        returnKeyType="search"
        accessibilityLabel="Buscar clientes facturados por nombre, DNI o email"
      />
      <FiltroEstado
        label="Estado de la cuenta"
        opciones={OPCIONES_ESTADO_CUENTA}
        estado={tablero.estado}
        onChange={tablero.onEstadoChange}
      />
    </View>
  );

  /**
   * Dos vacíos distintos, y confundirlos manda a la persona a buscar un botón
   * que no existe: **con filtros** el tablero tiene datos pero ninguno coincide
   * —se ofrece limpiarlos—, y **sin filtros** todavía no hay ninguna factura
   * emitida en toda la app, así que se ofrece el camino para empezar. Ninguno de
   * los dos es un error: la API contesta `200` con `datos: []`.
   */
  const descripcionVacio = tablero.hayBusqueda
    ? tablero.estado
      ? `No hay clientes en estado "${ESTADO_CUENTA_LABEL[tablero.estado]}" que coincidan con "${
          tablero.busqueda
        }".`
      : `No hay clientes facturados que coincidan con "${tablero.busqueda}".`
    : tablero.estado
    ? `Ningún cliente tiene la cuenta en estado "${ESTADO_CUENTA_LABEL[tablero.estado]}".`
    : 'Acá van a aparecer los clientes a medida que les emitas facturas.';

  const vacio: ReactElement = tablero.hayFiltros ? (
    <EmptyState
      icon={<SearchX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Sin resultados"
      description={descripcionVacio}
      action={
        <Button label="Limpiar filtros" variant="secondary" onPress={tablero.limpiarFiltros} />
      }
    />
  ) : (
    <EmptyState
      icon={<FileText size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Todavía no facturaste a nadie"
      description={descripcionVacio}
      action={<Button label="Ver todos los clientes" onPress={verTodosLosClientes} />}
    />
  );

  // El total cuenta lo FILTRADO, así que el subtítulo lo dice: "2 clientes" con
  // el filtro de vencidas puesto son 2 con algo vencido, no 2 en total.
  const subtitulo =
    tablero.total > 0
      ? `${tablero.total} ${tablero.total === 1 ? 'cliente' : 'clientes'}${
          tablero.hayFiltros ? ' en el filtro' : ' facturados'
        }`
      : 'Quién debe, cuánto y desde cuándo';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTexts}>
          <Text variant="title" weight="semibold" accessibilityRole="header">
            Clientes
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitulo}
          </Text>
        </View>

        {/* Ocupa un lugar fijo para que el título no se mueva cuando el
            indicador aparece y desaparece. */}
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
        <EmptyState
          icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No tenés acceso a este apartado"
          description="Tu rol no permite ver la facturación."
        />
      ) : tablero.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer el tablero"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={tablero.mensajeError}
          action={<Button label="Reintentar" onPress={tablero.reintentar} />}
        />
      ) : tablero.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listaRef}
          data={tablero.clientes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          contentContainerStyle={styles.content}
          refreshControl={refresco.control}
          // Tocar un filtro con el teclado abierto tiene que funcionar a la
          // primera: sin esto, el primer toque solo cierra el teclado.
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/*
        El paginador va FUERA de la lista, fijo abajo: adentro había que bajar
        los veinte renglones para llegar a él, que es exactamente la sensación de
        scroll infinito que no queremos. Acá está siempre a la vista y hace de
        piso de la tabla — se ve dónde termina la página.

        Se dibuja solo cuando hay más de una: con una sola, la barra sería un
        borde vacío (`Paginacion` ya no devuelve nada, pero el marco quedaría).
      */}
      {tablero.paginas > 1 && (
        <View style={styles.pie}>
          <Paginacion
            pagina={tablero.pagina}
            paginas={tablero.paginas}
            onCambiar={tablero.irAPagina}
            accessibilityLabel="Páginas del tablero de facturación"
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
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    /** `flex: 1` para que el título se corte antes de empujar el indicador. */
    headerTexts: { flex: 1 },
    headerAction: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      // Aire chico: abajo ya no está la barra de tabs sino el paginador fijo, y
      // el hueco de 48 dejaba la tabla flotando arriba de él.
      paddingBottom: theme.spacing.md,
      // `flexGrow` para que el estado vacío se centre en la pantalla y no quede
      // pegado arriba.
      flexGrow: 1,
    },

    filtros: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },

    separador: { height: theme.spacing.sm },

    /**
     * Barra fija del paginador. Sin inset de abajo: esa franja ya la ocupa la
     * barra de tabs, que está justo debajo.
     */
    pie: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
