import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Ban from 'lucide-react-native/icons/ban';
import FilePlus from 'lucide-react-native/icons/file-plus';
import FileText from 'lucide-react-native/icons/file-text';
import HandCoins from 'lucide-react-native/icons/hand-coins';
import IdCard from 'lucide-react-native/icons/id-card';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import UserMinus from 'lucide-react-native/icons/user-minus';
import UserX from 'lucide-react-native/icons/user-x';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { Chip } from '@/shared/ui/atoms/Chip';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatearDni, formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { AvatarIniciales, BloquearFiadoDialogo, CargarDniDialogo } from '../components';
import { useCargarDni, useCliente, useFiado } from '../hooks';
import {
  estaDadaDeBaja,
  faltaDni,
  identificadorUsuario,
  nombreUsuario,
  rolLabel,
  sinFiado,
} from '../types';

type ClienteRoute = RouteProp<RootStackParamList, typeof RootRoutes.CLIENTE>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * La ficha de un cliente: quién es y qué se le puede hacer.
 *
 * Es el paso del medio entre el listado y las acciones. Existe para que el
 * listado se pueda leer de un vistazo —una línea por persona— y para que lo que
 * se le hace a alguien pase primero por abrir a esa persona: en una lista, un
 * botón que emite una factura está a un toque de distancia del cliente
 * equivocado.
 *
 * Las dos acciones son de facturación: **emitirle una factura** y **ver su
 * cuenta** —cuánto debe y todas sus facturas—, que es la misma pantalla a la que
 * lleva el tablero. Del resto de la cuenta no hay nada que editar: no existen
 * endpoints para eso (`docs/s.roles.md`).
 */
export function ClienteScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<ClienteRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const ficha = useCliente(params.clienteId);

  /**
   * Cortarle el fiado: se pide el motivo en un diálogo antes de mandarlo. Es lo
   * que va a leer el que atienda cuando esta persona vuelva al mostrador, así
   * que sin eso la marca no dice nada.
   */
  const [bloqueando, setBloqueando] = useState(false);

  const cerrarBloqueo = useCallback(() => setBloqueando(false), []);

  const fiado = useFiado(params.clienteId, cerrarBloqueo);

  const abrirBloqueo = useCallback(() => {
    // Se limpia al abrir: un motivo a medio escribir de un intento anterior no
    // tiene por qué reaparecer.
    fiado.limpiar();
    setBloqueando(true);
  }, [fiado]);

  const cancelarBloqueo = useCallback(() => {
    fiado.limpiar();
    setBloqueando(false);
  }, [fiado]);

  /**
   * Cargarle o corregirle el documento (`docs/flujo_login.md`). Es la otra
   * salida del bloqueo: la persona puede cargarlo sola una vez, pero si se
   * equivocó no puede cambiarlo — eso solo se arregla desde acá.
   */
  const [cargandoDni, setCargandoDni] = useState(false);

  const cerrarDni = useCallback(() => setCargandoDni(false), []);

  const dni = useCargarDni(params.clienteId, cerrarDni);

  const abrirDni = useCallback(() => {
    // Se limpia al abrir: un documento a medio tipear de un intento anterior no
    // tiene por qué reaparecer, y menos este dato.
    dni.limpiar();
    setCargandoDni(true);
  }, [dni]);

  const cancelarDni = useCallback(() => {
    dni.limpiar();
    setCargandoDni(false);
  }, [dni]);

  /** Tirar para abajo vuelve a pedir la ficha. */
  const refresco = useRefrescar(ficha.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  // El nombre de la ficha si ya llegó; si no, el que trajo el listado. Así el
  // encabezado dice a quién estás mirando desde el primer frame.
  const nombre = ficha.cliente ? nombreUsuario(ficha.cliente) : params.clienteNombre;

  const facturar = useCallback(() => {
    navigation.navigate(RootRoutes.NUEVA_FACTURA, {
      clienteId: params.clienteId,
      clienteNombre: nombre,
      // La marca viaja al formulario para avisarla ahí: el backend acepta la
      // factura igual, así que el aviso es lo único que evita fiarle sin querer.
      sinFiado: ficha.cliente ? sinFiado(ficha.cliente) : false,
      motivoSinFiado: ficha.cliente?.motivoSinFiado ?? undefined,
    });
  }, [navigation, params.clienteId, nombre, ficha.cliente]);

  /**
   * La cuenta del cliente: cuánto debe y todas sus facturas con su saldo. Es la
   * misma pantalla a la que lleva el tablero de facturación
   * (`docs/flujo_pagos.md` §4), así que se llega igual desde los dos lados.
   */
  const verCuenta = useCallback(() => {
    navigation.navigate(RootRoutes.CUENTA, {
      clienteId: params.clienteId,
      clienteNombre: nombre,
    });
  }, [navigation, params.clienteId, nombre]);

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
            <Text variant="title" weight="semibold" numberOfLines={1} accessibilityRole="header">
              {nombre}
            </Text>
            <Text variant="caption" color="textMuted">
              Ficha del cliente
            </Text>
          </View>

          {/* Ocupa el mismo lugar que el botón de volver para que el título quede
              quieto cuando el indicador aparece y desaparece. */}
          <View style={styles.headerAction}>
            {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
            {ficha.isFetching && !ficha.isLoading && !refresco.refrescando && (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                accessibilityLabel="Actualizando la ficha"
              />
            )}
          </View>
        </View>

        {ficha.sinPermiso ? (
          <EmptyState
            icon={<ShieldAlert size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No tenés acceso a esta ficha"
            description="Tu rol no permite ver los clientes de la app."
          />
        ) : ficha.noEncontrado ? (
          <EmptyState
            icon={<UserX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No encontramos ese cliente"
            // Un 404 acá también significa que el id es de una cuenta de
            // administración: en este apartado solo existen los clientes.
            description="La cuenta no existe o no es la de un cliente."
            action={<Button label="Volver al listado" variant="secondary" onPress={volver} />}
          />
        ) : ficha.mensajeError ? (
          <EmptyState
            icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No pudimos traer la ficha"
            description={ficha.mensajeError}
            action={<Button label="Reintentar" onPress={ficha.reintentar} />}
          />
        ) : ficha.isLoading || !ficha.cliente ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + theme.spacing.xxl },
            ]}
            refreshControl={refresco.control}
          >
            {/* ── Quién es ── */}
            <View style={styles.identidad} accessible>
              <AvatarIniciales nombre={nombre} size="lg" />
              <Text variant="title" weight="semibold" align="center" numberOfLines={2}>
                {nombre}
              </Text>
              {identificadorUsuario(ficha.cliente) !== nombre && (
                <Text variant="small" color="textMuted" numberOfLines={1}>
                  {identificadorUsuario(ficha.cliente)}
                </Text>
              )}
              <View style={styles.chips}>
                <Chip label={rolLabel(ficha.cliente.rol)} tone="brand" />
                {/* Las dos marcas al lado del rol: es lo primero que hay que ver
                    de esta persona. Ámbar es un dato que falta —se completa—;
                    rojo es una advertencia sobre ella. */}
                {estaDadaDeBaja(ficha.cliente) && <Chip label="Dada de baja" tone="danger" />}
                {faltaDni(ficha.cliente) && <Chip label="Falta el DNI" tone="warning" />}
                {sinFiado(ficha.cliente) && <Chip label="No se le fía" tone="danger" />}
              </View>
            </View>

            {/*
              ── Se dio de baja (`docs/README_FRONT_BAJA_DE_CUENTA.md` §8) ──

              Está acá arriba y no al pie porque **cambia cómo se la trata**:
              sigue en el listado y en el tablero porque hay algo que cobrarle,
              pero ya no entra a la app. Sin este cartel, quien la llame le va a
              decir "fijate en la app" y la persona no va a poder.
            */}
            {estaDadaDeBaja(ficha.cliente) && (
              <View style={styles.dadaDeBaja} accessible accessibilityRole="alert">
                <View style={styles.sinFiadoTitulo}>
                  <UserMinus size={ICON_SIZE} color={theme.colors.error} />
                  <Text variant="small" weight="semibold" color="error">
                    Pidió eliminar su cuenta
                  </Text>
                </View>
                {ficha.cliente.dadaDeBajaEn ? (
                  <Text variant="small" color="textMuted">
                    {`El ${formatFechaHora(ficha.cliente.dadaDeBajaEn)}.`}
                  </Text>
                ) : null}
                <Text variant="caption" color="textMuted">
                  Ya no puede entrar a la app, así que no la mandes ahí: hablale por teléfono o por
                  correo. De su perfil quedó solo lo que hace falta para avisarle de la deuda, y
                  cuando la salde se borra todo solo.
                </Text>
              </View>
            )}

            {/* ── El documento ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Documento
              </Text>

              {faltaDni(ficha.cliente) ? (
                /*
                  Dato faltante, no castigo: ámbar y con la salida al lado. Lo que
                  este cliente NO puede es usar la app; en el mostrador se le
                  factura, se le cobra y se le anula igual.
                */
                <View style={styles.faltaDni} accessible>
                  <View style={styles.faltaDniTitulo}>
                    <IdCard size={ICON_SIZE} color={theme.colors.onWarningMuted} />
                    <Text variant="small" weight="semibold" color="onWarningMuted">
                      Falta el DNI
                    </Text>
                  </View>
                  <Text variant="small" color="textMuted">
                    Sin el documento no puede usar la app. Facturarle, cobrarle y anularle funciona
                    igual.
                  </Text>
                </View>
              ) : (
                <View style={styles.dniCargado}>
                  <Text variant="small" color="textMuted">
                    DNI
                  </Text>
                  <Text variant="body" weight="semibold">
                    {ficha.cliente.dni ? formatearDni(ficha.cliente.dni) : 'Sin cargar'}
                  </Text>
                </View>
              )}

              <Button
                label={faltaDni(ficha.cliente) ? 'Cargar DNI' : 'Corregir DNI'}
                variant={faltaDni(ficha.cliente) ? 'primary' : 'secondary'}
                onPress={abrirDni}
                disabled={dni.isSubmitting}
                leftIcon={
                  <IdCard
                    size={ICON_SIZE}
                    color={faltaDni(ficha.cliente) ? theme.colors.onPrimary : theme.colors.primary}
                  />
                }
                accessibilityLabel={
                  faltaDni(ficha.cliente)
                    ? `Cargar el documento de ${nombre}`
                    : `Corregir el documento de ${nombre}`
                }
                fullWidth
              />
            </View>

            {/*
              El motivo va a la vista y no escondido: sin él, "no se le fía" es una
              traba que nadie sabe si sigue valiendo.
            */}
            {sinFiado(ficha.cliente) && (
              <View style={styles.sinFiado} accessible accessibilityRole="alert">
                <View style={styles.sinFiadoTitulo}>
                  <Ban size={ICON_SIZE} color={theme.colors.error} />
                  <Text variant="small" weight="semibold" color="error">
                    No se le fía
                  </Text>
                </View>
                {ficha.cliente.motivoSinFiado ? (
                  <Text variant="small" color="textMuted">
                    {ficha.cliente.motivoSinFiado}
                  </Text>
                ) : null}
                <Text variant="caption" color="textMuted">
                  Es un aviso, no una traba: se le puede facturar igual. Cobrale en el momento.
                </Text>
              </View>
            )}

            {/* ── Facturación: lo único que hoy se le puede hacer ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Facturación
              </Text>

              {ficha.puedeFacturar && (
                <Button
                  label="Crear factura"
                  onPress={facturar}
                  leftIcon={<FilePlus size={ICON_SIZE} color={theme.colors.onPrimary} />}
                  accessibilityLabel={`Crear una factura para ${nombre}`}
                  fullWidth
                />
              )}

              {/*
                Justo abajo de facturar, que es donde se decide: quien está por
                emitirle algo a plazo tiene el corte del fiado a mano.

                Bloquear pide motivo —se abre el diálogo—; devolverlo no pide nada
                y sale directo, porque el backend borra el motivo viejo.
              */}
              {ficha.puedeFacturar &&
                (sinFiado(ficha.cliente) ? (
                  <Button
                    label="Desbloquear fiado"
                    variant="secondary"
                    onPress={fiado.desbloquear}
                    loading={fiado.isSubmitting}
                    disabled={fiado.isSubmitting}
                    leftIcon={<HandCoins size={ICON_SIZE} color={theme.colors.primary} />}
                    accessibilityLabel={`Volver a fiarle a ${nombre}`}
                    fullWidth
                  />
                ) : (
                  <Button
                    label="Bloquear fiado"
                    variant="danger"
                    onPress={abrirBloqueo}
                    disabled={fiado.isSubmitting}
                    leftIcon={<Ban size={ICON_SIZE} color={theme.colors.onError} />}
                    accessibilityLabel={`Cortarle el fiado a ${nombre}`}
                    fullWidth
                  />
                ))}

              {/* El error del desbloqueo: el del bloqueo lo muestra el diálogo,
                  pegado al campo que hay que corregir. */}
              {fiado.mensajeError && !bloqueando && (
                <View style={styles.error} accessible accessibilityRole="alert">
                  <Text variant="small" color="error">
                    {fiado.mensajeError}
                  </Text>
                </View>
              )}

              {/*
                El historial ya no es un placeholder: vive en la cuenta del
                cliente, que es donde están su deuda y todas sus facturas con el
                saldo de cada una. Desde acá se entra a la misma pantalla a la que
                lleva el tablero.
              */}
              <Button
                label="Ver la cuenta"
                variant="secondary"
                onPress={verCuenta}
                leftIcon={<FileText size={ICON_SIZE} color={theme.colors.primary} />}
                accessibilityLabel={`Ver la cuenta y las facturas de ${nombre}`}
                fullWidth
              />
            </View>

            {/* ── Datos de la cuenta ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Cuenta
              </Text>

              <View style={styles.datos}>
                <Dato etiqueta="Email" valor={ficha.cliente.email ?? '—'} />
                <Dato etiqueta="DNI" valor={ficha.cliente.dni ?? '—'} />
                {/*
                  Para lo que sirven: llamarlo por una deuda y saber a dónde
                  entregar. **No se editan desde acá** —los carga la persona en
                  su Mi cuenta—: si están mal, se los pedís.
                */}
                <Dato etiqueta="Teléfono" valor={ficha.cliente.telefono ?? 'Sin cargar'} />
                <Dato etiqueta="Dirección" valor={ficha.cliente.direccion ?? 'Sin cargar'} />
                <Dato etiqueta="Entra con" valor={metodosDeIngreso(ficha.cliente)} />
                <Dato
                  etiqueta="Último ingreso"
                  valor={
                    ficha.cliente.lastLoginAt
                      ? formatFechaHora(ficha.cliente.lastLoginAt)
                      : 'Nunca entró'
                  }
                />
                <Dato etiqueta="Se registró" valor={formatFechaHora(ficha.cliente.createdAt)} />
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/*
        Hermano de la pantalla y no hijo: el diálogo es una view absoluta que
        cubre a su PADRE, y adentro del `View` con `paddingTop` el fondo oscuro
        se comería la franja de la barra de estado.
      */}
      {ficha.cliente && (
        <>
          <BloquearFiadoDialogo
            visible={bloqueando}
            nombre={nombre}
            control={fiado.control}
            onConfirmar={fiado.bloquear}
            onCancelar={cancelarBloqueo}
            bloqueando={fiado.isSubmitting}
            mensajeError={fiado.mensajeError}
          />

          <CargarDniDialogo
            visible={cargandoDni}
            nombre={nombre}
            corrige={!faltaDni(ficha.cliente)}
            control={dni.control}
            onConfirmar={dni.guardar}
            onCancelar={cancelarDni}
            guardando={dni.isSubmitting}
            mensajeError={dni.mensajeError}
          />
        </>
      )}
    </>
  );
}

/**
 * Cómo entra a la app. Pueden ser las dos cosas a la vez: se registró con
 * contraseña y después vinculó Google.
 */
function metodosDeIngreso(cliente: { tieneGoogle: boolean; tienePassword: boolean }): string {
  const metodos = [
    cliente.tieneGoogle ? 'Google' : null,
    cliente.tienePassword ? 'contraseña' : null,
  ].filter((metodo): metodo is string => metodo !== null);

  return metodos.length > 0 ? metodos.join(' y ') : 'Sin forma de entrar';
}

interface DatoProps {
  etiqueta: string;
  valor: ReactNode;
}

/** Una fila etiqueta/valor de la ficha. */
function Dato({ etiqueta, valor }: DatoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createDatoStyles(theme), [theme]);

  return (
    // El par se lee junto: "Último ingreso, 13/08/2026 19:15" y no dos textos
    // sueltos que el lector de pantalla no relaciona.
    <View style={styles.fila} accessible>
      <Text variant="small" color="textMuted">
        {etiqueta}
      </Text>
      <View style={styles.valor}>
        <Text variant="small" align="right" numberOfLines={2}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

const createDatoStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    /** El valor se queda con el sobrante y se corta él, no la etiqueta. */
    valor: { flex: 1 },
  });

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
    /** `flex: 1` para que un nombre largo se corte antes de empujar el indicador. */
    headerTexts: { flex: 1 },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.xl,
    },

    identidad: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    /** El rol y —si corresponde— la marca del fiado, en una fila. */
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },

    /** El aviso de que no se le fía, con su motivo. */
    faltaDni: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.lg,
    },
    faltaDniTitulo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    dniCargado: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    /** Mismo rojo que el corte de fiado: las dos son advertencias, no faltantes. */
    dadaDeBaja: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

    sinFiado: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },
    sinFiadoTitulo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },

    error: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

    seccion: { gap: theme.spacing.md },

    datos: {
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
