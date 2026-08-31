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
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import SearchX from 'lucide-react-native/icons/search-x';
import Send from 'lucide-react-native/icons/send';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { FiltroEstado } from '@/shared/ui/atoms/FiltroEstado';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { MiAvisoItem, OPCIONES_DE_MIS_AVISOS } from '../components';
import { useMisAvisos } from '../hooks';
import type { MiAvisoDePago } from '../types';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

const keyExtractor = (aviso: MiAvisoDePago) => aviso.id;

/** Aire entre avisos. Cada uno ya es una tarjeta con borde. */
function Separador() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
}

/**
 * **Mis avisos de pago** (`docs/user_cliente_flujo.md` §9): la pantalla que
 * contesta *"avisé que pagué, ¿en qué quedó?"*.
 *
 * Es la única que puede explicar por qué alguien avisó que pagó y le sigue
 * figurando la deuda, y eso descansa en tres datos que **no se recortan**: el
 * motivo del rechazo entero, lo que se anotó de verdad cuando no coincide con lo
 * informado, y el saldo de hoy de esa factura.
 */
export function MisAvisosScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const listado = useMisAvisos();
  const refresco = useRefrescar(listado.refrescar);

  /** Al cambiar de página la lista vuelve arriba, o la primera fila queda fuera. */
  const listaRef = useRef<FlatList<MiAvisoDePago>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [listado.pagina]);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const verFactura = useCallback(
    (aviso: MiAvisoDePago) => {
      // El aviso habla de una factura y el saldo que muestra es el de hoy: el
      // lugar donde eso se termina de entender es la factura misma.
      navigation.navigate(RootRoutes.MI_FACTURA, { facturaId: aviso.factura.id });
    },
    [navigation],
  );

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MiAvisoDePago>) => (
      <MiAvisoItem aviso={item} onPress={verFactura} />
    ),
    [verFactura],
  );

  const header: ReactElement = (
    <View style={styles.encabezado}>
      <FiltroEstado
        label="En qué quedaron"
        opciones={OPCIONES_DE_MIS_AVISOS}
        estado={listado.estado}
        onChange={listado.onEstadoChange}
      />
    </View>
  );

  const vacio: ReactElement = listado.hayFiltros ? (
    <EmptyState
      icon={<SearchX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="No hay avisos con ese filtro"
      description="Probá sacando el filtro para ver todos los tuyos."
      action={
        <Button
          label="Ver todos"
          variant="secondary"
          onPress={() => listado.onEstadoChange(null)}
        />
      }
    />
  ) : (
    <EmptyState
      icon={<Send size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Todavía no avisaste ningún pago"
      description="Cuando pagues una factura, avisanos desde su pantalla y acá vas a ver en qué quedó."
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
            Mis avisos de pago
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {listado.total > 0
              ? listado.total === 1
                ? '1 aviso'
                : `${listado.total} avisos`
              : 'En qué quedó cada uno'}
          </Text>
        </View>

        <View style={styles.headerAction}>
          {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
          {listado.isFetching && !listado.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando los avisos"
            />
          )}
        </View>
      </View>

      {listado.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer tus avisos"
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
          data={listado.avisos}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          contentContainerStyle={styles.content}
          refreshControl={refresco.control}
        />
      )}

      {listado.paginas > 1 && (
        <View style={styles.pie}>
          <Paginacion
            pagina={listado.pagina}
            paginas={listado.paginas}
            onCambiar={listado.irAPagina}
            accessibilityLabel="Páginas de mis avisos de pago"
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
    encabezado: { paddingBottom: theme.spacing.md },

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
