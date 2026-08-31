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
import Search from 'lucide-react-native/icons/search';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import UserSearch from 'lucide-react-native/icons/user-search';
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
import { FiltroRol, UsuarioItem } from '../components';
import { useListadoUsuarios } from '../hooks';
import { nombreUsuario, type Usuario } from '../types';

/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;
/** Tamaño de la lupa del buscador. Acompaña al texto, no compite con él. */
const SEARCH_ICON_SIZE = 18;

const keyExtractor = (usuario: Usuario) => usuario.id;

/**
 * Aire entre tarjetas. Las filas ya se separan solas por el borde de cada
 * tarjeta, así que acá va espacio y no una línea: dos separadores encima uno del
 * otro es lo que hace que una lista se vea sucia.
 */
const Separador = memo(function SeparadorComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
});

/**
 * Apartado Administrador: quién tiene cuenta en la app (`docs/s.roles.md`).
 *
 * **El alcance depende del rol**: el administrador ve clientes, el super admin
 * ve todas las cuentas y puede filtrar por rol. Es la misma pantalla — lo
 * resuelve `useListadoUsuarios` eligiendo el endpoint.
 *
 * Se llega desde el panel "Más", que solo muestra la fila para esos dos roles.
 * La pantalla igual maneja el `403`: esconder la fila es UI, no seguridad, y el
 * rol puede haber cambiado del otro lado (no viaja en el token).
 *
 * Cada fila abre la **ficha** de esa persona, que es desde donde se factura
 * (`docs/flujo_pagos.md`): una factura no existe sin la persona a la que se le
 * cobra, así que el flujo entero arranca eligiéndola acá.
 *
 * 🚧 Del resto sigue siendo **solo lectura**: crear, editar, desactivar y
 * cambiar el rol no tienen endpoint (el alta es `POST /auth/register`, que nace
 * con rol `cliente`, y los roles altos salen del seed del backend).
 */
export function UsuariosScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // La pantalla no calcula nada: todo (debounce, paginación, errores) sale del hook.
  const listado = useListadoUsuarios();

  /**
   * Al cambiar de página la lista vuelve arriba.
   *
   * Es lo que separa una lista paginada de un scroll infinito: sin esto, tocar
   * "siguiente" deja la vista a la misma altura y la primera fila de la página
   * nueva queda fuera de la pantalla, como si la lista siguiera. También corre
   * cuando cambia un filtro, porque el hook vuelve a la página 1.
   */
  const listaRef = useRef<FlatList<Usuario>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [listado.pagina]);

  /** Tirar para abajo vuelve a pedir la página actual, con los filtros puestos. */
  const refresco = useRefrescar(listado.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * Abrir la ficha. El nombre viaja como param —la fila ya lo tiene— para que la
   * pantalla de al lado tenga qué poner en el encabezado desde el primer frame,
   * mientras la cuenta se está trayendo.
   */
  const verCliente = useCallback(
    (usuario: Usuario) => {
      navigation.navigate(RootRoutes.CLIENTE, {
        clienteId: usuario.id,
        clienteNombre: nombreUsuario(usuario),
      });
    },
    [navigation],
  );

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad, y eso anularía el `memo` de
   * `UsuarioItem` en cada tecla del buscador.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Usuario>) => <UsuarioItem usuario={item} onVer={verCliente} />,
    [verCliente],
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
      <Input
        value={listado.texto}
        onChangeText={listado.onTextoChange}
        placeholder="Buscá por nombre, email o DNI"
        leftIcon={<Search size={SEARCH_ICON_SIZE} color={theme.colors.textMuted} />}
        onClear={listado.limpiarBusqueda}
        autoCapitalize="none"
        autoCorrect={false}
        // `search` en vez de "enter": la búsqueda ya sale sola con el debounce,
        // pero el teclado tiene que decir lo que el campo hace.
        returnKeyType="search"
        accessibilityLabel="Buscar cuentas por nombre, email o DNI"
      />
      {/* Solo el super admin ve más de un rol: para el administrador todas las
          filas son clientes y el filtro no separaría nada. */}
      {listado.puedeFiltrarPorRol && <FiltroRol rol={listado.rol} onChange={listado.onRolChange} />}
    </View>
  );

  /**
   * Vacío. Con búsqueda se nombra lo que se buscó y se ofrece limpiar; el filtro
   * de rol también puede dejar la lista en cero. Sin ningún filtro no debería
   * pasar nunca: quien mira está en su propia lista.
   */
  const descripcionVacio = listado.hayBusqueda
    ? `No hay cuentas que coincidan con "${listado.busqueda}".`
    : listado.hayFiltros
    ? 'Ninguna cuenta tiene el rol que elegiste.'
    : 'El listado llegó vacío.';

  const vacio: ReactElement = (
    <EmptyState
      icon={<UserSearch size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title={listado.hayFiltros ? 'Sin resultados' : 'No hay cuentas'}
      description={descripcionVacio}
      action={
        listado.hayFiltros ? (
          <Button label="Limpiar filtros" variant="secondary" onPress={listado.limpiarFiltros} />
        ) : undefined
      }
    />
  );

  /**
   * El total lo dice el encabezado y no la paginación: con una sola página la
   * paginación no se dibuja, y el dato igual tiene que estar en algún lado.
   */
  const subtitulo =
    listado.total > 0
      ? listado.total === 1
        ? '1 cuenta'
        : `${listado.total} cuentas`
      : 'Quién tiene cuenta en la app';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={volver}
          style={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </Pressable>

        <View style={styles.headerTexts}>
          <Text variant="title" weight="semibold" accessibilityRole="header">
            {listado.puedeFiltrarPorRol ? 'Cuentas' : 'Clientes'}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitulo}
          </Text>
        </View>

        {/*
          Ocupa el mismo lugar que el botón de volver para que el título quede
          quieto: el indicador aparece y desaparece con cada búsqueda.
        */}
        <View style={styles.headerAction}>
          {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
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
          icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No tenés acceso a este apartado"
          description="Tu rol no permite ver este listado."
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
          data={listado.usuarios}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          contentContainerStyle={[
            styles.content,
            // El aire de abajo lo pone la barra del paginador; cuando no está
            // —una sola página—, lo pone la lista, con el inset del sistema.
            listado.paginas > 1
              ? styles.contentConPie
              : { paddingBottom: insets.bottom + theme.spacing.lg },
          ]}
          refreshControl={refresco.control}
          // Tocar un filtro con el teclado abierto tiene que funcionar a la
          // primera: sin esto, el primer toque solo cierra el teclado.
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/*
        El paginador va FUERA de la lista, fijo abajo: adentro había que bajar
        todas las filas para llegar a él, que es exactamente la sensación de
        scroll infinito que no queremos. Acá está siempre a la vista y hace de
        piso de la lista — se ve dónde termina la página.

        Se dibuja solo cuando hay más de una: con una sola, la barra sería un
        borde vacío (`Paginacion` ya no devuelve nada, pero el marco quedaría).
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
      borderRadius: theme.radius.full,
    },
    /** `flex: 1` para que el título se corte antes de empujar el indicador. */
    headerTexts: { flex: 1 },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      // `flexGrow` para que el estado vacío se centre en la pantalla y no quede
      // pegado abajo del buscador.
      flexGrow: 1,
    },
    /** Con la barra abajo alcanza con un respiro: el inset lo pone la barra. */
    contentConPie: { paddingBottom: theme.spacing.md },
    filtros: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },

    separador: { height: theme.spacing.sm },

    /** La barra del paginador: hace de piso de la lista. */
    pie: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
