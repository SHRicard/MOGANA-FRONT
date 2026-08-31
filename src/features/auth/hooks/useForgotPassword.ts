import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage } from '@/shared/utils';
import { useRecuperarMutation } from '../api';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../types';

/**
 * Pedir el código para cambiar la contraseña (`docs/flujo_login.md`).
 *
 * La API responde **siempre lo mismo**, exista o no la cuenta —y también si se
 * pidió uno hace menos de un minuto—: contestar distinto cuando el correo existe
 * convertiría esto en un buscador de clientes del negocio. Por eso no hay
 * "salió" ni "no salió": se muestra el mensaje y se sigue.
 *
 * @param onEnviado a dónde seguir. Recibe el email tipeado —para no hacérselo
 * escribir de nuevo en la pantalla del código— y el texto que devolvió la API.
 */
export function useForgotPassword(onEnviado?: (email: string, mensaje: string) => void) {
  const [recuperar, { isLoading, error, reset: resetRequest }] = useRecuperarMutation();

  const { control, handleSubmit, formState } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = useCallback(
    () =>
      handleSubmit(async (values) => {
        resetRequest();
        const respuesta = await recuperar(values).unwrap();
        // El email ya viene normalizado por el schema (minúsculas, sin espacios),
        // que es el mismo que va a viajar al confirmar.
        onEnviado?.(values.email, respuesta.message);
      })().catch(() => {}),
    [handleSubmit, recuperar, resetRequest, onEnviado],
  );

  return {
    control,
    errors: formState.errors,
    isSubmitting: isLoading,
    submitError: getApiErrorMessage(error),
    onSubmit,
  };
}
