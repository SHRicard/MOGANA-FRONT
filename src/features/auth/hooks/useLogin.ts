import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch } from '@/store';
import { esCuentaDadaDeBaja, getApiErrorMessage } from '@/shared/utils';
import { useLoginMutation } from '../api';
import { limpiarMotivoDeSalida, setCredentials } from '../store';
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
    // Y el cartel de la sesión que se cortó sola: si vuelve a pasar, el error de
    // este intento lo va a decir con el texto de ahora.
    dispatch(limpiarMotivoDeSalida());
    const result = await login(values).unwrap();
    dispatch(setCredentials(result));
  });

  /**
   * **La cuenta está dada de baja** (`docs/README_FRONT_BAJA_DE_CUENTA.md` §5).
   *
   * Sale del cartel común y va en uno propio: acá no hubo un error de tipeo —esa
   * cuenta no existe más y reintentar no va a andar nunca—, así que el mensaje
   * necesita su lugar y su salida.
   */
  const cuentaDadaDeBaja = esCuentaDadaDeBaja(error);

  return {
    control,
    errors: formState.errors,
    isSubmitting: isLoading,
    // Uno o el otro, nunca los dos: el mismo texto en dos carteles se lee como
    // que la app falló dos veces.
    submitError: cuentaDadaDeBaja ? null : getApiErrorMessage(error),
    mensajeDeBaja: cuentaDadaDeBaja ? getApiErrorMessage(error) : null,
    onSubmit,
  };
}
