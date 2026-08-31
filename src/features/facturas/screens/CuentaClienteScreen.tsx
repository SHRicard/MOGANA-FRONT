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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import BellRing from 'lucide-react-native/icons/bell-ring';
import Check from 'lucide-react-native/icons/check';
import FilePlus from 'lucide-react-native/icons/file-plus';
import FileText from 'lucide-react-native/icons/file-text';
import SearchX from 'lucide-react-native/icons/search-x';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import UserX from 'lucide-react-native/icons/user-x';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { FiltroEstado } from '@/shared/ui/atoms/FiltroEstado';
import { FiltroFechas } from '@/shared/ui/atoms/FiltroFechas';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { EstadoBadge, FacturaDeCuentaItem, OPCIONES_ESTADO_FACTURA } from '../components';
import { useAvisoDeuda, useCuentaCliente } from '../hooks';
import {
  clienteSinDni,
  clienteSinFiado,
  EstadosCuenta,
  textoImpagas,
  textoVencimiento,
  type FacturaDeCuenta,
} from '../types';

type CuentaRoute = RouteProp<RootStackParamList, typeof RootRoutes.CUENTA>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

const keyExtractor = (factura: FacturaDeCuenta) => factura.id;

/** Aire entre facturas. Cada una ya es una tarjeta con borde. */
function Separador() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.separador} />;
}

/**
 * La cuenta de un cliente (`docs/flujo_pagos.md` §4): **la pantalla que contesta
 * "¿tiene algo atrás?"**.
 *
 * Es el paso del medio del flujo de cobranza —tablero → cuenta → factura—: el
 * tablero dice a quién hay que ir a cobrar, acá se ve de qué está hecha esa
 * deuda, y el cobro se anota adentro de cada factura.
 *
 * Arriba, el resumen de **toda** la cuenta; abajo, sus facturas con el saldo de
 * cada una, filtrables por estado y por fecha de emisión, y paginadas — un
 * cliente puede tener mil.
 *
 * ⚠️ **Los filtros no tocan el resumen**: mirar solo las pagadas no cambia
 * cuánto debe. Lo que sí cambia es cuántas facturas entran en la lista.
 *
 * ⚠️ Los importes se muestran tal como llegan: los calculó el backend con
 * decimales exactos.
 */
export function CuentaClienteScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<CuentaRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const cuenta = useCuentaCliente(params.clienteId);
  const refresco = useRefrescar(cuenta.refrescar);

  /**
   * Reclamarle la deuda (`docs/notificaciones.md`). Se confirma antes de
   * mandarlo: del otro lado le llega un aviso a una persona y, si tiene correo
   * cargado, también un mail. **El sistema no reclama solo.**
   */
  const [avisando, setAvisando] = useState(false);
  const aviso = useAvisoDeuda(params.clienteId);

  const abrirAviso = useCallback(() => {
    // Se limpia al abrir: el resultado del aviso anterior no tiene por qué
    // aparecer en este.
    aviso.limpiar();
    setAvisando(true);
  }, [aviso]);

  const cerrarAviso = useCallback(() => {
    aviso.limpiar();
    setAvisando(false);
  }, [aviso]);

  /** Al cambiar de página la lista vuelve arriba, como en el tablero. */
  const listaRef = useRef<FlatList<FacturaDeCuenta>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [cuenta.pagina]);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const nombre = cuenta.cliente?.nombre ?? params.clienteNombre;

  const facturar = useCallback(() => {
    navigation.navigate(RootRoutes.NUEVA_FACTURA, {
      clienteId: params.clienteId,
      clienteNombre: nombre,
      // La marca viaja al formulario: el backend acepta la factura igual, así
      // que el aviso es lo único que evita fiarle sin querer.
      sinFiado: cuenta.cliente ? clienteSinFiado(cuenta.cliente) : false,
      motivoSinFiado: cuenta.cliente?.motivoSinFiado ?? undefined,
    });
  }, [navigation, params.clienteId, nombre, cuenta.cliente]);

  const verFactura = useCallback(
    (factura: FacturaDeCuenta) => {
      // El renglón de la lista es liviano —no trae productos ni cobros—, así
      // que el detalle se pide recién acá. Además es la pantalla que sabe el
      // estado de hoy, y es donde se cobra.
      navigation.navigate(RootRoutes.FACTURA, { facturaId: factura.id });
    },
    [navigation],
  );

  /**
   * `useCallback` y no una función inline: `FlatList` re-renderiza todas las
   * filas cuando `renderItem` cambia de identidad.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FacturaDeCuenta>) => (
      <FacturaDeCuentaItem factura={item} onPress={verFactura} />
    ),
    [verFactura],
  );

  const resumen = cuenta.resumen;
  const vencimiento = resumen ? textoVencimiento(resumen.estado, resumen.diasParaVencer) : null;

  /**
   * El resumen va como encabezado de la lista y no fijo arriba: es información
   * de contexto, y con el scroll conviene que deje lugar a las facturas, que son
   * lo que se va a tocar.
   */
  const header: ReactElement | null = resumen ? (
    <View style={styles.encabezado}>
      {/*
        La cuenta es una de las dos pantallas donde se decide si se le sigue
        fiando, así que acá el motivo va a la vista y no solo la marca.
      */}
      {/*
        Dato faltante y no castigo: ámbar, sin `alert` y sin motivo. Se le
        factura y se le cobra igual — lo único que no puede es usar la app. Se
        arregla desde su ficha, que es donde está el botón.
      */}
      {cuenta.cliente && clienteSinDni(cuenta.cliente) && (
        <View style={styles.faltaDni}>
          <Chip label="Falta el DNI" tone="warning" />
        </View>
      )}

      {cuenta.cliente && clienteSinFiado(cuenta.cliente) && (
        <View style={styles.sinFiado} accessible accessibilityRole="alert">
          <Chip label="No se le fía" tone="danger" />
          {cuenta.cliente.motivoSinFiado ? (
            <Text variant="small" color="textMuted">
              {cuenta.cliente.motivoSinFiado}
            </Text>
          ) : null}
        </View>
      )}
      <View style={styles.resumen}>
        <View style={styles.deudaLinea}>
          <Text variant="small" color="textMuted">
            {resumen.deuda > 0 ? 'Debe' : 'Sin deuda'}
          </Text>
          <EstadoBadge estado={resumen.estado} />
        </View>

        <Text variant="heading" weight="bold">
          {formatMonto(resumen.deuda)}
        </Text>

        {/* El vencimiento que se muestra es el MÁS VIEJO de lo impago: es el que
            dice qué tan urgente es esta cuenta. */}
        {vencimiento && resumen.vencimientoMasViejo && (
          <Text variant="small" color="textMuted">
            {`Vence ${formatFecha(resumen.vencimientoMasViejo)} · ${vencimiento.toLowerCase()}`}
          </Text>
        )}

        <View style={styles.historico}>
          <Dato etiqueta="Facturado" valor={formatMonto(resumen.totalFacturado)} />
          <Dato etiqueta="Cobrado" valor={formatMonto(resumen.totalPagado)} />
          <Dato etiqueta="Facturas" valor={textoImpagas(resumen)} />
        </View>

        {/*
          Lo que le debés VOS al cliente: lo que había pagado de facturas que
          después se anularon. Va aparte y en tono de error porque es plata que
          se mueve para el otro lado y todavía pide que alguien haga algo.
        */}
        {resumen.aReembolsar > 0 && (
          <View style={styles.aDevolver} accessible accessibilityRole="alert">
            <Text variant="small" weight="semibold" color="error">
              {`Le tenés que devolver ${formatMonto(resumen.aReembolsar)}`}
            </Text>
            <Text variant="caption" color="textMuted">
              De facturas anuladas que ya se habían cobrado. Se marca como devuelta en cada una.
            </Text>
          </View>
        )}
      </View>

      {/*
        Solo con la cuenta VENCIDA: el aviso habla de deuda vencida, así que
        ofrecerlo cuando no hay nada pasado de fecha sería mandar un reclamo que
        no dice nada. Va arriba de "Nueva factura" porque es lo que se hace
        mirando esta pantalla — facturar de nuevo es el otro camino.
      */}
      {resumen.estado === EstadosCuenta.VENCIDA && (
        <Button
          label="Avisar la deuda"
          onPress={abrirAviso}
          disabled={aviso.enviando}
          leftIcon={<BellRing size={ICON_SIZE} color={theme.colors.onPrimary} />}
          accessibilityLabel={`Avisarle la deuda a ${nombre}`}
          fullWidth
        />
      )}

      <Button
        label="Nueva factura"
        variant="secondary"
        onPress={facturar}
        leftIcon={<FilePlus size={ICON_SIZE} color={theme.colors.primary} />}
        fullWidth
      />

      <View style={styles.tituloLista}>
        <Text variant="body" weight="semibold">
          Facturas
        </Text>
        {/* Cuántas entran en el filtro: el `total` sí cuenta lo filtrado. */}
        {cuenta.total > 0 && (
          <Text variant="caption" color="textMuted">
            {cuenta.hayFiltros ? `${cuenta.total} en el filtro` : `${cuenta.total} en total`}
          </Text>
        )}
      </View>

      {/*
        Los filtros son de LA LISTA: el resumen de arriba no se mueve. El estado
        acá es el de una factura —"Pagada", no "Al día"—, y el rango va por fecha
        de emisión: "lo que le facturé en julio".
      */}
      <View style={styles.filtros}>
        <FiltroEstado
          label="Estado de la factura"
          opciones={OPCIONES_ESTADO_FACTURA}
          estado={cuenta.estado}
          onChange={cuenta.onEstadoChange}
        />
        <FiltroFechas
          label="Emitidas"
          desde={cuenta.desde}
          hasta={cuenta.hasta}
          onDesdeChange={cuenta.onDesdeChange}
          onHastaChange={cuenta.onHastaChange}
        />
      </View>
    </View>
  ) : null;

  /**
   * Dos vacíos distintos, y confundirlos manda a la persona a buscar un botón
   * que no existe: **con filtros** la cuenta tiene facturas pero ninguna
   * coincide —se ofrece limpiarlos—, y **sin filtros** todavía no se le emitió
   * ninguna. Ninguno de los dos es un error: la API contesta `200`.
   */
  const vacio: ReactElement = cuenta.hayFiltros ? (
    <EmptyState
      icon={<SearchX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Sin resultados"
      description="Ninguna factura de este cliente entra en el filtro."
      action={
        <Button label="Limpiar filtros" variant="secondary" onPress={cuenta.limpiarFiltros} />
      }
    />
  ) : (
    <EmptyState
      icon={<FileText size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Todavía no tiene facturas"
      description="Cuando le emitas la primera, va a aparecer acá con su estado y su saldo."
      action={<Button label="Nueva factura" onPress={facturar} />}
    />
  );

  return (
    <>
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
              {nombre}
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {/* Las de la cuenta ENTERA, que es lo que no cambia al filtrar. */}
              {cuenta.resumen ? `Cuenta · ${textoImpagas(cuenta.resumen)}` : 'Cuenta'}
            </Text>
          </View>

          <View style={styles.headerAction}>
            {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
            {cuenta.isFetching && !cuenta.isLoading && !refresco.refrescando && (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                accessibilityLabel="Actualizando la cuenta"
              />
            )}
          </View>
        </View>

        {cuenta.sinPermiso ? (
          <EmptyState
            icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No tenés acceso a esta cuenta"
            description="Tu rol no permite ver la facturación."
          />
        ) : cuenta.noEncontrado ? (
          <EmptyState
            icon={<UserX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No encontramos ese cliente"
            // Un 404 acá también significa que el id es de una cuenta de
            // administración: en este apartado solo existen los clientes.
            description="La cuenta no existe o no es la de un cliente."
            action={<Button label="Volver" variant="secondary" onPress={volver} />}
          />
        ) : cuenta.mensajeError ? (
          <EmptyState
            icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No pudimos traer la cuenta"
            // El texto del backend viene redactado para mostrarse tal cual.
            description={cuenta.mensajeError}
            action={<Button label="Reintentar" onPress={cuenta.reintentar} />}
          />
        ) : cuenta.isLoading ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listaRef}
            data={cuenta.facturas}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={Separador}
            ListHeaderComponent={header}
            ListEmptyComponent={vacio}
            contentContainerStyle={styles.content}
            refreshControl={refresco.control}
          />
        )}

        {/* El paginador fijo abajo, como en el tablero: se ve dónde termina la
          página en vez de tener que scrollear hasta el final. */}
        {cuenta.paginas > 1 && (
          <View style={styles.pie}>
            <Paginacion
              pagina={cuenta.pagina}
              paginas={cuenta.paginas}
              onCambiar={cuenta.irAPagina}
              accessibilityLabel={`Páginas de las facturas de ${nombre}`}
            />
          </View>
        )}
      </View>

      {/*
        Hermanos de la pantalla y no hijos: el diálogo es una view absoluta que
        cubre a su PADRE, y adentro del `View` con `paddingTop` el fondo oscuro
        se comería la franja de la barra de estado.
      */}
      <Dialogo
        visible={avisando && !aviso.enviado}
        onClose={cerrarAviso}
        icono={<BellRing size={DIALOGO_ICON_SIZE} color={theme.colors.primary} />}
        titulo="¿Avisarle la deuda?"
        descripcion={`A ${nombre} le va a quedar un aviso en la app —ahí se queda hasta que lo lea— y, si tiene correo cargado, le llega también un mail. Lo estás mandando vos: el sistema no reclama solo.`}
        cerrarAlTocarFondo={!aviso.enviando}
        acciones={[
          {
            label: 'Avisar',
            onPress: aviso.avisar,
            loading: aviso.enviando,
            disabled: aviso.enviando,
          },
          {
            label: 'Cancelar',
            onPress: cerrarAviso,
            variant: 'secondary',
            disabled: aviso.enviando,
          },
        ]}
      >
        {aviso.mensajeError && (
          <View style={styles.errorAviso} accessible accessibilityRole="alert">
            <Text variant="small" color="error">
              {aviso.mensajeError}
            </Text>
          </View>
        )}
      </Dialogo>

      {/* Que salió no se puede ver en ningún lado —el aviso es del cliente—, así
          que hay que decirlo. */}
      <Dialogo
        visible={avisando && aviso.enviado}
        onClose={cerrarAviso}
        tono="exito"
        icono={<Check size={DIALOGO_ICON_SIZE} color={theme.colors.success} />}
        titulo="Aviso enviado"
        descripcion={`${nombre} ya lo tiene en su app. Si tiene correo cargado, también le llegó por mail.`}
        acciones={[{ label: 'Listo', onPress: cerrarAviso }]}
      />
    </>
  );
}

interface DatoProps {
  etiqueta: string;
  valor: string;
}

/** Un dato del histórico de la cuenta: etiqueta arriba, valor abajo. */
function Dato({ etiqueta, valor }: DatoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.dato} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Text variant="caption" color="textMuted">
        {etiqueta}
      </Text>
      <Text variant="small" weight="medium">
        {valor}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    errorAviso: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

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
    /** `flex: 1` para que el nombre se corte antes de empujar el indicador. */
    headerTexts: { flex: 1 },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    encabezado: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },

    resumen: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    deudaLinea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    tituloLista: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    filtros: { gap: theme.spacing.md },

    /** El aviso de que a esta persona no se le fía, con su motivo. */
    /** El chip no se estira: mide lo que su texto. */
    faltaDni: { alignItems: 'flex-start' },

    sinFiado: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

    aDevolver: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
    },

    /** Los tres datos del histórico, repartidos en una fila. */
    historico: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    dato: { flex: 1, gap: theme.spacing.xxs },

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
