import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MailCheck from 'lucide-react-native/icons/mail-check';
import { Button } from '@/shared/ui/atoms/Button';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { AuthScreenLayout, CampoCodigo, FormErrorBanner } from '../components';
import { useVerificarCorreo } from '../hooks';

const ICONO = 48;

/**
 * Escribir el código que llegó al correo (`docs/flujo_login.md`).
 *
 * **Pide sesión**: el body es solo el código y la cuenta sale del token. Se
 * llega desde el cartel de Mi cuenta.
 *
 * ⚠️ Verificar **no desbloquea nada** —eso lo hace el DNI—, así que esta
 * pantalla nunca es obligatoria: se puede salir sin hacerlo y la app funciona
 * igual. Por eso el botón de volver está siempre y no hay ninguna pared.
 */
export function VerificarCorreoScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const verificacion = useVerificarCorreo();

  if (verificacion.listo) {
    return (
      <AuthScreenLayout
        title="Listo"
        // El texto lo escribe el backend y se muestra tal cual.
        subtitle={verificacion.mensaje ?? 'Tu correo quedó verificado.'}
      >
        <View style={styles.centro} accessible accessibilityRole="alert">
          <MailCheck size={ICONO} color={theme.colors.success} />
        </View>

        <Button label="Volver" onPress={() => navigation.goBack()} fullWidth />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      title="Verificá tu correo"
      subtitle="Te mandamos un código de 6 números. Escribilo acá abajo."
    >
      {/*
        El error es siempre el mismo texto —mal escrito, vencido o ya usado— y es
        a propósito: precisar cuál le confirmaría a quien esté probando números
        que va por buen camino.
      */}
      <FormErrorBanner message={verificacion.mensajeError} />

      <CampoCodigo
        control={verificacion.control}
        returnKeyType="done"
        onSubmitEditing={verificacion.verificar}
        editable={!verificacion.verificando}
      />

      <Button
        label="Verificar"
        onPress={verificacion.verificar}
        loading={verificacion.verificando}
        disabled={verificacion.verificando}
        fullWidth
      />

      {/* Los tres mensajes del reenvío son `200`: ninguno se pinta de rojo. */}
      {verificacion.mensajeReenvio && (
        <View style={styles.aviso} accessible accessibilityRole="alert">
          <Text variant="small" color="success" align="center">
            {verificacion.mensajeReenvio}
          </Text>
        </View>
      )}

      {/*
        El código se quema a los 5 intentos, aunque no haya vencido, y el error
        no dice cuántos quedan. Después de unos cuantos, lo que corresponde es
        pedir otro y no seguir probando — así que el botón se ofrece solo.
      */}
      {verificacion.ofrecerReenvio && (
        <Text variant="small" color="textMuted" align="center">
          ¿Varias veces que no entra? Puede haber vencido. Pedí uno nuevo.
        </Text>
      )}

      <Button
        label={
          verificacion.esperaReenvio > 0
            ? `Reenviar en ${verificacion.esperaReenvio}s`
            : 'Reenviar el código'
        }
        variant="secondary"
        onPress={verificacion.reenviar}
        loading={verificacion.reenviando}
        // Hay un minuto de espera del lado del backend: pedir otro antes
        // contesta "recién te mandamos uno". El contador lo hace visible.
        disabled={verificacion.reenviando || verificacion.esperaReenvio > 0}
        fullWidth
      />

      <Button
        label="Ahora no"
        variant="ghost"
        onPress={() => navigation.goBack()}
        disabled={verificacion.verificando}
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
