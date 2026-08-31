import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ForgotPasswordScreen,
  LoginScreen,
  NuevaClaveScreen,
  RegisterScreen,
} from '@/features/auth';
import { AuthRoutes } from './routes';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Stack de usuarios sin sesión: login, registro y recuperar la contraseña. */
export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={AuthRoutes.LOGIN} component={LoginScreen} />
      <Stack.Screen name={AuthRoutes.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={AuthRoutes.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      {/*
        El código que llegó al correo. Es el paso siguiente de "¿Olvidaste tu
        contraseña?" y vive acá porque es pública: quien la abre no puede entrar.
      */}
      <Stack.Screen name={AuthRoutes.NUEVA_CLAVE} component={NuevaClaveScreen} />
    </Stack.Navigator>
  );
}
