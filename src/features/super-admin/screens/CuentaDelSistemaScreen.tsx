import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import FileText from 'lucide-react-native/icons/file-text';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import UserCog from 'lucide-react-native/icons/user-cog';
import UserMinus from 'lucide-react-native/icons/user-minus';
import UserX from 'lucide-react-native/icons/user-x';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import type { Rol } from '@/features/auth';
import {
  estaDadaDeBaja,
  faltaDni,
  identificadorUsuario,
  nombreUsuario,
  rolLabel,
  sinFiado,
} from '@/features/usuarios';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { Chip } from '@/shared/ui/atoms/Chip';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatearDni, formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { BloqueDeRastro, CambiarRolDialogo, Dato, SelectorDeRol } from '../components';
import { useCambiarRol, useCuentaDelSistema } from '../hooks';
import { hayRastro, resumenDeFacturas } from '../types';

type CuentaDelSistemaRoute = RouteProp<RootStackParamList, typeof RootRoutes.CUENTA_DEL_SISTEMA>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * **La ficha de una cuenta en el panel del sistema**
 * (`docs/README_FRONT_SUPER_ADMIN.md` §5 y §6).
 *
 * Es la del listado más lo que solo tiene sentido acá: quién le tocó qué y por
 * qué, cuántas facturas tiene, y **a qué rol puede pasar**. Es la única pantalla
 * de la app desde la que se mueve un rol.
 *
 * ⚠️ No reemplaza a la ficha del cliente (`CLIENTE`): allá están el fiado, el
 * DNI y el botón de facturar, y existe solo para los clientes. Cuando esta
 * cuenta es un cliente, la ficha ofrece el paso a la otra.
 */
export function CuentaDelSistemaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<CuentaDelSistemaRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const ficha = useCuentaDelSistema(params.cuentaId);

  /**
   * A qué rol se está por pasarla. **Es el estado que abre el diálogo**: elegir
   * un rol no cambia nada por sí solo — esta acción no se deshace con un botón,
   * así que siempre hay un paso intermedio.
   */
  const [rolElegido, setRolElegido] = useState<Rol | null>(null);

  const cerrarDialogo = useCallback(() => setRolElegido(null), []);

  const cambio = useCambiarRol(params.cuentaId, cerrarDialogo);

  const elegirRol = useCallback(
    (rol: Rol) => {
      // Se limpia al abrir: un motivo a medio escribir de un intento anterior no
      // tiene por qué reaparecer, y menos para otro rol.
      cambio.limpiar();
      setRolElegido(rol);
    },
    [cambio],
  );

  const cancelarCambio = useCallback(() => {
    cambio.limpiar();
    setRolElegido(null);
  }, [cambio]);

  const confirmarCambio = useCallback(() => {
    if (rolElegido) {
      cambio.cambiar(rolElegido);
    }
  }, [cambio, rolElegido]);

  /** Tirar para abajo vuelve a pedir la ficha. */
  const refresco = useRefrescar(ficha.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  // El nombre de la ficha si ya llegó; si no, el que trajo el listado. Así el
  // encabezado dice a quién estás mirando desde el primer frame.
  const nombre = ficha.cuenta ? nombreUsuario(ficha.cuenta) : params.cuentaNombre;

  /**
   * El historial acotado a esta cuenta. **Es la mitad del valor de la pantalla
   * de auditoría**: la lista completa sin filtrar se mira una vez por mes.
   */
  const verHistorial = useCallback(
    () =>
      navigation.navigate(RootRoutes.AUDITORIA, {
        objetivoId: params.cuentaId,
        objetivoNombre: nombre,
      }),
    [navigation, params.cuentaId, nombre],
  );

  /**
   * La cuenta corriente: a dónde va a querer ir quien acaba de leer que esta
   * persona tiene facturas —que es lo que explica el `409` al ascenderla—.
   */
  const verCuentaCorriente = useCallback(
    () =>
      navigation.navigate(RootRoutes.CUENTA, {
        clienteId: params.cuentaId,
        clienteNombre: nombre,
      }),
    [navigation, params.cuentaId, nombre],
  );

  /** La otra ficha: el fiado, el DNI y el botón de facturar. Solo para clientes. */
  const verFichaDeCliente = useCallback(
    () =>
      navigation.navigate(RootRoutes.CLIENTE, {
        clienteId: params.cuentaId,
        clienteNombre: nombre,
      }),
    [navigation, params.cuentaId, nombre],
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
            <Text variant="title" weight="semibold" numberOfLines={1} accessibilityRole="header">
              {nombre}
            </Text>
            <Text variant="caption" color="textMuted">
              Ficha del sistema
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
            description="Esta pantalla es del super admin. Tu rol no alcanza."
          />
        ) : ficha.noEncontrada || ficha.idInvalido ? (
          <EmptyState
            icon={<UserX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No encontramos esa cuenta"
            description={
              ficha.idInvalido
                ? 'Ese identificador no tiene forma de cuenta.'
                : 'La cuenta no existe o ya se borró.'
            }
            action={<Button label="Volver" variant="secondary" onPress={volver} />}
          />
        ) : ficha.mensajeError ? (
          <EmptyState
            icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
            title="No pudimos traer la ficha"
            description={ficha.mensajeError}
            action={<Button label="Reintentar" onPress={ficha.reintentar} />}
          />
        ) : ficha.isLoading || !ficha.cuenta ? (
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
              <Text variant="title" weight="semibold" align="center" numberOfLines={2}>
                {nombre}
              </Text>
              {identificadorUsuario(ficha.cuenta) !== nombre && (
                <Text variant="small" color="textMuted" numberOfLines={1}>
                  {identificadorUsuario(ficha.cuenta)}
                </Text>
              )}
              <View style={styles.chips}>
                <Chip label={rolLabel(ficha.cuenta.rol)} tone="brand" />
                {/* Ámbar es un dato que falta —se completa—; rojo es una
                    advertencia sobre la persona. Se pueden dar las dos. */}
                {estaDadaDeBaja(ficha.cuenta) && <Chip label="Dada de baja" tone="danger" />}
                {faltaDni(ficha.cuenta) && <Chip label="Falta el DNI" tone="warning" />}
                {sinFiado(ficha.cuenta) && <Chip label="No se le fía" tone="danger" />}
              </View>
            </View>

            {/*
              ── Se dio de baja (`docs/README_FRONT_BAJA_DE_CUENTA.md` §8) ──

              Va arriba de todo porque cambia lo que significa el resto de la
              ficha: esta cuenta ya no entra a la app y de su perfil quedó solo lo
              que hace falta para avisarle de la deuda. Cuando la salde, se borra
              sola y desaparece de este listado.
            */}
            {estaDadaDeBaja(ficha.cuenta) && (
              <View style={styles.dadaDeBaja} accessible accessibilityRole="alert">
                <View style={styles.dadaDeBajaTitulo}>
                  <UserMinus size={ICON_SIZE} color={theme.colors.error} />
                  <Text variant="small" weight="semibold" color="error">
                    Pidió eliminar su cuenta
                  </Text>
                </View>
                {ficha.cuenta.dadaDeBajaEn ? (
                  <Text variant="small" color="textMuted">
                    {`El ${formatFechaHora(ficha.cuenta.dadaDeBajaEn)}.`}
                  </Text>
                ) : null}
                <Text variant="caption" color="textMuted">
                  Ya no puede entrar a la app. Se borra sola cuando termine de pagar lo que debe,
                  sin que nadie apriete nada.
                </Text>
              </View>
            )}

            {/* ── El rol: lo único que se cambia desde este panel ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Rol
              </Text>
              <Text variant="caption" color="textMuted">
                Lo que se puede y lo que no lo decide el servidor, con las facturas y los roles que
                haya en este momento.
              </Text>

              <SelectorDeRol
                opciones={ficha.opciones}
                onElegir={elegirRol}
                deshabilitado={cambio.isSubmitting}
              />

              {/* El error del cambio cuando el diálogo ya se cerró. Con el
                  diálogo abierto lo muestra él, pegado al campo del motivo. */}
              {cambio.mensajeError && rolElegido === null && (
                <View style={styles.error} accessible accessibilityRole="alert">
                  <Text variant="small" color="error">
                    {cambio.mensajeError}
                  </Text>
                </View>
              )}

              <Button
                label="Ver el historial de esta cuenta"
                variant="secondary"
                onPress={verHistorial}
                leftIcon={<ScrollText size={ICON_SIZE} color={theme.colors.primary} />}
                accessibilityLabel={`Ver los cambios de rol de ${nombre}`}
                fullWidth
              />
            </View>

            {/* ── Las facturas: están para explicar el 409 antes de que pase ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Facturación
              </Text>
              <Text variant="small" color="textMuted">
                {resumenDeFacturas(ficha.cuenta.facturas)}
              </Text>
              {ficha.cuenta.facturas.total > 0 && (
                <Text variant="caption" color="textMuted">
                  Todo el panel de facturación filtra por clientes: si esta cuenta deja de serlo,
                  esas facturas desaparecen del tablero y de las métricas. Para darle el panel,
                  creale una cuenta aparte con otro correo.
                </Text>
              )}

              {ficha.esCliente && (
                <>
                  <Button
                    label="Ver la cuenta corriente"
                    variant="secondary"
                    onPress={verCuentaCorriente}
                    leftIcon={<FileText size={ICON_SIZE} color={theme.colors.primary} />}
                    accessibilityLabel={`Ver la cuenta y las facturas de ${nombre}`}
                    fullWidth
                  />
                  {/*
                    La otra ficha, la del apartado del administrador: el fiado, el
                    DNI y el botón de facturar. Existe solo para los clientes —a
                    una cuenta de administración ese endpoint le contesta 404—, y
                    por eso el botón aparece solo acá.
                  */}
                  <Button
                    label="Ficha del cliente"
                    variant="secondary"
                    onPress={verFichaDeCliente}
                    leftIcon={<UserCog size={ICON_SIZE} color={theme.colors.primary} />}
                    accessibilityLabel={`Abrir la ficha de cliente de ${nombre}: fiado, DNI y facturación`}
                    fullWidth
                  />
                </>
              )}
            </View>

            {/*
              ── Qué le pasó a esta cuenta ──

              Los tres bloques se esconden solos cuando nunca pasó nada: cuatro
              guiones en cuatro filas se leen como un error de carga, no como
              "esta cuenta está intacta". Si no hay ninguno, tampoco va el título.
            */}
            {(hayRastro(ficha.cuenta.cambioDeRol) ||
              hayRastro(ficha.cuenta.fiado) ||
              hayRastro(ficha.cuenta.documento)) && (
              <View style={styles.seccion}>
                <Text variant="body" weight="semibold">
                  Qué le pasó a esta cuenta
                </Text>

                <BloqueDeRastro titulo="Cambio de rol" rastro={ficha.cuenta.cambioDeRol} />
                <BloqueDeRastro
                  titulo="Fiado"
                  rastro={ficha.cuenta.fiado}
                  // Al devolver el fiado el backend borra el motivo: queda con
                  // fecha y sin explicación, y está bien.
                  sinMotivo="Sin motivo: es lo que queda cuando se le devuelve el fiado."
                />
                <BloqueDeRastro titulo="Documento" rastro={ficha.cuenta.documento} />
              </View>
            )}

            {/* ── Datos de la cuenta ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Cuenta
              </Text>

              <View style={styles.datos}>
                <Dato etiqueta="Email" valor={ficha.cuenta.email ?? '—'} />
                <Dato
                  etiqueta="Correo verificado"
                  valor={
                    ficha.cuenta.emailVerificadoEn
                      ? formatFechaHora(ficha.cuenta.emailVerificadoEn)
                      : 'Sin verificar'
                  }
                />
                <Dato
                  etiqueta="DNI"
                  valor={ficha.cuenta.dni ? formatearDni(ficha.cuenta.dni) : 'Sin cargar'}
                />
                <Dato etiqueta="Teléfono" valor={ficha.cuenta.telefono ?? 'Sin cargar'} />
                <Dato etiqueta="Dirección" valor={ficha.cuenta.direccion ?? 'Sin cargar'} />
                <Dato etiqueta="Entra con" valor={metodosDeIngreso(ficha.cuenta)} />
                <Dato
                  etiqueta="Último ingreso"
                  nota="Se cuenta el login, no el uso de la app"
                  valor={
                    ficha.cuenta.lastLoginAt
                      ? formatFechaHora(ficha.cuenta.lastLoginAt)
                      : 'Nunca entró'
                  }
                />
                <Dato etiqueta="Se registró" valor={formatFechaHora(ficha.cuenta.createdAt)} />
                {ficha.cuenta.updatedAt ? (
                  <Dato
                    etiqueta="Última modificación"
                    valor={formatFechaHora(ficha.cuenta.updatedAt)}
                  />
                ) : null}
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
      {ficha.cuenta && (
        <CambiarRolDialogo
          rol={rolElegido}
          rolActual={ficha.cuenta.rol}
          nombre={nombre}
          control={cambio.control}
          onConfirmar={confirmarCambio}
          onCancelar={cancelarCambio}
          cambiando={cambio.isSubmitting}
          mensajeError={cambio.mensajeError}
        />
      )}
    </>
  );
}

/**
 * Cómo entra a la app. Pueden ser las dos cosas a la vez: se registró con
 * contraseña y después vinculó Google.
 */
function metodosDeIngreso(cuenta: { tieneGoogle: boolean; tienePassword: boolean }): string {
  const metodos = [
    cuenta.tieneGoogle ? 'Google' : null,
    cuenta.tienePassword ? 'contraseña' : null,
  ].filter((metodo): metodo is string => metodo !== null);

  return metodos.length > 0 ? metodos.join(' y ') : 'Sin forma de entrar';
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
    /** `flex: 1` para que un nombre largo se corte antes de empujar el indicador. */
    headerTexts: { flex: 1 },

    content: {
      gap: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },

    identidad: { alignItems: 'center', gap: theme.spacing.xs },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },

    seccion: { gap: theme.spacing.sm },

    dadaDeBaja: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },
    dadaDeBajaTitulo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },

    /** Las filas se separan con una línea entre ellas, no con aire. */
    datos: {
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    error: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
