import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IdCard from 'lucide-react-native/icons/id-card';
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
 *
 * Sin lógica de negocio: todo sale de `useCompletarPerfil`.
 */
export function PerfilBloqueadoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const perfil = useCompletarPerfil();
  const refresco = useRefrescar(perfil.refrescar);

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

    footer: { marginTop: 'auto' },
  });
