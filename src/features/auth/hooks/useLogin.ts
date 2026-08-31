import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch } from '@/store';
import { getApiErrorMessage } from '@/shared/utils';
import { useLoginMutation } from '../api';
import { setCredentials } from '../store';
import { loginSchema, type LoginFormValues } from '../types';

/**
 * Toda la lógica del login: formulario, validación, llamada a la API y sesión.
 * La pantalla solo consume lo que devuelve este hook.
 *
 * Se entra **con correo y contraseña**, y nada más (`docs/flujo_login.md`).
 *
 * No navega a ningún lado al terminar, y eso es a propósito: la sesión que se
 * guarda trae el `estado`, y es el `RootNavigator` el que decide si la persona
 * va a la app o al cartel para completar su perfil. Una cuenta recién creada
 * —o una que nunca cargó el DNI— entra bloqueada.
 */
export function useLogin() {
  const dispatch = useAppDispatch();
  const [login, { isLoading, error, reset: resetRequest }] = useLoginMutation();

  const { control, handleSubmit, formState } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched', // valida al salir del campo, no en cada tecla
  });

  const onSubmit = handleSubmit(async (values) => {
    // Limpia el error del intento anterior antes de reintentar.
    resetRequest();
    const result = await login(values).unwrap();
    dispatch(setCredentials(result));
  });

  return {
    control,
    errors: formState.errors,
    isSubmitting: isLoading,
    submitError: getApiErrorMessage(error),
    onSubmit,
  };
}
