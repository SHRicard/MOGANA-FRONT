import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import KeyRound from 'lucide-react-native/icons/key-round';
// Ruta profunda y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { AuthRoutes } from '@/app/navigation/routes';
import type { AuthStackParamList } from '@/app/navigation/types';
import { Button } from '@/shared/ui/atoms/Button';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { AuthScreenLayout, CampoCodigo, FormErrorBanner } from '../components';
import { useNuevaClave } from '../hooks';

type NuevaClaveRoute = RouteProp<AuthStackParamList, typeof AuthRoutes.NUEVA_CLAVE>;

const ICONO = 48;

/**
 * El código del correo y la contraseña nueva (`docs/flujo_login.md`).
 *
 * Es **pública** —quien olvidó la contraseña justamente no puede entrar— y por
 * eso el email viaja en el body: seis dígitos no identifican a nadie por sí
 * solos. El email viene de la pantalla anterior para que nadie lo tipee dos
 * veces.
 *
 * ⚠️ **El código vive 15 minutos.** Es corto a propósito: abre la cuenta.
 *
 * ⚠️ Después de cambiarla **no se loguea a nadie**: la respuesta no trae sesión
 * y es a propósito. La persona vuelve a entrar a mano.
 */
export function NuevaClaveScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { params } = useRoute<NuevaClaveRoute>();

  const cambio = useNuevaClave(params.email);

  /**
   * Al login, que es de donde se viene y a donde hay que volver a entrar: la
   * respuesta **no trae sesión** y es a propósito.
   *
   * `navigate` y no `goBack`: atrás está "recuperar contraseña", que ya no
   * tiene sentido. Como el login sigue en el stack, esto vuelve a él en vez de
   * apilar otro.
   */
  const irAlLogin = useCallback(() => {
    navigation.navigate(AuthRoutes.LOGIN);
  }, [navigation]);

  if (cambio.listo) {
    return (
      <AuthScreenLayout
        title="Contraseña cambiada"
        // El texto lo escribe el backend y se muestra tal cual.
        subtitle={cambio.mensaje ?? 'Ya podés entrar con tu contraseña nueva.'}
      >
        <View style={styles.centro} accessible accessibilityRole="alert">
          <KeyRound size={ICONO} color={theme.colors.success} />
        </View>

        <Button label="Ir a iniciar sesión" onPress={irAlLogin} fullWidth />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      title="Elegí tu contraseña nueva"
      /*
        El texto lo escribe la API y se muestra tal cual: dice "si esa dirección
        tiene una cuenta…" y no "te lo mandamos". Afirmar que el correo salió
        confirmaría que esa dirección está registrada.
      */
      subtitle={params.mensaje ?? `Escribí el código que te llegó y elegí una nueva.`}
    >
      {/*
        Un email que no existe y un código equivocado dan exactamente el mismo
        error, por lo mismo de arriba.
      */}
      <FormErrorBanner message={cambio.mensajeError} />

      <CampoCodigo
        control={cambio.control}
        helperText={`Los 6 números que llegaron a ${params.email}. Vive 15 minutos.`}
        returnKeyType="next"
        editable={!cambio.guardando}
      />

      <ControlledInputField
        control={cambio.control}
        name="password"
        label="Contraseña nueva"
        placeholder="Mínimo 8 caracteres"
        helperText="Al menos 8 caracteres, con una mayúscula, una minúscula y un número."
        secureTextEntry
        toggleSecureEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        editable={!cambio.guardando}
      />

      <ControlledInputField
        control={cambio.control}
        name="confirmPassword"
        label="Repetir contraseña"
        placeholder="Repetí la contraseña"
        secureTextEntry
        toggleSecureEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={cambio.guardar}
        editable={!cambio.guardando}
      />

      <Button
        label="Guardar contraseña"
        onPress={cambio.guardar}
        loading={cambio.guardando}
        disabled={cambio.guardando}
        fullWidth
      />

      {cambio.mensajeReenvio && (
        <View style={styles.aviso} accessible accessibilityRole="alert">
          <Text variant="small" color="success" align="center">
            {cambio.mensajeReenvio}
          </Text>
        </View>
      )}

      {/* El código se quema a los 5 intentos y el error no dice cuántos quedan. */}
      {cambio.ofrecerReenvio && (
        <Text variant="small" color="textMuted" align="center">
          ¿Varias veces que no entra? Puede haber vencido. Pedí uno nuevo.
        </Text>
      )}

      <Button
        label={
          cambio.esperaReenvio > 0 ? `Reenviar en ${cambio.esperaReenvio}s` : 'Reenviar el código'
        }
        variant="secondary"
        onPress={cambio.reenviar}
        loading={cambio.reenviando}
        disabled={cambio.reenviando || cambio.esperaReenvio > 0}
        fullWidth
      />
    </AuthScreenLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    centro: { alignItems: 'center', paddingVertical: theme.spacing.lg },
    aviso: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.successMuted,
      borderRadius: theme.radius.lg,
    },
  });
