import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch } from '@/store';
import { getApiErrorMessage } from '@/shared/utils';
import { useRegisterMutation } from '../api';
import { setCredentials } from '../store';
import { registerSchema, type RegisterFormValues } from '../types';

/**
 * Alta de cuenta: correo, contraseña y —si quiere— el nombre.
 *
 * **El DNI no se pide acá** (`docs/flujo_login.md`): mandarlo es `400`. La
 * cuenta nace bloqueada y el documento se pide adentro de la app, una sola vez.
 * Por eso el registro no lleva a ninguna pantalla: la respuesta ya viene con
 * `estado: "bloqueado"` y el `RootNavigator` muestra el cartel.
 */
export function useRegister() {
  const dispatch = useAppDispatch();
  const [register, { isLoading, error, reset: resetRequest }] = useRegisterMutation();

  const { control, handleSubmit, formState } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', displayName: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    resetRequest();
    const result = await register({
      email: values.email,
      password: values.password,
      // El nombre es opcional: vacío no se manda, y el backend arma el `name`
      // con el usuario del email.
      ...(values.displayName ? { displayName: values.displayName } : {}),
    }).unwrap();
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
