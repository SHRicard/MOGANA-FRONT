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
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import SearchX from 'lucide-react-native/icons/search-x';
import Tags from 'lucide-react-native/icons/tags';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { BorrarEspecieDialogo, EditorDeEspecieDialogo, EspecieItem } from '../components';
import { useBorrarEspecie, useCatalogoEspecies, useEditorDeEspecie } from '../hooks';
import { yaExisteEspecie, type Especie } from '../types';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

const keyExtractor = (especie: Especie) => especie.id;

/** Aire entre renglones: cada uno ya trae su borde, así que no va una línea más. */
const Separador = memo(function SeparadorComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
});

/**
 * El catálogo de especies (`docs/flujo_especies.md`): **con qué etiqueta se
 * agrupa lo que se vende**.
 *
 * Es la pantalla de mantenimiento. La otra mitad del catálogo —crear una especie
 * sin salir de la factura— no pasa por acá: viaja en el renglón que la necesita.
 *
 * Tres reglas que se ven en pantalla:
 *
 *  - **El catálogo arranca vacío.** No viene con nada cargado: las especies de
 *    una distribuidora de agua no son las de una tienda de ropa.
 *  - **Renombrar corrige también las facturas viejas.** La especie clasifica; lo
 *    que queda congelado en la factura es el producto y el precio.
 *  - **Solo se borra la que no se usó nunca.** El resto se renombra.
 *
 * Sin lógica de negocio: todo sale de los hooks de la feature.
 */
export function EspeciesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const catalogo = useCatalogoEspecies();
  const editor = useEditorDeEspecie();
  const borrado = useBorrarEspecie();
  const refresco = useRefrescar(catalogo.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Especie>) => (
      <EspecieItem
        especie={item}
        onRenombrar={editor.abrirRenombre}
        onBorrar={borrado.pedirBorrar}
      />
    ),
    [editor.abrirRenombre, borrado.pedirBorrar],
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
        value={catalogo.texto}
        onChangeText={catalogo.onTextoChange}
        placeholder="Buscar una especie"
        leftIcon={<Search size={ICON_SIZE} color={theme.colors.textMuted} />}
        onClear={catalogo.limpiarBusqueda}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Buscar una especie por nombre"
      />
      <Text variant="micro" color="textMuted">
        {catalogo.total === 1
          ? '1 especie en el catálogo'
          : `${catalogo.total} especies en el catálogo`}
      </Text>
    </View>
  );

  /**
   * Dos vacíos distintos: **con búsqueda** hay especies pero ninguna coincide, y
   * **sin búsqueda** el catálogo está realmente vacío — que es como arranca todo
   * negocio, no un error.
   */
  const vacio: ReactElement = catalogo.hayBusqueda ? (
    <EmptyState
      icon={<SearchX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Sin resultados"
      description={`No hay ninguna especie que coincida con "${catalogo.texto.trim()}".`}
      action={
        <Button label="Limpiar búsqueda" variant="secondary" onPress={catalogo.limpiarBusqueda} />
      }
    />
  ) : (
    <EmptyState
      icon={<Tags size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="El catálogo está vacío"
      description="Las especies son la etiqueta con la que agrupás lo que vendés: Gaseosa, Cerveza, Envío. También podés crearlas mientras cargás una factura."
      action={<Button label="Crear la primera" onPress={editor.abrirNueva} />}
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
            Especies
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Con qué agrupás lo que vendés
          </Text>
        </View>

        <Pressable
          onPress={editor.abrirNueva}
          style={({ pressed }) => [styles.headerAction, pressed && styles.presionado]}
          accessibilityRole="button"
          accessibilityLabel="Crear una especie"
        >
          <Plus size={ICON_SIZE} color={theme.colors.primary} />
        </Pressable>
      </View>

      {catalogo.sinPermiso ? (
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esta sección no es para tu cuenta"
          description={
            catalogo.mensajeError ?? 'El catálogo de especies lo maneja la administración.'
          }
        />
      ) : catalogo.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer el catálogo"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={catalogo.mensajeError}
          action={<Button label="Reintentar" onPress={catalogo.reintentar} />}
        />
      ) : catalogo.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={catalogo.especies}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          // El buscador solo con algo que buscar: con el catálogo vacío, el
          // cartel de abajo dice todo lo que hay que decir.
          ListHeaderComponent={catalogo.total > 0 ? header : null}
          ListEmptyComponent={vacio}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.spacing.xl },
          ]}
          refreshControl={refresco.control}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <EditorDeEspecieDialogo
        visible={editor.visible}
        esRenombre={editor.esRenombre}
        control={editor.control}
        // El aviso sale del catálogo que ya está en pantalla, sin ir a la API.
        // Renombrar cambiando solo las mayúsculas no es un choque consigo misma.
        repetida={yaExisteEspecie(catalogo.todas, editor.nombre, editor.especie?.id)}
        onGuardar={editor.guardar}
        onCancelar={editor.cerrar}
        guardando={editor.isSubmitting}
        mensajeError={editor.mensajeError}
      />

      <BorrarEspecieDialogo
        especie={borrado.especie}
        onConfirmar={borrado.confirmar}
        onCancelar={borrado.cancelar}
        borrando={borrado.isSubmitting}
        mensajeError={borrado.mensajeError}
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
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },
    presionado: { opacity: 0.6 },

    content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, flexGrow: 1 },

    filtros: { gap: theme.spacing.xs, paddingBottom: theme.spacing.md },

    separador: { height: theme.spacing.sm },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
