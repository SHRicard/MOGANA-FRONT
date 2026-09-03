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
import Trash2 from 'lucide-react-native/icons/trash-2';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { EstadosFactura } from '@/features/facturas/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Link } from '@/shared/ui/atoms/Link';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { NotificacionItem } from '../components';
import { useNotificaciones } from '../hooks';
import { PantallasDeAviso, type Notificacion } from '../types';

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
 * (`docs/user_cliente_flujo.md` §11): los de pago resuelto llevan a la factura,
 * el de deuda a las vencidas, y el `pago_informado` —que es del administrador—
 * a la bandeja del panel, que es donde se resuelve. Un anuncio no lleva a ningún
 * lado: solo se marca.
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
      // Marcar leído no bloquea la navegación: si falla, el globito se corrige
      // solo en el próximo listado.
      const destino = listado.abrir(notificacion);

      /*
        ⚠️ El `if` no es defensivo de más y el `switch` no tiene `default` por
        accidente: `destino` es `null` en los anuncios, y una versión más nueva
        del backend puede mandar una `pantalla` que esta build todavía no
        conoce. En los dos casos el aviso se lee igual y no se navega — nunca se
        rompe.
      */
      if (!destino) {
        /*
          Un anuncio no lleva a ningún lado y esto es lo correcto. Pero es
          TAMBIÉN lo que se ve cuando el backend todavía no manda `destino`: el
          aviso se lee, no navega, y no hay ni un error. Este renglón es la
          diferencia entre las dos cosas — sin él, un servidor viejo se
          diagnostica a mano.
        */
        if (__DEV__ && notificacion.destino === undefined) {
          console.warn(
            `[avisos] El aviso "${notificacion.tipo}" llegó sin el campo "destino". ` +
              'Si esperabas que abriera una pantalla, el backend que está contestando es anterior ' +
              'a ese campo: reinicialo. La app no adivina el destino a propósito (docs/notificaciones.md).',
          );
        }
        return;
      }

      switch (destino.pantalla) {
        case PantallasDeAviso.UNA_FACTURA:
          /*
            ⚠️ El `id` puede venir `null` en una pantalla que normalmente lo
            lleva: son los avisos guardados antes de que `datos` trajera ese
            campo. Se cae en la lista en vez de romper.
          */
          if (destino.id) {
            navigation.navigate(RootRoutes.MI_FACTURA, { facturaId: destino.id });
          } else {
            navigation.navigate(RootRoutes.MIS_FACTURAS);
          }
          return;

        case PantallasDeAviso.MIS_FACTURAS:
          /*
            El filtro va por la PANTALLA y no por el tipo del aviso: lo único que
            manda a `mis_facturas` es la deuda vencida, así que abrir con las
            vencidas puestas es una propiedad de ese destino. Llevar a "todas"
            obligaría a buscar de cuál habla.
          */
          navigation.navigate(RootRoutes.MIS_FACTURAS, { estado: EstadosFactura.VENCIDA });
          return;

        case PantallasDeAviso.BANDEJA_DE_PAGOS:
          /*
            Un cliente avisó que pagó y hay que resolverlo. La bandeja abre en
            los pendientes, así que el aviso recién llegado está a la vista sin
            tocar ningún filtro.

            🚧 El backend manda además el id del aviso; todavía no se usa.
            Destacar esa tarjeta obligaría a saber en qué página cayó —la
            bandeja pagina y ordena del más viejo al más nuevo—, y eso es otra
            tarea.
          */
          navigation.navigate(RootRoutes.AVISOS_DE_PAGO);
          return;

        case PantallasDeAviso.STORE_DE_COMPROBANTES:
          // Se está llenando el lugar de los comprobantes: se va a borrar.
          navigation.navigate(RootRoutes.STORE_COMPROBANTES);
          return;

        case PantallasDeAviso.MIS_MENSAJES:
          // El cliente tiene un solo hilo: no hay nada que elegir.
          navigation.navigate(RootRoutes.MIS_MENSAJES);
          return;

        case PantallasDeAviso.BANDEJA_DE_MENSAJES:
          /*
            ⚠️ Acá el `id` es **el cliente**, no el mensaje: la bandeja tiene un
            hilo por persona. Sin id se cae en la bandeja completa, que sigue
            siendo el lugar correcto — el hilo con algo sin leer está arriba.
          */
          if (destino.id) {
            navigation.navigate(RootRoutes.HILO_DEL_CLIENTE, { clienteId: destino.id });
          } else {
            navigation.navigate(RootRoutes.BANDEJA_MENSAJES);
          }
          return;
      }
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
      <NotificacionItem notificacion={item} onPress={abrir} onBorrar={listado.borrar} />
    ),
    [abrir, listado.borrar],
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

      <View style={styles.acciones}>
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

        {/* Lo mismo del otro lado: vaciar una campanita vacía no hace nada. */}
        {listado.total > 0 && (
          <Link
            label="Borrar todos"
            variant="caption"
            onPress={listado.pedirVaciar}
            disabled={listado.borrandoTodas}
          />
        )}
      </View>
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

      {/*
        ⚠️ **Vaciar la campanita no se puede deshacer desde la app**, así que se
        pregunta con el número delante. Del lado del backend la fila queda —un
        aviso es la prueba de qué se le comunicó a alguien y cuándo— pero no hay
        endpoint para traerla de vuelta.

        Hermano de la lista y no adentro: es una view absoluta, así que tiene que
        colgar de la raíz para tapar todo.
      */}
      <Dialogo
        visible={listado.confirmandoVaciar}
        onClose={listado.cancelarVaciar}
        cerrarAlTocarFondo={false}
        tono="peligro"
        icono={<Trash2 size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
        titulo={`Borrar ${listado.total} ${listado.total === 1 ? 'aviso' : 'avisos'}`}
        descripcion="Se van de tu campanita y no se pueden recuperar. Lo que ya te avisamos sigue valiendo igual."
        acciones={[
          {
            label: 'Borrar todos',
            onPress: listado.vaciar,
            variant: 'danger',
            loading: listado.borrandoTodas,
            disabled: listado.borrandoTodas,
          },
          {
            label: 'Cancelar',
            onPress: listado.cancelarVaciar,
            variant: 'secondary',
            disabled: listado.borrandoTodas,
          },
        ]}
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
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },
    /** Ocupa lugar fijo para que el título no se mueva al aparecer el spinner. */
    headerAction: { width: 24, alignItems: 'center' },

    content: { paddingHorizontal: theme.spacing.lg, flexGrow: 1 },
    contentSinPie: { paddingBottom: theme.spacing.lg },
    contentConPie: { paddingBottom: theme.spacing.md },

    /** Los dos enlaces de la derecha: marcar todas y borrar todos. */
    acciones: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
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
