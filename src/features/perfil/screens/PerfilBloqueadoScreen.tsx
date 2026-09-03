import { useCallback, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import IdCard from 'lucide-react-native/icons/id-card';
// Ruta profunda y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import { Logo } from '@/shared/ui/atoms/Logo';
import { Text } from '@/shared/ui/atoms/Text';
import { MAX_LARGO_DNI_TIPEADO } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { useCompletarPerfil } from '../hooks';

/** Ancho del logo. Más chico que en auth: acá el protagonista es el campo. */
const ANCHO_LOGO = 180;

const ICONO = 28;

/** Lado del círculo que lo enmarca. Mismo criterio que el del `Dialogo`. */
const CIRCULO = 56;

/**
 * La única pantalla que ve una cuenta bloqueada (`docs/flujo_login.md`).
 *
 * No es un modal encima de la app: **es la app**, mientras el `estado` sea
 * `bloqueado`. El `RootNavigator` no monta los tabs, así que no hay adónde
 * navegar por debajo ni request que se escape — que es lo que pide el doc.
 *
 * Tres salidas, en orden de lo que va a pasar más seguido:
 *
 *  1. **Cargar el DNI.** Al guardar, la respuesta ya viene activa y la pantalla
 *     desaparece sola.
 *  2. **Tirar para abajo.** El administrador puede cargárselo desde el panel con
 *     la persona enfrente; el gesto vuelve a pedir `/users/me` y destraba.
 *  3. **Cerrar sesión.** Para los dos `409` que no se pueden resolver desde acá:
 *     sin esta salida, lo que queda es desinstalar la app.
 *  4. **Eliminar la cuenta.** La que pide Google Play
 *     (`docs/README_FRONT_BAJA_DE_CUENTA.md` §2), y no es un trámite: quien se
 *     registró y nunca cargó el DNI es justamente el que más chances tiene de
 *     querer irse. Los dos endpoints de la baja responden con la cuenta
 *     bloqueada, así que el camino está disponible igual — es lo único, además
 *     de este cartel, que el stack le registra.
 *
 * Sin lógica de negocio: todo sale de `useCompletarPerfil`.
 */
export function PerfilBloqueadoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const navigation = useNavigation();

  const perfil = useCompletarPerfil();
  const refresco = useRefrescar(perfil.refrescar);

  /**
   * La salida definitiva. Va acá y no solo en Mi cuenta porque **esta persona no
   * puede llegar a Mi cuenta**: mientras la cuenta esté bloqueada, el stack no
   * registra ninguna otra ruta. Sin esto, el camino que exige Play no existiría
   * para ella.
   */
  const eliminarCuenta = useCallback(() => {
    navigation.navigate(RootRoutes.ELIMINAR_CUENTA);
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + theme.spacing.xl,
            paddingBottom: insets.bottom + theme.spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={refresco.control}
      >
        <View style={styles.hero}>
          <Logo width={ANCHO_LOGO} />

          {/* Decorativo: lo que hay que hacer lo dice el título. */}
          <View
            style={styles.circulo}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <IdCard size={ICONO} color={theme.colors.primary} />
          </View>

          <View style={styles.header}>
            <Text variant="title" weight="bold" align="center">
              Cargá tu DNI
            </Text>
            {/* El motivo lo redacta el backend: se muestra tal cual. El respaldo
                es por si llega vacío, no para reemplazarlo. */}
            <Text variant="small" color="textMuted" align="center">
              {perfil.motivo ?? 'Para usar la app necesitás cargar tu DNI en tu perfil.'}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {perfil.mensajeError && (
            <View
              style={[styles.aviso, perfil.sinSalida ? styles.avisoSinSalida : styles.avisoError]}
              accessible
              accessibilityRole="alert"
            >
              <Text variant="small" color={perfil.sinSalida ? 'onWarningMuted' : 'error'}>
                {perfil.mensajeError}
              </Text>
            </View>
          )}

          <ControlledInputField
            control={perfil.control}
            name="dni"
            label="DNI"
            placeholder="38.180.903"
            helperText="Solo los números, con o sin puntos."
            // Teclado numérico: el documento son dígitos y nada más. Los puntos
            // que igual se puedan tipear los saca el schema antes de mandarlo.
            keyboardType="number-pad"
            autoComplete="off"
            textContentType="none"
            maxLength={MAX_LARGO_DNI_TIPEADO}
            returnKeyType="done"
            onSubmitEditing={perfil.guardar}
            editable={!perfil.guardando}
          />

          <Button
            label="Guardar y continuar"
            onPress={perfil.guardar}
            loading={perfil.guardando}
            disabled={perfil.guardando}
            fullWidth
          />

          {/* El gesto no se descubre solo, y acá es media salida: se dice. */}
          <Text variant="caption" color="textMuted" align="center">
            ¿Te lo cargaron en el local? Tirá para abajo para actualizar.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            label="Cerrar sesión"
            variant="ghost"
            onPress={perfil.cerrarSesion}
            disabled={perfil.guardando}
            fullWidth
          />

          {/*
            Ghost y debajo de cerrar sesión: es la salida más definitiva de las
            cuatro y la que menos se busca, pero **tiene que estar**. El botón no
            borra nada — abre la pantalla que explica qué va a pasar.
          */}
          <Button
            label="Eliminar mi cuenta"
            variant="ghost"
            onPress={eliminarCuenta}
            disabled={perfil.guardando}
            accessibilityLabel="Eliminar mi cuenta. Vas a ver qué se borra antes de confirmar."
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.lg,
    },

    hero: { alignItems: 'center', gap: theme.spacing.md },
    circulo: {
      width: CIRCULO,
      height: CIRCULO,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryMuted,
    },
    header: { gap: theme.spacing.xxs },

    body: { gap: theme.spacing.md },

    aviso: { padding: theme.spacing.md, borderRadius: theme.radius.lg },
    avisoError: { backgroundColor: theme.colors.errorMuted },
    /** Los dos `409` no son un error de la persona: es ámbar, no rojo. */
    avisoSinSalida: { backgroundColor: theme.colors.warningMuted },

    footer: { marginTop: 'auto', gap: theme.spacing.xs },
  });
