import { memo, useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BellOff from 'lucide-react-native/icons/bell-off';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { EstadosFactura } from '@/features/facturas/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { Chip } from '@/shared/ui/atoms/Chip';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Link } from '@/shared/ui/atoms/Link';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { NotificacionItem } from '../components';
import { useNotificaciones } from '../hooks';
import type { Notificacion } from '../types';

const keyExtractor = (notificacion: Notificacion) => notificacion.id;

/** Aire entre tarjetas: cada una ya trae su borde, así que no va una línea más. */
const Separador = memo(function SeparadorComponent() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
});

/**
 * Avisos: lo que le llegó a esta cuenta (`docs/notificaciones.md`).
 *
 * **Ninguno lo dispara el sistema solo**: la deuda vencida y los anuncios los
 * manda un administrador a mano, y los tres de pago los disparan las dos puntas
 * de un aviso de pago. El texto viene redactado por el backend y es el mismo del
 * correo; la app no lo arma ni lo resume.
 *
 * Tocar un aviso lo marca leído **y abre lo que está diciendo**
 * (`docs/user_cliente_flujo.md` §11): los de pago llevan a la factura, el de
 * deuda a las vencidas. Los que no llevan a ningún lado —un anuncio, o el
 * `pago_informado` que es del administrador— solo se marcan.
 *
 * ⚠️ **A dónde va cada uno lo decide `destinoDeAviso`, por `tipo`.** Acá solo se
 * traduce ese destino a un nombre de ruta: el resto de la feature no conoce el
 * router.
 *
 * Toda la lógica vive en `useNotificaciones` — acá solo se arma la UI.
 */
export function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const navigation = useNavigation();
  const listado = useNotificaciones();
  const refresco = useRefrescar(listado.refrescar);

  /**
   * Tocar un aviso: el hook lo marca leído y dice a dónde lleva; acá se traduce
   * ese destino a una ruta. Sin destino no se navega — no es un error, es un
   * aviso que no habla de ninguna pantalla.
   */
  const abrir = useCallback(
    (notificacion: Notificacion) => {
      const destino = listado.abrir(notificacion);
      if (destino === null) {
        return;
      }
      if (destino.destino === 'factura') {
        navigation.navigate(RootRoutes.MI_FACTURA, { facturaId: destino.facturaId });
        return;
      }
      // El aviso habla de lo que ya venció, así que la lista abre con ese filtro
      // puesto: llevar a "todas" obligaría a buscar de cuál habla.
      navigation.navigate(RootRoutes.MIS_FACTURAS, { estado: EstadosFactura.VENCIDA });
    },
    [listado, navigation],
  );

  /** Cambiar de página tiene que empezar arriba, o la primera fila queda fuera. */
  const listaRef = useRef<FlatList<Notificacion>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [listado.pagina]);

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad, y eso anularía el `memo` de
   * `NotificacionItem` cada vez que se marca uno como leído.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Notificacion>) => (
      <NotificacionItem notificacion={item} onPress={abrir} />
    ),
    [abrir],
  );

  /**
   * Se pasa como **elemento**, no como componente: con una función inline
   * `FlatList` ve un tipo nuevo en cada render y remonta el header entero.
   */
  const header: ReactElement = (
    <View style={styles.filtros}>
      <View style={styles.pestanas}>
        <Chip
          label="Todos"
          onPress={() => listado.onSoloNoLeidasChange(false)}
          selected={!listado.soloNoLeidas}
          accessibilityLabel="Ver todos los avisos"
        />
        <Chip
          label={listado.noLeidas > 0 ? `Sin leer (${listado.noLeidas})` : 'Sin leer'}
          onPress={() => listado.onSoloNoLeidasChange(true)}
          selected={listado.soloNoLeidas}
          accessibilityLabel="Ver solo los avisos sin leer"
        />
      </View>

      {/* Solo cuando hay algo que marcar: un "marcar todas" con el globito
          vacío es un botón que no hace nada. */}
      {listado.noLeidas > 0 && (
        <Link
          label="Marcar todas"
          variant="caption"
          onPress={listado.leerTodas}
          disabled={listado.marcandoTodas}
        />
      )}
    </View>
  );

  const vacio: ReactElement = (
    <EmptyState
      icon={<BellOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title={listado.soloNoLeidas ? 'No te queda nada sin leer' : 'No tenés avisos'}
      description={
        listado.soloNoLeidas
          ? 'Ya leíste todos los avisos de tu cuenta.'
          : 'Acá van a aparecer los avisos de tu cuenta. Te avisamos también por correo.'
      }
      action={
        listado.soloNoLeidas ? (
          <Button
            label="Ver todos"
            variant="secondary"
            onPress={() => listado.onSoloNoLeidasChange(false)}
          />
        ) : undefined
      }
    />
  );

  /** El total va en el encabezado: con una sola página el paginador no se dibuja. */
  const subtitulo =
    listado.noLeidas > 0
      ? listado.noLeidas === 1
        ? '1 sin leer'
        : `${listado.noLeidas} sin leer`
      : 'Los avisos de tu cuenta';

  return (
    // Solo el inset de arriba: el de abajo lo absorbe la tab bar.
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTexts}>
          <Text variant="title" weight="semibold" accessibilityRole="header">
            Avisos
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitulo}
          </Text>
        </View>

        {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
        <View style={styles.headerAction}>
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
          data={listado.notificaciones}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          contentContainerStyle={[
            styles.content,
            // El aire de abajo lo pone la barra del paginador; cuando no está
            // —una sola página—, lo pone la lista.
            listado.paginas > 1 ? styles.contentConPie : styles.contentSinPie,
          ]}
          refreshControl={refresco.control}
        />
      )}

      {/*
        El paginador va FUERA de la lista, fijo abajo: adentro habría que bajar
        todas las filas para llegar a él. Se dibuja solo con más de una página.
      */}
      {listado.paginas > 1 && (
        <View style={styles.pie}>
          <Paginacion
            pagina={listado.pagina}
            paginas={listado.paginas}
            onCambiar={listado.irAPagina}
            accessibilityLabel="Páginas de los avisos"
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
      paddingVertical: theme.spacing.md,
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },
    /** Ocupa lugar fijo para que el título no se mueva al aparecer el spinner. */
    headerAction: { width: 24, alignItems: 'center' },

    content: { paddingHorizontal: theme.spacing.lg, flexGrow: 1 },
    contentSinPie: { paddingBottom: theme.spacing.lg },
    contentConPie: { paddingBottom: theme.spacing.md },

    filtros: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    pestanas: { flexDirection: 'row', gap: theme.spacing.sm },

    separador: { height: theme.spacing.sm },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    pie: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
  });
