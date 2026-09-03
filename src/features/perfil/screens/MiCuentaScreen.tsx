import { useCallback, useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import MailWarning from 'lucide-react-native/icons/mail-warning';
import Trash2 from 'lucide-react-native/icons/trash-2';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Ruta profunda y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { InputField } from '@/shared/ui/atoms/InputField';
import { Text } from '@/shared/ui/atoms/Text';
import { MAX_LARGO_DNI_TIPEADO } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { useMiCuenta } from '../hooks';
import { MAX_LARGO_DIRECCION, MAX_LARGO_NOMBRE } from '../types';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * Mi cuenta: los datos propios, y los que se pueden corregir
 * (`docs/flujo_mi_cuenta.md`).
 *
 * Sirve igual para un cliente y para un administrador: cada uno edita **su**
 * cuenta, nunca la de otro — no hay id en la URL.
 *
 * **La regla es "se edita todo menos lo que te identifica"**, y quién decide qué
 * entra en esa lista es el backend: los campos que manda en `camposFijos` se
 * dibujan deshabilitados con su motivo debajo. Acá no hay ninguna regla propia
 * sobre cuándo el DNI se puede tocar.
 *
 * El correo y el documento se muestran igual aunque no se puedan editar: la
 * persona entra a esta pantalla justamente a **verlos**.
 *
 * Sin lógica de negocio: todo sale de `useMiCuenta`.
 */
export function MiCuentaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const cuenta = useMiCuenta();
  const refresco = useRefrescar(cuenta.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const verificarCorreo = useCallback(() => {
    navigation.navigate(RootRoutes.VERIFICAR_CORREO);
  }, [navigation]);

  /**
   * Eliminar la cuenta (`docs/README_FRONT_BAJA_DE_CUENTA.md`). No borra nada
   * desde acá: abre la pantalla que pregunta primero qué va a pasar y pide
   * escribir la palabra.
   */
  const eliminarCuenta = useCallback(() => {
    navigation.navigate(RootRoutes.ELIMINAR_CUENTA);
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
            Mi cuenta
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Tus datos y cómo te contactamos
          </Text>
        </View>

        {/* Ocupa el mismo lugar que el botón de volver para que el título quede
            quieto cuando aparece el indicador. */}
        <View style={styles.headerAction}>
          {cuenta.isFetching && !cuenta.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando tus datos"
            />
          )}
        </View>
      </View>

      {cuenta.mensajeErrorPerfil && !cuenta.perfil ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer tus datos"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={cuenta.mensajeErrorPerfil}
          action={<Button label="Reintentar" onPress={cuenta.reintentar} />}
        />
      ) : cuenta.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        cuenta.perfil && (
          <ScrollView
            style={styles.screen}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + theme.spacing.xl },
            ]}
            refreshControl={refresco.control}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/*
              El correo sin verificar NO bloquea nada —se entra igual y se usa la
              app igual—, así que es un cartelito y no una pared. Las cuentas de
              Google nacen verificadas: ahí esto no aparece nunca.
            */}
            {cuenta.faltaVerificarEmail && (
              <View style={styles.aviso}>
                <View style={styles.avisoTitulo}>
                  <MailWarning size={ICON_SIZE} color={theme.colors.onWarningMuted} />
                  <Text variant="small" weight="semibold" color="onWarningMuted">
                    Todavía no verificaste tu correo
                  </Text>
                </View>
                <Text variant="caption" color="textMuted">
                  Podés seguir usando la app igual. Verificarlo nos deja avisarte por mail.
                </Text>
                {/*
                  Lleva a la pantalla del código, que es la que sabe pedir uno
                  nuevo y manejar la espera de un minuto entre envíos. Acá solo
                  se avisa que falta (`docs/flujo_login.md`).
                */}
                <Button
                  label="Verificar mi correo"
                  variant="secondary"
                  size="sm"
                  onPress={verificarCorreo}
                />
              </View>
            )}

            {/* ── Lo que se edita ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Tus datos
              </Text>

              <ControlledInputField
                control={cuenta.control}
                name="displayName"
                label="Nombre"
                placeholder="Ana Pérez"
                helperText="Es como te ve quien te atiende."
                maxLength={MAX_LARGO_NOMBRE}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                editable={!cuenta.guardando}
              />

              <ControlledInputField
                control={cuenta.control}
                name="telefono"
                label="Teléfono"
                placeholder="381 456-7890"
                helperText="Con el código de área. Dejalo vacío si no querés cargarlo."
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                editable={!cuenta.guardando}
              />

              <ControlledInputField
                control={cuenta.control}
                name="direccion"
                label="Dirección"
                placeholder="Av. San Martín 123"
                helperText="Para saber a dónde entregar. También se puede dejar vacía."
                maxLength={MAX_LARGO_DIRECCION}
                autoCapitalize="sentences"
                returnKeyType="done"
                editable={!cuenta.guardando}
              />
            </View>

            {/* ── Lo que te identifica ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Cómo te identificás
              </Text>

              {/*
                El correo se muestra siempre y no se edita nunca: es con lo que
                entrás. El motivo lo escribe el backend y dice a dónde ir.
              */}
              <InputField
                label="Correo"
                value={cuenta.perfil.email ?? '—'}
                editable={false}
                helperText={cuenta.motivoEmail ?? 'Es con lo que entrás a la app.'}
                accessibilityLabel="Tu correo. No se puede editar desde acá."
              />

              {/*
                El DNI se edita **una sola vez**, mientras esté vacío. Que esté o
                no bloqueado lo dice `camposFijos`, no una regla de la app.
              */}
              <ControlledInputField
                control={cuenta.control}
                name="dni"
                label="DNI"
                placeholder="38.180.903"
                helperText={cuenta.motivoDni ?? 'Solo los números, con o sin puntos.'}
                keyboardType="number-pad"
                autoComplete="off"
                textContentType="none"
                maxLength={MAX_LARGO_DNI_TIPEADO}
                editable={cuenta.motivoDni === null && !cuenta.guardando}
              />
            </View>

            {cuenta.mensajeError && (
              <View
                style={[styles.aviso, cuenta.sinSalida ? styles.avisoAmbar : styles.avisoError]}
                accessible
                accessibilityRole="alert"
              >
                <Text variant="small" color={cuenta.sinSalida ? 'onWarningMuted' : 'error'}>
                  {cuenta.mensajeError}
                </Text>
              </View>
            )}

            {/* Que se guardó no se ve en ningún lado —los campos quedan igual—,
                así que hay que decirlo. Se apaga al volver a tocar algo. */}
            {cuenta.guardado && !cuenta.mensajeError && (
              <View style={[styles.aviso, styles.avisoExito]} accessible accessibilityRole="alert">
                <Text variant="small" color="success">
                  Listo, guardamos tus datos.
                </Text>
              </View>
            )}

            <Button
              label="Guardar cambios"
              onPress={cuenta.guardar}
              loading={cuenta.guardando}
              // Sin cambios no hay nada que mandar: el body vacío es un error
              // del backend, y un botón que siempre se puede tocar promete algo
              // que no va a pasar.
              disabled={!cuenta.hayCambios || cuenta.guardando}
              fullWidth
            />

            {/*
              ── Eliminar mi cuenta (`docs/README_FRONT_BAJA_DE_CUENTA.md` §6) ──

              **Google Play lo exige**: si la app deja crear una cuenta, tiene
              que dejar borrarla, con un camino intuitivo y a la vista. Las tres
              cosas que pide y que acá se cumplen:

               1. va **al final del perfil y separado del resto** —la línea de
                  arriba es lo que lo separa—, no escondido bajo tres menús;
               2. se llama **"Eliminar mi cuenta"** y no "Dar de baja": el
                  revisor de Play busca esas palabras;
               3. está **a un toque** de esta pantalla.

              El botón no borra nada: abre la pantalla que primero explica qué va
              a pasar y pide escribir la palabra de confirmación.
            */}
            <View style={styles.zonaPeligrosa}>
              <Text variant="body" weight="semibold">
                Eliminar mi cuenta
              </Text>
              <Text variant="caption" color="textMuted">
                Se borran tus datos y no vas a poder volver a entrar. Te vamos a mostrar qué se
                borra y qué queda guardado antes de hacer nada.
              </Text>

              <Button
                label="Eliminar mi cuenta"
                variant="danger"
                onPress={eliminarCuenta}
                disabled={cuenta.guardando}
                leftIcon={<Trash2 size={ICON_SIZE} color={theme.colors.onError} />}
                accessibilityLabel="Eliminar mi cuenta. Vas a ver qué se borra antes de confirmar."
                fullWidth
              />
            </View>
          </ScrollView>
        )
      )}
    </KeyboardAvoidingView>
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
      gap: theme.spacing.xl,
    },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    seccion: { gap: theme.spacing.md },

    /**
     * Lo que no se deshace, separado del resto por una línea: es lo que evita
     * que "Eliminar mi cuenta" se lea como una fila más del formulario.
     */
    zonaPeligrosa: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },

    aviso: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.warningMuted,
      alignItems: 'flex-start',
    },
    avisoTitulo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    /** Los dos `409` del DNI no son un error de la persona: ámbar, no rojo. */
    avisoAmbar: { backgroundColor: theme.colors.warningMuted },
    avisoError: { backgroundColor: theme.colors.errorMuted },
    avisoExito: { backgroundColor: theme.colors.successMuted },
  });
