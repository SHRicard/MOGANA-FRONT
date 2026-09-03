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
import Mail from 'lucide-react-native/icons/mail';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { InputField } from '@/shared/ui/atoms/InputField';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { ListaDeLaBaja } from '../components';
import { useBajaDeCuenta } from '../hooks';
import { quedanDatos } from '../types';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * **Eliminar mi cuenta** (`docs/README_FRONT_BAJA_DE_CUENTA.md`).
 *
 * No es una idea de producto: **Google Play lo exige**. Si la app deja crear una
 * cuenta, tiene que dejar borrarla, con un camino intuitivo y a la vista.
 *
 * ⚠️ **Ni un texto de esta pantalla lo escribe el front.** El título, el
 * mensaje, las dos listas, la aclaración final y hasta la palabra que hay que
 * escribir vienen de `GET /users/me/baja`: lo que se muestra acá es **el aviso
 * que la política obliga a dar** —qué se retiene y por qué—, y se declaró de un
 * solo lado justamente para que no haya dos versiones.
 *
 * ⚠️ **La lista de lo que queda guardado no es opcional de mostrar.** Es la
 * parte que la política exige. Si no entra, se achica otra cosa.
 *
 * ⚠️ Es una pantalla y no un diálogo: la vista previa con deuda son dos párrafos
 * más ocho renglones, y adentro de una tarjeta centrada eso se sale de un
 * teléfono. Acá scrollea, que es lo que permite mostrarlo entero.
 *
 * ⚠️ Después de borrar **la sesión sigue abierta un momento más, a propósito**:
 * cerrarla en el mismo instante reemplazaría el stack y la despedida no se
 * llegaría a leer. Lo que no pasa es que se le pida nada más a la API — el token
 * ya no sirve.
 *
 * Sin lógica de negocio: todo sale de `useBajaDeCuenta`.
 */
export function EliminarCuentaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const baja = useBajaDeCuenta();

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * Ya se borró: **es lo último que la persona lee de la app**. No hay "atrás"
   * —esa cuenta no existe— ni gesto de refrescar: la única salida es cerrar la
   * sesión y volver al login.
   */
  if (baja.resultado) {
    const resultado = baja.resultado;

    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[
            styles.despedida,
            { paddingBottom: insets.bottom + theme.spacing.xl },
          ]}
        >
          <Text variant="title" weight="semibold" align="center" accessibilityRole="header">
            {resultado.titulo}
          </Text>
          <Text variant="body" color="textMuted" align="center">
            {resultado.mensaje}
          </Text>

          {/*
            A qué correo le van a seguir llegando los avisos. Se muestra para que
            se dé cuenta AHORA —y no en tres meses— de que era una casilla que ya
            no lee.
          */}
          {resultado.avisosA ? (
            <View style={styles.avisos} accessible>
              <Mail size={ICON_SIZE} color={theme.colors.onWarningMuted} />
              <View style={styles.textoDelIcono}>
                <Text variant="small" weight="semibold" color="onWarningMuted">
                  Te vamos a escribir a
                </Text>
                <Text variant="small">{resultado.avisosA}</Text>
                <Text variant="caption" color="textMuted">
                  Si ese correo ya no lo usás, avisanos antes de irte.
                </Text>
              </View>
            </View>
          ) : null}

          <Button
            label={quedanDatos(resultado) ? 'Entendido' : 'Listo'}
            onPress={baja.salir}
            accessibilityLabel="Cerrar sesión y volver al inicio"
            fullWidth
          />
        </ScrollView>
      </View>
    );
  }

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
          {/* El nombre exacto que pide Play, y el que busca su revisor. */}
          <Text variant="title" weight="semibold" accessibilityRole="header">
            Eliminar mi cuenta
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Qué se borra y qué queda guardado
          </Text>
        </View>

        <View style={styles.headerAction} />
      </View>

      {baja.mensajeErrorVistaPrevia && !baja.vistaPrevia ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer esta información"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={baja.mensajeErrorVistaPrevia}
          action={<Button label="Reintentar" onPress={baja.reintentar} />}
        />
      ) : baja.isLoading || !baja.vistaPrevia ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── El aviso, entero y escrito por el servidor ── */}
          <View style={styles.aviso}>
            <View style={styles.avisoTitulo}>
              <TriangleAlert size={ICON_SIZE} color={theme.colors.error} />
              <Text variant="body" weight="semibold" color="error">
                {baja.vistaPrevia.titulo}
              </Text>
            </View>
            <Text variant="small">{baja.vistaPrevia.mensaje}</Text>
          </View>

          <ListaDeLaBaja
            titulo="Se borra"
            renglones={baja.vistaPrevia.seBorra.map((dato) => ({ dato }))}
            color="error"
          />

          {/*
            Lo que queda guardado. **Es la parte que la política obliga**: sin
            esto no se puede retener nada, así que no se esconde ni se resume.
          */}
          <ListaDeLaBaja
            titulo="Queda guardado"
            renglones={baja.vistaPrevia.seRetiene}
            color="statusSoon"
          />

          {/* Qué falta para que se termine de borrar. En el camino sin deuda no
              falta nada y el backend manda `null`. */}
          {baja.vistaPrevia.paraCompletarla ? (
            <View style={styles.paraCompletarla} accessible>
              <Text variant="small" color="textMuted">
                {baja.vistaPrevia.paraCompletarla}
              </Text>
            </View>
          ) : null}

          {/* ── La confirmación ── */}
          {baja.esCuentaDelNegocio ? (
            /*
              `409`: es una cuenta de administración. No se reintenta —se la pide
              al super admin—, así que el campo y el botón se van: dejarlos sería
              ofrecer algo que no puede pasar.
            */
            <View style={styles.bloqueado} accessible accessibilityRole="alert">
              <ShieldAlert size={ICON_SIZE} color={theme.colors.onWarningMuted} />
              <View style={styles.textoDelIcono}>
                <Text variant="small" color="onWarningMuted">
                  {baja.mensajeError}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <InputField
                label={`Escribí ${baja.vistaPrevia.confirmacion} para confirmar`}
                value={baja.confirmacion}
                onChangeText={baja.onConfirmacionChange}
                placeholder={baja.vistaPrevia.confirmacion}
                // Sin corrección ni mayúsculas automáticas: el campo es una
                // palabra exacta, y el teclado que "ayuda" es lo que hace que no
                // coincida. Igual se acepta en minúscula y con espacios.
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                returnKeyType="done"
                editable={!baja.eliminando}
                helperText="No distingue mayúsculas."
                error={baja.mensajeError ?? undefined}
                accessibilityLabel={`Escribí ${baja.vistaPrevia.confirmacion} para confirmar que querés eliminar tu cuenta`}
              />

              <Button
                label="Eliminar mi cuenta"
                variant="danger"
                onPress={baja.eliminar}
                loading={baja.eliminando}
                // Sin la palabra escrita no se puede tocar: es el freno de una
                // acción que no se deshace.
                disabled={!baja.puedeConfirmar || baja.eliminando}
                fullWidth
              />

              <Button
                label="Cancelar"
                variant="secondary"
                onPress={volver}
                disabled={baja.eliminando}
                fullWidth
              />
            </>
          )}
        </ScrollView>
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
      gap: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },

    aviso: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },
    avisoTitulo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },

    paraCompletarla: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.lg,
    },

    bloqueado: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.lg,
    },

    /** La despedida se centra: es una pantalla de una sola cosa. */
    despedida: {
      flexGrow: 1,
      gap: theme.spacing.lg,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
    },
    avisos: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.lg,
    },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al ícono. */
    textoDelIcono: { flex: 1, gap: theme.spacing.xxs },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
