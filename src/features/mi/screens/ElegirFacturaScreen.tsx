import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import FileCheck from 'lucide-react-native/icons/file-check';
import Hourglass from 'lucide-react-native/icons/hourglass';
import ImageOff from 'lucide-react-native/icons/image-off';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import X from 'lucide-react-native/icons/x';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { ComprobanteCompartido } from '@/services/share';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { useRefrescar } from '@/shared/hooks';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useAppSelector } from '@/store';
import { useTheme, type Theme } from '@/theme';
import { ComprobanteAdjunto, InformarPagoForm, SelectorDeFactura } from '../components';
import { useAvisarConComprobante } from '../hooks';
import { selectComprobantePendiente } from '../store';
import { cuandoVence, MEDIO_DE_PAGO_LABEL } from '../types';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * **A qué factura corresponde el comprobante que compartiste**
 * (`docs/compartir_comprobante.md` §3).
 *
 * Es la pantalla que aparece cuando alguien paga en su billetera, toca
 * "Compartir comprobante" y elige Morgana. Entrando por acá el cliente llega
 * **con la imagen y sin nada más**, así que el orden de la pantalla es el que
 * pide el doc y no es negociable:
 *
 * 1. **la miniatura arriba de todo** — viene de otra app y lo primero que
 *    necesita es ver que se compartió lo que quería;
 * 2. **a qué factura corresponde** — solo las impagas, lo que vence primero
 *    arriba, y salteado si tiene una sola;
 * 3. **los datos del pago** — con el monto ya precargado con el saldo.
 *
 * ⚠️ Lo mismo que en `InformarPagoScreen`, porque es el mismo aviso: **esto no
 * descuenta nada**. Por eso la pantalla no se cierra al mandar sino que termina
 * en un cartel que dice que la deuda sigue igual y por qué.
 *
 * ⚠️ **El comprobante se congela al montar.** Al llegar el `201` el pendiente se
 * borra del store, y si la pantalla leyera de ahí se quedaría sin imagen justo
 * cuando tiene que mostrar el cartel de éxito.
 */
export function ElegirFacturaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const pendiente = useAppSelector(selectComprobantePendiente);
  // Se congela: ver el ⚠️ de arriba. El estado inicial de `useState` se lee una
  // sola vez, que es exactamente lo que hace falta acá.
  const [comprobante] = useState(pendiente);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={volver}
          style={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <X size={ICON_SIZE} color={theme.colors.text} />
        </Pressable>

        <View style={styles.headerTexts}>
          <Text variant="title" weight="semibold" accessibilityRole="header" numberOfLines={1}>
            Avisar que pagué
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Con el comprobante que compartiste
          </Text>
        </View>

        <View style={styles.headerAction} />
      </View>

      {comprobante ? (
        <ElAviso comprobante={comprobante} onVolver={volver} />
      ) : (
        /*
          Se puede llegar acá sin nada: el pendiente venció mientras la app
          estaba cerrada, o alguien navegó a la ruta a mano. Se dice, en vez de
          mostrar un formulario sin imagen que después el backend rechaza.
        */
        <EmptyState
          icon={<ImageOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No hay ningún comprobante"
          description="Compartí la captura del pago desde tu billetera y elegí Morgana."
          action={<Button label="Volver" variant="secondary" onPress={volver} />}
        />
      )}
    </View>
  );
}

interface ElAvisoProps {
  comprobante: ComprobanteCompartido;
  onVolver: () => void;
}

/**
 * El cuerpo, montado recién con un comprobante en la mano.
 *
 * Va aparte para que el hook —que trae las facturas y arma el formulario— no
 * corra en el caso de "no hay nada compartido": ahí no hay nada que traer.
 */
function ElAviso({ comprobante, onVolver }: ElAvisoProps) {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const aviso = useAvisarConComprobante(comprobante);
  const refresco = useRefrescar(aviso.refrescar);

  const verMisAvisos = useCallback(() => {
    navigation.navigate(RootRoutes.MIS_AVISOS);
  }, [navigation]);

  const verMisFacturas = useCallback(() => {
    navigation.navigate(RootRoutes.MIS_FACTURAS);
  }, [navigation]);

  /**
   * Tirar la imagen a propósito: se compartió la que no era.
   *
   * Es una acción aparte y de poco peso, **separada de "Cancelar"**. Cancelar
   * solo cierra: el pendiente queda guardado y se retoma al volver, que es lo
   * que pide el doc —*"nunca descartes la imagen"* (§5.1)—, porque si se pierde
   * hay que volver a la billetera y compartir de nuevo. Descartar, en cambio, es
   * lo que se elige cuando la imagen efectivamente no sirve.
   */
  const descartarYVolver = useCallback(() => {
    aviso.descartar();
    onVolver();
  }, [aviso, onVolver]);

  const enviado = aviso.avisado;

  if (enviado) {
    /*
      Ya se mandó. Lo importante de este cartel no es el "listo": es que la deuda
      **sigue igual** y hay que decir por qué (§7). El `factura.saldo` que
      devuelve el 201 lo confirma — llega sin tocar.
    */
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avisado} accessible accessibilityRole="alert">
          <Hourglass size={ICON_SIZE} color={theme.colors.primary} />
          <Text variant="title" weight="semibold">
            Avisado, esperando confirmación
          </Text>
          <Text variant="small" color="textMuted">
            {`Nos dijiste que pagaste ${formatMonto(enviado.monto)} de la factura #${
              enviado.factura.numero
            } por ${MEDIO_DE_PAGO_LABEL[enviado.medio].toLowerCase()}, con tu comprobante.`}
          </Text>
          <Text variant="small">
            {`Tu deuda de esa factura sigue en ${formatMonto(
              enviado.factura.saldo,
            )} porque todavía no lo confirmamos. Lo revisamos contra el banco y te avisamos por la campanita.`}
          </Text>
        </View>

        <Button label="Ver mis avisos" onPress={verMisAvisos} fullWidth />
        <Button label="Cerrar" variant="secondary" onPress={onVolver} fullWidth />
      </ScrollView>
    );
  }

  if (aviso.mensajeErrorLista) {
    return (
      <EmptyState
        icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
        title="No pudimos traer tus facturas"
        description={aviso.mensajeErrorLista}
        action={<Button label="Reintentar" onPress={aviso.reintentar} />}
      />
    );
  }

  if (aviso.isLoading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (aviso.sinImpagas) {
    /*
      Pagó, ya se lo confirmaron, y comparte igual (§5.3). Se dice con todas las
      letras: un selector sin opciones no explica nada y deja al cliente
      esperando que aparezca algo.
    */
    return (
      <EmptyState
        icon={<FileCheck size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
        title="No tenés facturas pendientes"
        description="Está todo pago, así que no hay a qué imputar este comprobante."
        action={<Button label="Ver mi cuenta" onPress={verMisFacturas} />}
      />
    );
  }

  const elegida = aviso.facturaElegida;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      /*
        El gesto solo mientras se está eligiendo la factura. Con el formulario a
        la vista se apaga a propósito: no queda nada del servidor por traer, y
        tirar para abajo arriba de campos ya escritos se lee como que se borra
        lo cargado.
      */
      refreshControl={elegida ? undefined : refresco.control}
    >
      {/* 1. La miniatura, antes que cualquier campo. */}
      <ComprobanteAdjunto comprobante={comprobante} />

      {/* 2. A qué factura corresponde. */}
      <View style={styles.seccion}>
        <Text variant="body" weight="semibold">
          ¿A qué factura corresponde?
        </Text>

        {aviso.unicaFactura && elegida ? (
          /*
            Una sola impaga: se muestra ya elegida y sin selector (§3). Es el
            caso más común y ahorra un paso; una lista de un solo renglón para
            tocar es un trámite, no una elección.
          */
          <View style={styles.unica}>
            <View style={styles.linea}>
              <Text variant="body" weight="semibold">
                {`#${elegida.numero}`}
              </Text>
              <Text variant="small" weight="semibold">
                {formatMonto(elegida.saldo)}
              </Text>
            </View>
            <Text variant="caption" color="textMuted">
              {`Vence ${formatFecha(elegida.fechaFin)} · ${cuandoVence(elegida.diasParaVencer)}`}
            </Text>
            <Text variant="caption" color="textMuted">
              Es la única que tenés sin pagar.
            </Text>
          </View>
        ) : (
          <SelectorDeFactura
            facturas={aviso.facturas}
            facturaId={aviso.facturaId}
            onElegir={aviso.elegirFactura}
            yaAvisadas={aviso.yaAvisadas}
          />
        )}
      </View>

      {/* 3. Los datos del pago. Recién con una factura elegida: el monto que se
             propone y los topes que se validan son suyos. */}
      {elegida ? (
        <View style={styles.seccion}>
          {aviso.yaInformado > 0 && (
            <Text variant="small" color="textMuted">
              {`Ya avisaste ${formatMonto(
                aviso.yaInformado,
              )} de esta factura que todavía no confirmamos, así que podés informar hasta ${formatMonto(
                aviso.maximo,
              )}.`}
            </Text>
          )}

          <InformarPagoForm
            control={aviso.control}
            maximo={aviso.maximo}
            fechaEmision={elegida.fechaEmision}
            onEnviar={aviso.enviar}
            /*
              Sin `onComprobante`: por acá no se adjunta nada. La imagen vino de
              la billetera y ya se está mostrando arriba de todo, así que un
              selector abajo sería ofrecer cambiar justo lo único que en este
              camino no hace falta cambiar. Se pasa igual para que la regla del
              medio obligatorio la vea satisfecha y no apague el botón.
            */
            comprobante={comprobante}
            // Cerrar, no descartar: el comprobante queda esperando.
            onCancelar={onVolver}
            enviando={aviso.enviando}
            mensajeError={aviso.mensajeError}
          />

          {/*
            El 503 es el único que se arregla mandando de nuevo: si la imagen no
            se pudo guardar, el backend borra el aviso antes de contestar, así
            que reintentar no duplica nada (§6). Ya se reintentó solo una vez
            antes de llegar acá; esto es para la segunda.
          */}
          {aviso.sePuedeReintentar && (
            <View style={styles.reintento}>
              <RotateCw size={ICON_SIZE} color={theme.colors.textMuted} />
              <View style={styles.reintentoTexto}>
                <Text variant="caption" color="textMuted">
                  No quedó nada registrado, así que podés mandarlo de nuevo sin duplicar el aviso.
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <Text variant="small" color="textMuted">
          Elegí una factura para seguir.
        </Text>
      )}

      {/*
        Compartió la captura equivocada. Va abajo y sin peso: el camino normal es
        mandarlo, y salir sin mandar ya lo resuelve "Cancelar" —que lo deja
        esperando— sin perder nada.
      */}
      <Button label="No es este comprobante" variant="ghost" onPress={descartarYVolver} fullWidth />
    </ScrollView>
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
      gap: theme.spacing.lg,
    },
    seccion: { gap: theme.spacing.sm },

    unica: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    linea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    avisado: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: theme.radius.lg,
    },

    reintento: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al ícono. */
    reintentoTexto: { flex: 1 },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
