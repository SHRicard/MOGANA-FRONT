import { useCallback, useMemo, useRef } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage } from '@/shared/utils';
import { useNuevaClaveMutation, useRecuperarMutation } from '../api';
import {
  ERRORES_ANTES_DE_OFRECER_REENVIO,
  nuevaClaveSchema,
  type NuevaClaveFormValues,
} from '../types';
import { useContadorReenvio } from './useContadorReenvio';

export interface CambioDeClave {
  control: Control<NuevaClaveFormValues>;
  guardar: () => void;
  guardando: boolean;
  /** `true` cuando la contraseña quedó cambiada: la pantalla manda al login. */
  listo: boolean;
  /** El texto de la API, para mostrarlo tal cual. */
  mensaje: string | null;
  mensajeError: string | null;
  /** Después de varios errores: el código puede estar quemado, mejor pedir otro. */
  ofrecerReenvio: boolean;

  // ── Pedir otro código ──
  reenviar: () => void;
  reenviando: boolean;
  mensajeReenvio: string | null;
  esperaReenvio: number;
}

/**
 * La contraseña nueva, con el código que llegó al correo
 * (`docs/flujo_login.md`).
 *
 * Es **pública** —quien olvidó la contraseña no tiene sesión— y por eso el email
 * viaja en el body: seis dígitos no identifican a nadie por sí solos. El email
 * viene de la pantalla anterior para que nadie lo tipee dos veces.
 *
 * **No devuelve sesión y no se loguea a nadie**: la persona vuelve a entrar a
 * mano, que es lo que pide el contrato.
 *
 * @param email de qué cuenta. Es el que se escribió al pedir el código.
 */
export function useNuevaClave(email: string): CambioDeClave {
  const [nuevaClave, { isLoading, isSuccess, data, error }] = useNuevaClaveMutation();
  const [recuperar, { isLoading: reenviando, data: dataReenvio }] = useRecuperarMutation();
  const espera = useContadorReenvio();

  /** Ver el comentario gemelo en `useVerificarCorreo`: el código se quema a los 5. */
  const errores = useRef(0);

  const { control, handleSubmit } = useForm<NuevaClaveFormValues>({
    resolver: zodResolver(nuevaClaveSchema),
    defaultValues: { codigo: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        try {
          // El código va como lo escribió la persona: el backend acepta espacios.
          await nuevaClave({
            email,
            codigo: valores.codigo,
            password: valores.password,
          }).unwrap();
          errores.current = 0;
        } catch {
          errores.current += 1;
        }
      }),
    [handleSubmit, nuevaClave, email],
  );

  const guardar = useCallback(() => {
    // El `onPress` de un botón no espera nada; RHF ya atrapó el error del submit.
    enviar().catch(() => {});
  }, [enviar]);

  /**
   * Pedir otro código es volver a llamar al mismo endpoint que lo mandó la
   * primera vez. Contesta siempre lo mismo —exista o no la cuenta, y aunque haya
   * que esperar el minuto—, porque hasta un "esperá" delataría que ese correo
   * está registrado.
   */
  const reenviar = useCallback(() => {
    recuperar({ email })
      .unwrap()
      .then(() => {
        errores.current = 0;
        espera.arrancar();
      })
      .catch(() => {});
  }, [recuperar, email, espera]);

  return {
    control,
    guardar,
    guardando: isLoading,
    listo: isSuccess,
    mensaje: data?.message ?? null,
    mensajeError: getApiErrorMessage(error),
    ofrecerReenvio: errores.current >= ERRORES_ANTES_DE_OFRECER_REENVIO,

    reenviar,
    reenviando,
    mensajeReenvio: dataReenvio?.message ?? null,
    esperaReenvio: espera.segundos,
  };
}
