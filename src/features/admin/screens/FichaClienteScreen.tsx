import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import FileText from 'lucide-react-native/icons/file-text';
import Lock from 'lucide-react-native/icons/lock';
import ShoppingBasket from 'lucide-react-native/icons/shopping-basket';
import UserRound from 'lucide-react-native/icons/user-round';
import UserX from 'lucide-react-native/icons/user-x';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  ElRitmoDeCompra,
  IdentidadDelCliente,
  LaPlataDelCliente,
  LasDemoras,
  LasFacturasDelCliente,
  LosReembolsos,
  PatasDelCumplimiento,
  QueSeLleva,
  TarjetaMetrica,
} from '../components';
import { useFichaCliente } from '../hooks';
import { formatDias, formatTasa, resumenDeAtraso, sinFiado, textoAtrasoActual } from '../types';

type FichaClienteRoute = RouteProp<RootStackParamList, typeof RootRoutes.FICHA_CLIENTE>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * La ficha de un cliente (`docs/flujo_metricas_cliente.md`): **"¿qué clase de
 * cliente es este?"**. Es a donde lleva tocar un renglón del listado de
 * métricas por cliente.
 *
 * Lo único que hay que entender para leerla: **cumplir no es pagar**. Una
 * factura vencida pudo terminar de tres maneras y solo una es cumplir —pagarla
 * en fecha—, así que un cliente que paga todo con veinte días de atraso tiene
 * una tasa baja sin deberte un peso. Por eso la tasa **nunca va sola**: al lado
 * van las tres patas de la cuenta y los días de atraso.
 *
 * ⚠️ **No reemplaza a la cuenta corriente.** Aquella trae sus facturas una por
 * una y sirve para ir a cobrar una puntual; esta es la lectura de todas juntas
 * y sirve para decidir si le seguís fiando. Por eso el pie enlaza a las dos
 * pantallas donde se actúa.
 *
 * Sin lógica de negocio: todo sale de `useFichaCliente`.
 */
export function FichaClienteScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<FichaClienteRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const detalle = useFichaCliente(params.clienteId);
  const refresco = useRefrescar(detalle.refrescar);
  const ficha = detalle.ficha;

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  // El nombre de la respuesta cuando llegó, y el del param mientras carga: el
  // encabezado tiene que decir de quién es la ficha desde el primer cuadro.
  const nombre = ficha?.cliente.nombre ?? params.clienteNombre;

  const verCuenta = useCallback(() => {
    navigation.navigate(RootRoutes.CUENTA, {
      clienteId: params.clienteId,
      clienteNombre: nombre,
    });
  }, [navigation, params.clienteId, nombre]);

  const verFichaDeCliente = useCallback(() => {
    // La ficha de la persona, que es donde viven las acciones: facturarle,
    // cortarle el fiado, cargarle el DNI. Acá solo se lee.
    navigation.navigate(RootRoutes.CLIENTE, {
      clienteId: params.clienteId,
      clienteNombre: nombre,
    });
  }, [navigation, params.clienteId, nombre]);

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
          <Text variant="title" weight="semibold" numberOfLines={1} accessibilityRole="header">
            {nombre}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Qué clase de cliente es
          </Text>
        </View>

        {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
        <View style={styles.headerAction}>
          {detalle.isFetching && !detalle.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando la ficha"
            />
          )}
        </View>
      </View>

      {detalle.sinPermiso ? (
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esta sección no es para tu cuenta"
          description={
            detalle.mensajeError ?? 'Las métricas del negocio las ven solo los administradores.'
          }
        />
      ) : detalle.noExiste ? (
        /* No existe **o no es un cliente**: la ficha de un administrador no
           devuelve nada. Sin botón de reintentar: volver a pedirla daría igual. */
        <EmptyState
          icon={<UserX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No encontramos a esa persona"
          description={
            detalle.mensajeError ?? 'Puede que la cuenta ya no exista o que no sea un cliente.'
          }
          action={<Button label="Volver" variant="secondary" onPress={volver} />}
        />
      ) : detalle.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer la ficha"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={detalle.mensajeError}
          action={<Button label="Reintentar" onPress={detalle.reintentar} />}
        />
      ) : detalle.isLoading || !ficha ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.spacing.xl },
          ]}
          refreshControl={refresco.control}
        >
          <IdentidadDelCliente cliente={ficha.cliente} estadoDeCuenta={ficha.estado} />

          {detalle.sinCompras ? (
            /* Existe, pero nunca se le facturó. No es un error ni una pantalla a
               medias: "todavía no compró nada" es la respuesta correcta a la
               pregunta, y una pared de ceros diría menos. */
            <View style={styles.vacio}>
              <ShoppingBasket size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />
              <Text variant="body" weight="semibold" align="center">
                Todavía no compró nada
              </Text>
              <Text variant="caption" color="textMuted" align="center">
                Sin facturas no hay nada que medir. Los números aparecen con la primera que se le
                emita.
              </Text>
            </View>
          ) : (
            <>
              {/* ── Cómo paga ── */}
              <View style={styles.fila}>
                <TarjetaMetrica
                  etiqueta="Cumple"
                  valor={formatTasa(ficha.cumplimiento.tasa)}
                  detalle={
                    ficha.cumplimiento.tasa === null
                      ? 'Sin vencimientos todavía'
                      : `${ficha.cumplimiento.enFecha} de ${ficha.cumplimiento.exigibles} en fecha`
                  }
                />
                {/*
                  ⚠️ El valor sale de `comoPaga` y no de mirar si la demora es
                  `null`: sin pagos, las tres demoras vienen nulas igual que en
                  el cliente impecable, y "Nunca" a secas dejaría al que nunca
                  pagó nada mejor parado que al que se atrasa dos días.

                  Y el atraso de HOY manda sobre el historial: si tiene una
                  colgada, eso es lo que hay que ver acá.
                */}
                <TarjetaMetrica
                  etiqueta="Se atrasa"
                  valor={resumenDeAtraso(ficha.cumplimiento, ficha.facturas)}
                  detalle={
                    textoAtrasoActual(ficha.cumplimiento.atrasoActual) ??
                    (ficha.cumplimiento.demoraMaxima == null
                      ? 'Sin atrasos en su historial'
                      : `Peor caso: ${formatDias(ficha.cumplimiento.demoraMaxima)}`)
                  }
                  tono={ficha.cumplimiento.atrasoActual == null ? undefined : 'statusLate'}
                />
                <TarjetaMetrica
                  etiqueta="Debe"
                  valor={formatMonto(ficha.plata.deuda)}
                  detalle={
                    ficha.plata.vencido > 0
                      ? `${formatMonto(ficha.plata.vencido)} vencido`
                      : 'Nada vencido'
                  }
                  // El color es de lo vencido, no de la deuda: deber estando en
                  // fecha es normal y pintarlo de rojo sería una falsa alarma.
                  tono={ficha.plata.vencido > 0 ? 'statusLate' : undefined}
                />
              </View>

              {/* La tasa nunca sola: es lo que evita que un 20 % se lea como
                  "no paga" cuando el cliente paga todo, solo que tarde. */}
              <PatasDelCumplimiento cumplimiento={ficha.cumplimiento} facturas={ficha.facturas} />

              {/* ── Cuántas tiene abiertas y hace cuánto que no aparece ── */}
              <View style={styles.fila}>
                <TarjetaMetrica
                  etiqueta="Facturas abiertas"
                  valor={`${ficha.facturas.activas}`}
                  detalle={`de ${ficha.facturas.total} en total`}
                />
                <TarjetaMetrica
                  etiqueta="Vencidas"
                  valor={`${ficha.facturas.vencidas}`}
                  detalle={ficha.facturas.vencidas > 0 ? 'Hay que llamar' : 'Ninguna'}
                  tono={ficha.facturas.vencidas > 0 ? 'statusLate' : undefined}
                />
                <TarjetaMetrica
                  etiqueta="Sin comprar"
                  valor={formatDias(ficha.compras.diasSinComprar)}
                  // El número de fuga se lee contra el ritmo, nunca solo.
                  detalle={
                    ficha.compras.diasEntreCompras === null
                      ? 'Compró una sola vez'
                      : `Compra cada ${formatDias(ficha.compras.diasEntreCompras)}`
                  }
                />
              </View>

              <LasDemoras datos={ficha.cumplimiento} facturas={ficha.facturas} />

              {/* Qué se lleva: avisa que algo cambió **antes** de que se note en
                  la deuda. Va arriba de la plata a propósito — el que dejó de
                  llevar lo de siempre todavía paga bien. */}
              {ficha.especies && ficha.especies.length > 0 && (
                <QueSeLleva especies={ficha.especies} />
              )}

              <LaPlataDelCliente datos={ficha.plata} />
              <LasFacturasDelCliente datos={ficha.facturas} />
              <ElRitmoDeCompra datos={ficha.compras} />

              {/* Solo si hubo alguna: en cero no es una métrica, es ruido. */}
              {(ficha.reembolsos.pendientes > 0 || ficha.reembolsos.hechos > 0) && (
                <LosReembolsos datos={ficha.reembolsos} />
              )}
            </>
          )}

          {/* ── A dónde se sigue ──
              Esta pantalla se lee, no se opera: la deuda factura por factura vive
              en la cuenta corriente y las acciones sobre la persona —facturarle,
              cortarle el fiado, cargarle el DNI— en su ficha. */}
          <View style={styles.acciones}>
            <Button
              label="Ver su cuenta corriente"
              onPress={verCuenta}
              leftIcon={<FileText size={ICON_SIZE} color={theme.colors.onPrimary} />}
              accessibilityLabel={`Ver la cuenta y las facturas de ${nombre}`}
              fullWidth
            />
            <Button
              label="Ver su ficha"
              variant="secondary"
              onPress={verFichaDeCliente}
              leftIcon={<UserRound size={ICON_SIZE} color={theme.colors.primary} />}
              accessibilityLabel={`Ver la ficha de ${nombre}`}
              fullWidth
            />
            <Text variant="micro" color="textMuted" align="center">
              {sinFiado(ficha.cliente)
                ? 'En su ficha se le factura, se le devuelve el fiado y se le carga el DNI.'
                : 'En su ficha se le factura, se le corta el fiado y se le carga el DNI.'}
            </Text>
          </View>
        </ScrollView>
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
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },

    /** Las tarjetas chicas, repartidas en partes iguales. */
    fila: { flexDirection: 'row', gap: theme.spacing.sm },

    vacio: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    acciones: { gap: theme.spacing.sm, paddingTop: theme.spacing.sm },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
