import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Ban from 'lucide-react-native/icons/ban';
import FileX from 'lucide-react-native/icons/file-x';
import Plus from 'lucide-react-native/icons/plus';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatFechaHora, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { AnularFacturaDialogo, EstadoBadge, PagoItem, RegistrarPagoForm } from '../components';
import { useAnularFactura, useFactura, useRegistrarPago } from '../hooks';
import { nombreDeCliente, nombreDeEmisor, textoVencimiento, type FacturaItem } from '../types';

type FacturaRoute = RouteProp<RootStackParamList, typeof RootRoutes.FACTURA>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * Una factura emitida: a quién, qué se le cobró, cuánto debe y qué pagos entraron
 * (`docs/flujo_pagos.md` §4 y §7).
 *
 * Es a donde lleva tocar un renglón del tablero, y el único lugar donde se
 * anotan los cobros. **La factura en sí no se toca nunca**: el detalle, las
 * fechas y los importes quedan como se emitieron; lo único que se agrega o se
 * saca son pagos.
 *
 * ⚠️ Los importes se muestran tal como llegan. El backend los calculó con
 * decimales exactos; rehacer la cuenta acá es como el front termina mostrando
 * `$80.17000000000002`.
 */
export function FacturaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<FacturaRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const detalle = useFactura(params.facturaId);

  /**
   * Tirar para abajo vuelve a pedir la factura. Sirve incluso con la pantalla
   * abierta: el estado lo calcula el servidor con SU fecha, así que una factura
   * que vence hoy pasa a vencida sin que nadie toque nada.
   */
  const refresco = useRefrescar(detalle.refrescar);
  const factura = detalle.factura;

  /**
   * El formulario de cobro se abre a pedido. Cerrado por defecto: lo que más se
   * hace en esta pantalla es mirar cuánto debe, no cobrar.
   */
  const [cobrando, setCobrando] = useState(false);

  const cerrarCobro = useCallback(() => setCobrando(false), []);

  const registro = useRegistrarPago(params.facturaId, detalle.saldo, cerrarCobro);

  const abrirCobro = useCallback(() => {
    // Se limpia al abrir y no al cerrar: así el monto propuesto es el saldo de
    // AHORA, que después de un pago parcial ya no es el de la vez anterior.
    registro.limpiar();
    setCobrando(true);
  }, [registro]);

  const cancelarCobro = useCallback(() => {
    registro.limpiar();
    setCobrando(false);
  }, [registro]);

  /**
   * La confirmación de la baja. Va detrás de un diálogo porque **no se puede
   * deshacer**: una factura anulada queda anulada.
   */
  const [anulando, setAnulando] = useState(false);

  const cerrarAnulacion = useCallback(() => setAnulando(false), []);

  const anulacion = useAnularFactura(params.facturaId, cerrarAnulacion);

  const abrirAnulacion = useCallback(() => {
    // Se limpia al abrir: un motivo a medio escribir de un intento anterior no
    // tiene por qué reaparecer.
    anulacion.limpiar();
    setAnulando(true);
  }, [anulacion]);

  const cancelarAnulacion = useCallback(() => {
    anulacion.limpiar();
    setAnulando(false);
  }, [anulacion]);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * A la cuenta y no a la ficha: desde una factura lo que se quiere saber es si
   * la persona debe algo más —y la cuenta lo dice—, no cuándo se registró. La
   * ficha sigue estando en "Más → Todos los clientes".
   */
  const verCuenta = useCallback(() => {
    if (!factura) {
      return;
    }
    navigation.navigate(RootRoutes.CUENTA, {
      clienteId: factura.cliente.id,
      clienteNombre: nombreDeCliente(factura.cliente),
    });
  }, [navigation, factura]);

  const vencimiento = factura ? textoVencimiento(factura.estado, factura.diasParaVencer) : null;

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
            <Text variant="title" weight="semibold" accessibilityRole="header">
              {factura ? `Factura #${factura.numero}` : 'Factura'}
            </Text>
            {factura && (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {nombreDeCliente(factura.cliente)}
              </Text>
            )}
          </View>

          <View style={styles.headerAction}>
            {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
            {detalle.isFetching && !detalle.isLoading && !refresco.refrescando && (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                accessibilityLabel="Actualizando la factura"
              />
            )}
          </View>
        </View>

        {detalle.sinPermiso ? (
          <EmptyState
            icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No tenés acceso a esta factura"
            description="Tu rol no permite ver la facturación."
          />
        ) : detalle.noEncontrada ? (
          <EmptyState
            icon={<FileX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No encontramos esa factura"
            description="Puede que el tablero esté mostrando algo que ya no está."
            action={<Button label="Volver" variant="secondary" onPress={volver} />}
          />
        ) : detalle.mensajeError ? (
          <EmptyState
            icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No pudimos traer la factura"
            description={detalle.mensajeError}
            action={<Button label="Reintentar" onPress={detalle.reintentar} />}
          />
        ) : detalle.isLoading || !factura ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          // Desde que la pantalla tiene el formulario de cobro hay inputs abajo
          // de todo: en iOS el teclado los taparía (en Android lo resuelve el
          // `adjustResize` del manifiesto).
          <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={[
                styles.content,
                { paddingBottom: insets.bottom + theme.spacing.xxl },
              ]}
              refreshControl={refresco.control}
              // Tocar "Registrar" con el teclado abierto tiene que funcionar a la
              // primera: sin esto, el primer toque solo cierra el teclado.
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Estado ── */}
              <View style={styles.estado}>
                <EstadoBadge estado={factura.estado} />
                {factura.pagadaEn ? (
                  <Text variant="small" color="textMuted">
                    {`Cobrada el ${formatFecha(factura.pagadaEn)}`}
                  </Text>
                ) : (
                  vencimiento && (
                    <Text variant="small" color="textMuted">
                      {vencimiento}
                    </Text>
                  )
                )}
              </View>

              {/* ── Encabezado de la factura ── */}
              <View style={styles.card}>
                <Dato etiqueta="Cliente" valor={nombreDeCliente(factura.cliente)} />
                {/* Dos fechas con significados distintos: cuándo se emitió —lo puso
                    el servidor— y cuándo hay que pagarla, que es la que importa. */}
                <Dato etiqueta="Emitida el" valor={formatFecha(factura.fechaEmision)} />
                <Dato etiqueta="Vence el" valor={formatFecha(factura.fechaFin)} />
                {/* `creadaPor` es null si esa cuenta se borró: no se inventa un nombre. */}
                <Dato etiqueta="La emitió" valor={nombreDeEmisor(factura.creadaPor)} />
              </View>

              {/* ── Cuánto debe ──
                  Es lo primero que se busca al abrir una factura, así que va arriba
                  del detalle: "de cuánto era" es contexto, "cuánto falta" es la
                  pregunta. Los tres números vienen calculados del backend. */}
              <View style={styles.card}>
                <Dato etiqueta="Total" valor={formatMonto(factura.total)} />
                <Dato etiqueta="Cobrado" valor={formatMonto(factura.pagado)} />

                <View style={styles.saldo}>
                  <Text variant="body" weight="semibold">
                    {detalle.estaSaldada ? 'Saldo' : 'Debe'}
                  </Text>
                  <Text
                    variant="title"
                    weight="bold"
                    color={detalle.estaSaldada ? 'textMuted' : 'text'}
                  >
                    {formatMonto(factura.saldo)}
                  </Text>
                </View>
              </View>

              {/* ── Detalle ── */}
              <View style={styles.seccion}>
                <Text variant="body" weight="semibold">
                  Detalle
                </Text>

                <View style={styles.card}>
                  {factura.items.map((item) => (
                    <Renglon key={item.id} item={item} />
                  ))}

                  <View style={styles.total}>
                    <Text variant="body" weight="semibold">
                      Total
                    </Text>
                    <Text variant="title" weight="bold">
                      {formatMonto(factura.total)}
                    </Text>
                  </View>
                </View>
              </View>

              {factura.notas ? (
                <View style={styles.seccion}>
                  <Text variant="body" weight="semibold">
                    Notas
                  </Text>
                  <View style={styles.card}>
                    <Text variant="small">{factura.notas}</Text>
                  </View>
                </View>
              ) : null}

              {/* ── Cobros: lo único que se le agrega a una factura emitida ── */}
              <View style={styles.seccion}>
                <View style={styles.tituloSeccion}>
                  <Text variant="body" weight="semibold">
                    Cobros
                  </Text>
                  {detalle.pagos.length > 0 && (
                    <Text variant="caption" color="textMuted">
                      {detalle.pagos.length === 1 ? '1 pago' : `${detalle.pagos.length} pagos`}
                    </Text>
                  )}
                </View>

                {/*
                  Con la factura saldada —o anulada— no se ofrece cobrar: un pago
                  no puede superar el saldo ni anotarse contra una baja, así que el
                  botón solo llevaría al `400` (`Esta factura ya está paga.` o
                  `Esta factura está anulada: no se le pueden anotar cobros.`).
                */}
                {!detalle.estaSaldada &&
                  !detalle.estaAnulada &&
                  (cobrando ? (
                    <RegistrarPagoForm
                      control={registro.control}
                      saldo={detalle.saldo}
                      onEnviar={registro.enviar}
                      onCancelar={cancelarCobro}
                      enviando={registro.isSubmitting}
                      mensajeError={registro.mensajeError}
                    />
                  ) : (
                    <Button
                      label="Registrar un pago"
                      onPress={abrirCobro}
                      leftIcon={<Plus size={ICON_SIZE} color={theme.colors.onPrimary} />}
                      fullWidth
                    />
                  ))}

                {detalle.pagos.length > 0 ? (
                  <View style={styles.card}>
                    {detalle.pagos.map((pago) => (
                      <PagoItem
                        key={pago.id}
                        pago={pago}
                        // Sin tacho en una anulada: esos cobros quedan
                        // congelados como registro de lo que hay que devolver.
                        onBorrar={detalle.puedeBorrarPagos ? detalle.borrarPago : undefined}
                        borrando={detalle.borrandoPago}
                      />
                    ))}
                  </View>
                ) : (
                  <Text variant="small" color="textMuted">
                    {detalle.estaAnulada
                      ? 'Esta factura está anulada: no se le anotan cobros.'
                      : 'Todavía no entró ningún pago de esta factura.'}
                  </Text>
                )}

                {/* Error del borrado. El del alta lo muestra el formulario, pegado
                    a los campos que hay que corregir. */}
                {detalle.mensajeErrorPago && (
                  <View style={styles.error} accessible accessibilityRole="alert">
                    <Text variant="small" color="error">
                      {detalle.mensajeErrorPago}
                    </Text>
                  </View>
                )}

                {/* ── Baja ── */}
                {detalle.estaAnulada ? (
                  /*
                    Anulada: se dice por qué, quién y cuándo. Es el dato que
                    explica el número que falta en la numeración, así que va a la
                    vista y no escondido en un tooltip.
                  */
                  <View style={styles.anulada} accessible>
                    <Text variant="small" weight="semibold">
                      Factura anulada
                    </Text>
                    {factura.motivoAnulacion ? (
                      <Text variant="small" color="textMuted">
                        {factura.motivoAnulacion}
                      </Text>
                    ) : null}
                    <Text variant="caption" color="textMuted">
                      {`La anuló ${nombreDeEmisor(factura.anuladaPor)}${
                        factura.anuladaEn ? ` · ${formatFechaHora(factura.anuladaEn)}` : ''
                      }`}
                    </Text>
                  </View>
                ) : detalle.puedeAnular ? (
                  <Button
                    label="Anular la factura"
                    variant="danger"
                    onPress={abrirAnulacion}
                    leftIcon={<Ban size={ICON_SIZE} color={theme.colors.onError} />}
                    fullWidth
                  />
                ) : null}

                {/*
                  ── Devolución ──
                  Solo en una anulada que ya se había cobrado. La plata se
                  devuelve AFUERA del sistema: acá solo se anota que se hizo,
                  para que el aviso deje de aparecer. Si desapareciera sola, en
                  tres meses nadie se acordaría de que esa plata entró.
                */}
                {detalle.hayQueDevolver && (
                  <View style={styles.reembolso} accessible accessibilityRole="alert">
                    <Text variant="small" weight="semibold" color="error">
                      {`Hay que devolverle ${formatMonto(detalle.aReembolsar)}`}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      Se había cobrado antes de anularla. La devolución se arregla por fuera del
                      sistema; acá solo se marca que ya se hizo.
                    </Text>
                    <Button
                      label="Ya se lo devolví"
                      variant="secondary"
                      onPress={detalle.marcarReembolso}
                      loading={detalle.guardandoReembolso}
                      disabled={detalle.guardandoReembolso}
                      fullWidth
                    />
                  </View>
                )}

                {detalle.estaReembolsado && factura.reembolsadoEn && (
                  <View style={styles.anulada} accessible>
                    <Text variant="small" weight="semibold">
                      Plata devuelta
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {`La marcó ${nombreDeEmisor(factura.reembolsadoPor)} · ${formatFechaHora(
                        factura.reembolsadoEn,
                      )}`}
                    </Text>
                    {/* Deshacer, para cuando se apretó sin querer. */}
                    <Link label="Deshacer la marca" onPress={detalle.deshacerReembolso} />
                  </View>
                )}

                {detalle.mensajeErrorReembolso && (
                  <View style={styles.error} accessible accessibilityRole="alert">
                    <Text variant="small" color="error">
                      {detalle.mensajeErrorReembolso}
                    </Text>
                  </View>
                )}

                <Link label="Ver la cuenta del cliente" onPress={verCuenta} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>

      {/*
        Hermano de la pantalla y no hijo: el diálogo es una view absoluta que
        cubre a su PADRE, y adentro del `View` con `paddingTop` el fondo oscuro
        se comería la franja de la barra de estado.
      */}
      {factura && (
        <AnularFacturaDialogo
          visible={anulando}
          numero={factura.numero}
          pagado={factura.pagado}
          control={anulacion.control}
          onConfirmar={anulacion.enviar}
          onCancelar={cancelarAnulacion}
          anulando={anulacion.isSubmitting}
          mensajeError={anulacion.mensajeError}
        />
      )}
    </>
  );
}

/** Un renglón del detalle: `3 × Bidón 20L · $19,99 c/u` y su subtotal. */
function Renglon({ item }: { item: FacturaItem }) {
  const theme = useTheme();
  const styles = useMemo(() => createRenglonStyles(theme), [theme]);

  return (
    // Se lee como una unidad: "3 por Bidón 20L, 19,99 cada uno, 59,97".
    <View style={styles.fila} accessible>
      <View style={styles.producto}>
        <Text variant="small" weight="medium" numberOfLines={2}>
          {`${item.cantidad} × ${item.producto}`}
        </Text>
        <Text variant="caption" color="textMuted">
          {/* La especie al lado del precio: es con lo que este renglón se agrupa
              (`docs/flujo_especies.md`). Las facturas viejas, de antes del
              catálogo, no la traen y ahí la línea sale sola. */}
          {[`${formatMonto(item.precioUnitario)} c/u`, item.especie?.nombre]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      {/* El subtotal viene hecho del backend: no se recalcula acá. */}
      <Text variant="small" weight="medium">
        {formatMonto(item.subtotal)}
      </Text>
    </View>
  );
}

const createRenglonStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    /** El nombre se queda con el sobrante y se corta él, no el importe. */
    producto: { flex: 1, gap: theme.spacing.xxs },
  });

interface DatoProps {
  etiqueta: string;
  valor: string;
}

/** Una fila etiqueta/valor del encabezado. */
function Dato({ etiqueta, valor }: DatoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createRenglonStyles(theme), [theme]);

  return (
    <View style={styles.fila} accessible>
      <Text variant="small" color="textMuted">
        {etiqueta}
      </Text>
      <View style={styles.producto}>
        <Text variant="small" align="right" numberOfLines={2}>
          {valor}
        </Text>
      </View>
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
      gap: theme.spacing.xl,
    },
    seccion: { gap: theme.spacing.md },

    estado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },

    card: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    total: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    /** Misma forma que el total del detalle: es el número que cierra la tarjeta. */
    saldo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },

    tituloSeccion: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    error: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

    /**
     * El cartel de la plata a devolver. Va en tono de error y no apagado: es lo
     * único de una factura anulada que todavía pide que alguien haga algo.
     */
    reembolso: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

    /** El cartel de la baja: apagado, como su badge — ya no hay nada que cobrar. */
    anulada: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
