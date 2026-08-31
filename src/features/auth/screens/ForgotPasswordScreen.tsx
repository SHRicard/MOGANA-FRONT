import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
// Ruta profunda y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { AuthRoutes } from '@/app/navigation/routes';
import { Button } from '@/shared/ui/atoms/Button';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import { Link } from '@/shared/ui/atoms/Link';
import { AuthScreenLayout, FormErrorBanner } from '../components';
import { useForgotPassword } from '../hooks';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();

  /**
   * Al pedir el código se sigue a la pantalla donde se escribe, llevando el
   * email para que nadie lo tipee dos veces y el mensaje de la API para
   * mostrarlo tal cual.
   *
   * Se navega **siempre**, salga o no el correo: la API contesta lo mismo en los
   * dos casos a propósito, y frenar acá cuando la cuenta no existe delataría
   * cuáles están registradas.
   */
  const irAlCodigo = useCallback(
    (email: string, mensaje: string) => {
      navigation.navigate(AuthRoutes.NUEVA_CLAVE, { email, mensaje });
    },
    [navigation],
  );

  const { control, isSubmitting, submitError, onSubmit } = useForgotPassword(irAlCodigo);

  return (
    <AuthScreenLayout
      title="Recuperar contraseña"
      subtitle="Ingresá tu email y te mandamos un código de 6 números para crear una nueva."
      footer={<Link label="Volver al inicio de sesión" onPress={() => navigation.goBack()} />}
    >
      <FormErrorBanner message={submitError} />

      <ControlledInputField
        control={control}
        name="email"
        label="Email"
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      {/* "Enviar código" y no "enlace": lo que llega es un número de 6 dígitos. */}
      <Button label="Enviarme el código" onPress={onSubmit} loading={isSubmitting} fullWidth />
    </AuthScreenLayout>
  );
}
