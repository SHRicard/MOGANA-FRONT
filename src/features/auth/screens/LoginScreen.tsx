import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '@/shared/ui/atoms/Button';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { useAppSelector } from '@/store';
import { useTheme, type Theme } from '@/theme';
import {
  AuthScreenLayout,
  AvisoDeCuentaDadaDeBaja,
  EmailField,
  FormErrorBanner,
  GoogleSignInButton,
} from '../components';
import { useGoogleLogin, useLogin } from '../hooks';
import { selectMotivoDeSalida } from '../store';

export function LoginScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { control, isSubmitting, submitError, mensajeDeBaja, onSubmit } = useLogin();
  const google = useGoogleLogin();

  const isBusy = isSubmitting || google.isSubmitting;

  /**
   * **La cuenta está dada de baja** (`docs/README_FRONT_BAJA_DE_CUENTA.md` §5).
   *
   * Llega por tres caminos que terminan en el mismo texto: intentó entrar con su
   * contraseña, lo intentó con Google, o **ya estaba adentro en este teléfono y
   * se dio de baja desde otro** — ese último lo detecta el `baseApi`, que cierra
   * la sesión y deja el motivo en el store para que se explique acá y no en una
   * pantalla en blanco.
   */
  const cuentaDadaDeBaja = useAppSelector(selectMotivoDeSalida);
  const avisoDeBaja = mensajeDeBaja ?? google.mensajeDeBaja ?? cuentaDadaDeBaja;

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
      {/*
        Va arriba de todo y antes del cartel de error común: es lo único de esta
        pantalla que significa que **no hay nada que reintentar acá**. Los dos
        nunca aparecen juntos — el hook manda el mensaje a uno o al otro.
      */}
      <AvisoDeCuentaDadaDeBaja mensaje={avisoDeBaja} />

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
