import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '@/shared/ui/atoms/Button';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { AuthScreenLayout, EmailField, FormErrorBanner, GoogleSignInButton } from '../components';
import { useGoogleLogin, useLogin } from '../hooks';

export function LoginScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { control, isSubmitting, submitError, onSubmit } = useLogin();
  const google = useGoogleLogin();

  const isBusy = isSubmitting || google.isSubmitting;

  return (
    <AuthScreenLayout
      title="Iniciar sesión"
      subtitle="Ingresá con tu cuenta para continuar."
      footer={
        <View style={styles.footer}>
          <Text variant="small" color="textMuted">
            ¿No tenés cuenta?
          </Text>
          <Link label="Creá una" onPress={() => navigation.navigate('Register')} />
        </View>
      }
    >
      {/* El error del backend se muestra tal cual: ya viene redactado. Cuando la
          cuenta se creó con Google, el mensaje manda a usar ese botón — que está
          ahí abajo, en la misma pantalla. */}
      <FormErrorBanner message={submitError} />

      <EmailField control={control} returnKeyType="next" />

      <View style={styles.passwordBlock}>
        <ControlledInputField
          control={control}
          name="password"
          label="Contraseña"
          placeholder="Tu contraseña"
          secureTextEntry
          toggleSecureEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />

        {/* Link chico y a la derecha: es una acción secundaria. Como botón de
            ancho completo competía con "Ingresar", que es la acción principal. */}
        <View style={styles.forgotRow}>
          <Link
            label="¿Olvidaste tu contraseña?"
            variant="caption"
            onPress={() => navigation.navigate('ForgotPassword')}
          />
        </View>
      </View>

      <Button
        label="Ingresar"
        onPress={onSubmit}
        loading={isSubmitting}
        disabled={isBusy}
        fullWidth
      />

      <GoogleSignInButton
        onPress={google.signIn}
        disabled={isBusy}
        loading={google.isSubmitting}
        error={google.error}
      />
    </AuthScreenLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    passwordBlock: { gap: theme.spacing.sm },
    forgotRow: { alignItems: 'flex-end' },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
  });
