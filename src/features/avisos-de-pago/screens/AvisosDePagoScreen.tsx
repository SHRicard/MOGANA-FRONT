import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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
import InboxIcon from 'lucide-react-native/icons/inbox';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { FiltroEstado } from '@/shared/ui/atoms/FiltroEstado';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import {
  AvisoDePagoItem,
  OPCIONES_ESTADO_AVISO,
  ResolverAvisoDialogo,
  VisorDeComprobante,
} from '../components';
import { useAvisosDePago, useResolverAviso } from '../hooks';
import { EstadosDeAvisoDePago, type AvisoDePago } from '../types';

const keyExtractor = (aviso: AvisoDePago) => aviso.id;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/** Aire entre tarjetas. Ya se separan por su borde, así que va espacio y no línea. */
function Separador() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
}

/**
 * **La bandeja de avisos de pago** (`MORGANA-BACK/docs/flujo_comprobantes.md`).
 *
 * Es el otro lado de "Avisar que pagué": ahí el cliente dice que pagó y adjunta
 * la captura; acá alguien la mira contra el resumen del banco y decide.
 *
 * ⚠️ Lo que hay en esta lista **no es plata cobrada**. Mientras un aviso esté
 * pendiente, la deuda del cliente sigue entera — anotar el cobro es lo que la
 * baja. Por eso el botón dice "Anotar el cobro" y no "Aceptar", y por eso cada
 * tarjeta muestra el saldo de la factura al lado del monto informado.
 *
 * Abre en **los pendientes**, que es para lo que se abre: ver qué hay que
 * resolver. El archivo —lo confirmado y lo rechazado— está en el filtro.
 *
 * ⚠️ **Los links de los comprobantes se vencen en una hora.** Por eso la
 * pantalla se refresca tirando para abajo: si estuvo abierta mucho rato las
 * miniaturas dejan de cargar, y lo que lo arregla es volver a pedir la lista, no
 * reintentar cada imagen.
 */
export function AvisosDePagoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const bandeja = useAvisosDePago();
  const resolucion = useResolverAviso();
  const refresco = useRefrescar(bandeja.refrescar);

  /** El comprobante abierto a pantalla completa, o `null`. */
  const [ampliado, setAmpliado] = useState<string | null>(null);
  const cerrarVisor = useCallback(() => setAmpliado(null), []);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * Al cambiar de página la lista vuelve arriba.
   *
   * Sin esto, tocar "siguiente" deja la vista a la misma altura y la primera
   * tarjeta de la página nueva queda fuera de la pantalla, como si la lista
   * siguiera. También corre al cambiar el filtro, porque el hook vuelve a la 1.
   */
  const listaRef = useRef<FlatList<AvisoDePago>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [bandeja.pagina]);

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad, y eso anularía el `memo` de
   * cada tarjeta en cada paso de página.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AvisoDePago>) => (
      <AvisoDePagoItem
        aviso={item}
        onVerComprobante={setAmpliado}
        onConfirmar={resolucion.abrirConfirmar}
        onRechazar={resolucion.abrirRechazar}
        resolviendo={resolucion.resolviendo}
      />
    ),
    [resolucion.abrirConfirmar, resolucion.abrirRechazar, resolucion.resolviendo],
  );

  /**
   * Header y footer se pasan como **elementos**, no como componentes: con una
   * función inline `FlatList` ve un tipo nuevo en cada render y remonta el
   * header, que acá se traduce en que el filtro se cierre solo.
   */
  const header: ReactElement = (
    <View style={styles.filtros}>
      <FiltroEstado
        label="Qué avisos ver"
        opciones={OPCIONES_ESTADO_AVISO}
        estado={bandeja.estado}
        onChange={bandeja.onEstadoChange}
      />
    </View>
  );

  const pie: ReactElement | null =
    bandeja.paginas > 1 ? (
      <Paginacion
        pagina={bandeja.pagina}
        paginas={bandeja.paginas}
        onCambiar={bandeja.irAPagina}
        accessibilityLabel="Páginas de los avisos de pago"
      />
    ) : null;

  /**
   * Tres vacíos distintos, y no es lo mismo ninguno: **sin pendientes** es una
   * buena noticia —no hay trabajo—, y los otros dos son archivos que todavía no
   * tienen nada.
   */
  const vacio: ReactElement = (
    <EmptyState
      icon={<InboxIcon size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title={
        bandeja.estado === null
          ? 'No hay avisos por resolver'
          : bandeja.estado === EstadosDeAvisoDePago.CONFIRMADO
          ? 'Todavía no confirmaste ninguno'
          : 'Todavía no rechazaste ninguno'
      }
      description={
        bandeja.estado === null
          ? 'Cuando un cliente avise que pagó, el aviso va a aparecer acá con su comprobante.'
          : 'Acá va quedando el historial de lo que vayas resolviendo.'
      }
    />
  );

  const subtitulo =
    bandeja.pendientes > 0
      ? `${bandeja.pendientes} ${
          bandeja.pendientes === 1 ? 'aviso espera' : 'avisos esperan'
        } respuesta`
      : 'Los pagos que avisan tus clientes';

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
            Avisos de pago
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitulo}
          </Text>
        </View>

        {/* Ocupa un lugar fijo para que el título no se mueva cuando el
            indicador aparece y desaparece. */}
        <View style={styles.headerAction}>
          {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
          {bandeja.isFetching && !bandeja.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando los avisos"
            />
          )}
        </View>
      </View>

      {bandeja.sinPermiso ? (
        <EmptyState
          icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No tenés acceso a este apartado"
          description="Solo administración puede resolver los avisos de pago."
        />
      ) : bandeja.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer los avisos"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={bandeja.mensajeError}
          action={<Button label="Reintentar" onPress={bandeja.reintentar} />}
        />
      ) : bandeja.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listaRef}
          data={bandeja.avisos}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          ListFooterComponent={pie}
          contentContainerStyle={styles.content}
          refreshControl={refresco.control}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/*
        Los dos van como HERMANOS de la lista y no adentro: son views absolutas
        —no `Modal`, que no hereda el edge-to-edge— así que tienen que colgar de
        la raíz de la pantalla para tapar todo.
      */}
      <ResolverAvisoDialogo
        aviso={resolucion.aviso}
        accion={resolucion.accion}
        confirmarControl={resolucion.confirmarControl}
        rechazarControl={resolucion.rechazarControl}
        onConfirmar={resolucion.confirmar}
        onRechazar={resolucion.rechazar}
        onCerrar={resolucion.cerrar}
        resolviendo={resolucion.resolviendo}
        mensajeError={resolucion.mensajeError}
      />

      <VisorDeComprobante url={ampliado} onCerrar={cerrarVisor} />
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
    /** `flex: 1` para que el título se corte antes de empujar lo que sigue. */
    headerTexts: { flex: 1 },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
      flexGrow: 1,
    },
    filtros: { gap: theme.spacing.sm },
    separador: { height: theme.spacing.md },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
