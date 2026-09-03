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
import ImageOff from 'lucide-react-native/icons/image-off';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import Trash2 from 'lucide-react-native/icons/trash-2';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// El visor sale de `avisos-de-pago`: es el mismo comprobante mirado desde otro
// lado, y duplicarlo daría dos formas de ver la misma foto.
import { VisorDeComprobante } from '@/features/avisos-de-pago';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { Checkbox } from '@/shared/ui/atoms/Checkbox';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { FiltroEstado } from '@/shared/ui/atoms/FiltroEstado';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { formatBytes } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  ComprobanteDelStoreItem,
  OPCIONES_ANTIGUEDAD,
  OPCIONES_ESTADO_DEL_AVISO,
} from '../components';
import { useComprobantesDelStore } from '../hooks';
import { MAX_SELECCION, type ComprobanteEnElStore } from '../types';

const keyExtractor = (comprobante: ComprobanteEnElStore) => comprobante.avisoId;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/** Aire entre filas. Ya se separan por su borde, así que va espacio y no línea. */
function Separador() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
}

/**
 * **Los comprobantes del store, uno por uno**
 * (`MORGANA-BACK/docs/flujo_comprobantes.md` §5.2 y §5.5).
 *
 * Existe para lo que el barrido masivo no puede: **mirar antes de tirar**, y
 * sacar uno suelto. La API los ordena del más viejo al más nuevo, que es el
 * orden en que se van.
 *
 * ⚠️ **Acá borrar es de a uno y sin las guardas del masivo** —ni confirmación
 * del protocolo ni mínimo de antigüedad—, y no es una inconsistencia: las
 * guardas de aquel existen porque ahí no se ve lo que se borra. Acá sí, con
 * miniatura, cliente y fecha delante. Igual se pregunta antes, porque tampoco se
 * puede deshacer.
 *
 * ⚠️ **Los de un aviso pendiente no se pueden borrar**, ni desde acá: su imagen
 * es la única evidencia con la que todavía hay que decidir.
 */
export function ComprobantesDelStoreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const listado = useComprobantesDelStore();
  const refresco = useRefrescar(listado.refrescar);

  const [ampliado, setAmpliado] = useState<string | null>(null);
  const cerrarVisor = useCallback(() => setAmpliado(null), []);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /** Cambiar de página tiene que empezar arriba, o la primera fila queda fuera. */
  const listaRef = useRef<FlatList<ComprobanteEnElStore>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [listado.pagina]);

  const alternarBorrados = useCallback(() => {
    listado.onIncluirBorradosChange(!listado.incluirBorrados);
  }, [listado]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ComprobanteEnElStore>) => (
      <ComprobanteDelStoreItem
        comprobante={item}
        onVer={setAmpliado}
        onBorrar={listado.pedirBorrar}
        deshabilitado={listado.borrando || listado.borrandoSeleccion}
        tildado={listado.seleccion.has(item.avisoId)}
        onTildar={listado.alternarUno}
        seleccionLlena={listado.seleccionLlena}
      />
    ),
    [
      listado.pedirBorrar,
      listado.borrando,
      listado.borrandoSeleccion,
      listado.seleccion,
      listado.alternarUno,
      listado.seleccionLlena,
    ],
  );

  /**
   * Se pasa como **elemento**, no como componente: con una función inline
   * `FlatList` ve un tipo nuevo en cada render y remonta el header, que acá se
   * traduce en que los filtros se cierren solos.
   */
  const header: ReactElement = (
    <View style={styles.filtros}>
      {/*
        Los bytes del FILTRO entero, no de la página: es el número con el que se
        decide, y no puede cambiar al pasar de página.
      */}
      <Text variant="small" color="textMuted">
        {listado.total > 0
          ? `${listado.total} ${listado.total === 1 ? 'archivo' : 'archivos'} · ${formatBytes(
              listado.bytes,
            )}`
          : 'Nada con estos filtros.'}
      </Text>

      <FiltroEstado
        label="Antigüedad"
        opciones={OPCIONES_ANTIGUEDAD}
        estado={listado.antiguedad}
        onChange={listado.onAntiguedadChange}
      />
      <FiltroEstado
        label="Estado del aviso"
        opciones={OPCIONES_ESTADO_DEL_AVISO}
        estado={listado.estado}
        onChange={listado.onEstadoChange}
      />
      {/* Por defecto la lista muestra **lo que todavía ocupa lugar**. Los ya
          soltados se piden aparte: son historial, no cuota. */}
      <Chip
        label="Incluir los ya liberados"
        onPress={alternarBorrados}
        selected={listado.incluirBorrados}
        accessibilityLabel="Ver también los comprobantes que ya se borraron"
      />

      {/*
        Tilda los de ESTA página, no los del filtro entero: marcar 143 cosas que
        no se ven con un toque es justo lo que ya hace la limpieza por
        antigüedad, con su vista previa y sus guardas.
      */}
      {listado.comprobantes.length > 0 ? (
        <Checkbox
          checked={listado.paginaTildada}
          onChange={listado.alternarPagina}
          label="Tildar los de esta página"
          disabled={listado.borrandoSeleccion}
        />
      ) : null}
    </View>
  );

  const pie: ReactElement | null =
    listado.paginas > 1 ? (
      <Paginacion
        pagina={listado.pagina}
        paginas={listado.paginas}
        onCambiar={listado.irAPagina}
        accessibilityLabel="Páginas de los comprobantes guardados"
      />
    ) : null;

  const vacio: ReactElement = (
    <EmptyState
      icon={<ImageOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title={listado.hayFiltros ? 'Sin resultados' : 'No hay comprobantes guardados'}
      description={
        listado.hayFiltros
          ? 'Ningún comprobante coincide con estos filtros.'
          : 'Cuando tus clientes adjunten capturas al avisar un pago, van a aparecer acá.'
      }
      action={
        listado.hayFiltros ? (
          <Button label="Limpiar filtros" variant="secondary" onPress={listado.limpiarFiltros} />
        ) : undefined
      }
    />
  );

  const aBorrar = listado.aBorrar;

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
            Comprobantes guardados
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Del más viejo al más nuevo
          </Text>
        </View>

        <View style={styles.headerAction}>
          {listado.isFetching && !listado.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando la lista"
            />
          )}
        </View>
      </View>

      {listado.sinPermiso ? (
        <EmptyState
          icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No tenés acceso a este apartado"
          description="Solo administración puede ver el store."
        />
      ) : listado.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer los comprobantes"
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
          data={listado.comprobantes}
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
        La barra de lo tildado. Aparece solo cuando hay algo, y **dice siempre
        cuántos y cuánto pesan**: es lo que hace que se pueda tildar en varias
        páginas sin miedo a borrar algo que se eligió y se olvidó.

        Va fuera del scroll y pegada abajo: si viviera en la lista habría que
        buscarla para saber cuántos van.
      */}
      {listado.seleccion.size > 0 ? (
        <View style={[styles.barra, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
          <View style={styles.barraTextos}>
            <Text variant="small" weight="semibold" numberOfLines={1}>
              {`${listado.seleccion.size} ${
                listado.seleccion.size === 1 ? 'tildado' : 'tildados'
              } · ${formatBytes(listado.bytesSeleccionados)}`}
            </Text>
            {/* El tope es del backend: se avisa cuando se llegó, no cuando falla. */}
            {listado.seleccionLlena ? (
              <Text variant="caption" color="onWarningMuted">
                {`Es el máximo por vez (${MAX_SELECCION}). Para borrados más grandes usá la limpieza por antigüedad.`}
              </Text>
            ) : null}
          </View>

          <Button
            label="Destildar"
            variant="ghost"
            size="sm"
            onPress={listado.limpiarSeleccion}
            disabled={listado.borrandoSeleccion}
          />
          <Button
            label="Borrar"
            variant="danger"
            size="sm"
            onPress={listado.pedirBorrarSeleccion}
            disabled={listado.borrandoSeleccion}
            accessibilityLabel={`Borrar los ${listado.seleccion.size} comprobantes tildados`}
          />
        </View>
      ) : null}

      {/*
        La confirmación del lote. El backend NO la pide —enumerar los ids uno
        por uno ya es la confirmación— pero tampoco se puede deshacer, así que
        el toque de más cuesta menos que las fotos perdidas.
      */}
      <Dialogo
        visible={listado.confirmandoSeleccion}
        onClose={listado.cancelarBorradoSeleccion}
        cerrarAlTocarFondo={false}
        tono="peligro"
        icono={<Trash2 size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
        titulo={`Borrar ${listado.seleccion.size} ${
          listado.seleccion.size === 1 ? 'comprobante' : 'comprobantes'
        }`}
        descripcion={`Se liberan ${formatBytes(
          listado.bytesSeleccionados,
        )}. Los avisos quedan igual; lo que se va son las imágenes, y no vuelven.`}
        acciones={[
          {
            label: 'Borrar',
            onPress: listado.confirmarBorradoSeleccion,
            variant: 'danger',
            loading: listado.borrandoSeleccion,
            disabled: listado.borrandoSeleccion,
          },
          {
            label: 'Cancelar',
            onPress: listado.cancelarBorradoSeleccion,
            variant: 'secondary',
            disabled: listado.borrandoSeleccion,
          },
        ]}
      >
        {/*
          El `400` de los pendientes llega redactado y explica qué hacer
          —"destildalos o resolvé esos avisos primero"—. Va tal cual, y lo
          tildado NO se limpia: hay que poder corregir la selección.
        */}
        {listado.mensajeErrorSeleccion ? (
          <View style={styles.error} accessible accessibilityRole="alert">
            <Text variant="small" color="error">
              {listado.mensajeErrorSeleccion}
            </Text>
          </View>
        ) : null}
      </Dialogo>

      {/*
        Se pregunta aunque el backend no lo exija: borrar de a uno tampoco se
        puede deshacer, y el toque de más cuesta menos que la foto perdida.
      */}
      <Dialogo
        visible={aBorrar !== null}
        onClose={listado.cancelarBorrado}
        cerrarAlTocarFondo={false}
        tono="peligro"
        icono={<Trash2 size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
        titulo="Borrar este comprobante"
        descripcion={
          aBorrar
            ? `Se libera ${formatBytes(aBorrar.bytes)} de la factura #${
                aBorrar.facturaNumero
              }. El aviso queda igual; lo que se va es la imagen, y no vuelve.`
            : undefined
        }
        acciones={[
          {
            label: 'Borrar',
            onPress: listado.confirmarBorrado,
            variant: 'danger',
            loading: listado.borrando,
            disabled: listado.borrando,
          },
          {
            label: 'Cancelar',
            onPress: listado.cancelarBorrado,
            variant: 'secondary',
            disabled: listado.borrando,
          },
        ]}
      >
        {listado.mensajeErrorBorrado ? (
          <View style={styles.error} accessible accessibilityRole="alert">
            <Text variant="small" color="error">
              {listado.mensajeErrorBorrado}
            </Text>
          </View>
        ) : null}
      </Dialogo>

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
    separador: { height: theme.spacing.sm },

    /** Pegada abajo, por encima de la lista: lo tildado se ve siempre. */
    barra: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    /** `flex: 1` para que el texto se corte antes de empujar los botones. */
    barraTextos: { flex: 1, gap: theme.spacing.xxs },

    error: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
