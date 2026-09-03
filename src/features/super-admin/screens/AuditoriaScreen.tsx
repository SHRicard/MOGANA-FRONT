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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { Chip } from '@/shared/ui/atoms/Chip';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { AuditoriaItem } from '../components';
import { useAuditoria } from '../hooks';
import type { RenglonDeAuditoria } from '../types';

type AuditoriaRoute = RouteProp<RootStackParamList, typeof RootRoutes.AUDITORIA>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

const keyExtractor = (renglon: RenglonDeAuditoria) => renglon.id;

/** Aire entre tarjetas: las filas ya se separan solas por el borde de cada una. */
const Separador = memo(function SeparadorComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
});

/**
 * **El historial de los cambios de rol**
 * (`docs/README_FRONT_SUPER_ADMIN.md` §7).
 *
 * ⚠️ **De solo lectura, y no por falta de tiempo**: no existe el endpoint para
 * escribir ni para borrar, y es la mitad del punto — un registro que la app
 * puede reescribir no prueba nada. Por eso acá no hay ninguna acción.
 *
 * Se entra de dos formas: entera desde el panel, o **filtrada por una cuenta**
 * desde su ficha. La segunda es de donde sale la mitad del valor de la pantalla;
 * la lista completa se mira una vez por mes.
 */
export function AuditoriaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<AuditoriaRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const historial = useAuditoria(params?.objetivoId);

  /**
   * Al cambiar de página la lista vuelve arriba. Es lo que separa una lista
   * paginada de un scroll infinito: sin esto, "siguiente" deja la vista a la
   * misma altura y el primer renglón nuevo queda fuera de la pantalla.
   */
  const listaRef = useRef<FlatList<RenglonDeAuditoria>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [historial.pagina]);

  /** Tirar para abajo vuelve a pedir la página actual, con los filtros puestos. */
  const refresco = useRefrescar(historial.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * Tocar un renglón abre la ficha de la cuenta a la que le pasó: es la pregunta
   * que sigue a leerlo ("¿y cómo está ahora?").
   */
  const verCuenta = useCallback(
    (cuentaId: string, nombre: string) =>
      navigation.navigate(RootRoutes.CUENTA_DEL_SISTEMA, {
        cuentaId,
        cuentaNombre: nombre,
      }),
    [navigation],
  );

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad, y eso anularía el `memo` de
   * `AuditoriaItem`.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RenglonDeAuditoria>) => (
      <AuditoriaItem renglon={item} onVerCuenta={verCuenta} />
    ),
    [verCuenta],
  );

  /**
   * El filtro por acción **se arma desde los datos**, no de una lista escrita a
   * mano: hoy hay una sola acción y el hook devuelve vacío, así que ni se
   * dibuja. El día que haya más, aparece solo.
   *
   * Header y footer se pasan como **elementos**, no como componentes: con una
   * función inline `FlatList` ve un tipo nuevo en cada render y lo desmonta.
   */
  const header: ReactElement | null =
    historial.acciones.length > 0 ? (
      <View style={styles.filtros}>
        {historial.acciones.map((opcion) => (
          <Chip
            key={opcion.label}
            label={opcion.label}
            selected={historial.accion === opcion.value}
            onPress={() => historial.onAccionChange(opcion.value)}
            accessibilityLabel={`Filtrar por ${opcion.label}`}
          />
        ))}
      </View>
    ) : null;

  const vacio: ReactElement = (
    <EmptyState
      icon={<ScrollText size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title={historial.deUnaCuenta ? 'Sin cambios de rol' : 'El historial está vacío'}
      description={
        historial.deUnaCuenta
          ? 'A esta cuenta nunca le cambiaron el rol.'
          : 'Todavía no le cambiaron el rol a nadie. Cuando pase, cada cambio deja acá un renglón que no se puede editar ni borrar.'
      }
    />
  );

  /**
   * El total lo dice el encabezado y no la paginación: con una sola página la
   * paginación no se dibuja, y el dato igual tiene que estar en algún lado.
   */
  const subtitulo = historial.deUnaCuenta
    ? params?.objetivoNombre
      ? `Los cambios de ${params.objetivoNombre}`
      : 'Los cambios de esta cuenta'
    : historial.total === 1
    ? '1 cambio registrado'
    : `${historial.total} cambios registrados`;

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
            Historial
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitulo}
          </Text>
        </View>

        {/* Ocupa el mismo lugar que el botón de volver para que el título quede
            quieto cuando el indicador aparece y desaparece. */}
        <View style={styles.headerAction}>
          {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
          {historial.isFetching && !historial.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando el historial"
            />
          )}
        </View>
      </View>

      {historial.sinPermiso ? (
        <EmptyState
          icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No tenés acceso a este historial"
          description="Esta pantalla es del super admin. Tu rol no alcanza."
        />
      ) : historial.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer el historial"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={historial.mensajeError}
          action={<Button label="Reintentar" onPress={historial.reintentar} />}
        />
      ) : historial.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listaRef}
          data={historial.renglones}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          contentContainerStyle={[
            styles.content,
            // El aire de abajo lo pone la barra del paginador; cuando no está
            // —una sola página—, lo pone la lista, con el inset del sistema.
            historial.paginas > 1
              ? styles.contentConPie
              : { paddingBottom: insets.bottom + theme.spacing.lg },
          ]}
          refreshControl={refresco.control}
        />
      )}

      {/*
        El paginador va FUERA de la lista, fijo abajo: adentro había que bajar
        todos los renglones para llegar a él. Se dibuja solo con más de una
        página.
      */}
      {historial.paginas > 1 && (
        <View style={[styles.pie, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
          <Paginacion
            pagina={historial.pagina}
            paginas={historial.paginas}
            onCambiar={historial.irAPagina}
            accessibilityLabel="Páginas del historial"
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
      // pegado arriba.
      flexGrow: 1,
    },
    /** Con la barra abajo alcanza con un respiro: el inset lo pone la barra. */
    contentConPie: { paddingBottom: theme.spacing.md },

    filtros: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
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
