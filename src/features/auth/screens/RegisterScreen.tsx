import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '@/shared/ui/atoms/Button';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { AuthScreenLayout, EmailField, FormErrorBanner, GoogleSignInButton } from '../components';
import { useGoogleLogin, useRegister } from '../hooks';

export function RegisterScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { control, isSubmitting, submitError, onSubmit } = useRegister();
  // Mismo endpoint que en login: si el email no existe, el backend crea la cuenta.
  const google = useGoogleLogin();

  const isBusy = isSubmitting || google.isSubmitting;

  return (
    <AuthScreenLayout
      title="Crear cuenta"
      subtitle="Completá tus datos para empezar."
      footer={
        <View style={styles.footer}>
          <Text variant="small" color="textMuted">
            ¿Ya tenés cuenta?
          </Text>
          <Link label="Iniciá sesión" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <FormErrorBanner message={submitError} />

      <EmailField control={control} returnKeyType="next" />

      {/* Opcional a propósito: si viene vacío, el backend arma el nombre con el
          usuario del email. El DNI NO se pide acá: se carga adentro de la app
          (`docs/flujo_login.md`). */}
      <ControlledInputField
        control={control}
        name="displayName"
        label="Nombre (opcional)"
        placeholder="Tu nombre"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />

      <ControlledInputField
        control={control}
        name="password"
        label="Contraseña"
        placeholder="Mínimo 8 caracteres"
        helperText="Al menos 8 caracteres, con una mayúscula, una minúscula y un número."
        secureTextEntry
        toggleSecureEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
      />

      <ControlledInputField
        control={control}
        name="confirmPassword"
        label="Repetir contraseña"
        placeholder="Repetí la contraseña"
        secureTextEntry
        toggleSecureEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      <Button
        label="Crear cuenta"
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
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
  });
