import { useCallback, useMemo, useRef } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage } from '@/shared/utils';
import { useReenviarVerificacionMutation, useVerificarCorreoMutation } from '../api';
import {
  ERRORES_ANTES_DE_OFRECER_REENVIO,
  verificarCorreoSchema,
  type VerificarCorreoFormValues,
} from '../types';
import { useContadorReenvio } from './useContadorReenvio';

export interface Verificacion {
  control: Control<VerificarCorreoFormValues>;
  verificar: () => void;
  verificando: boolean;
  /** `true` cuando el correo quedó verificado. */
  listo: boolean;
  /** El texto de la API, para mostrarlo tal cual. */
  mensaje: string | null;
  mensajeError: string | null;
  /**
   * `true` después de varios errores: el código puede estar quemado y lo que
   * corresponde es pedir otro, no seguir probando.
   */
  ofrecerReenvio: boolean;

  // ── Pedir otro código ──
  reenviar: () => void;
  reenviando: boolean;
  /** Los tres mensajes del reenvío son `200`: ninguno se pinta de rojo. */
  mensajeReenvio: string | null;
  /** Segundos que faltan para poder pedir otro. `0` = ya se puede. */
  esperaReenvio: number;
}

/**
 * Verificar el correo con el código de 6 dígitos (`docs/flujo_login.md`).
 *
 * **Pide sesión**: el body es solo el código porque la cuenta sale del token.
 *
 * ⚠️ Verificar **no desbloquea nada** —eso lo hace el DNI—, así que esta
 * pantalla nunca es obligatoria: si la persona la saltea, la app funciona igual.
 */
export function useVerificarCorreo(): Verificacion {
  const [verificarMutation, { isLoading, isSuccess, data, error }] = useVerificarCorreoMutation();
  const [reenviarMutation, { isLoading: reenviando, data: dataReenvio }] =
    useReenviarVerificacionMutation();
  const espera = useContadorReenvio();

  /**
   * Cuántas veces se erró. **El código se quema a los 5 intentos**, aunque no
   * haya vencido, y el mensaje de error es siempre el mismo — así que la app no
   * puede saber cuántos quedan. Se cuenta acá para ofrecer la salida antes de
   * que la persona se quede golpeando contra un código muerto.
   *
   * Va en un `ref` y no en un `useState`: no dibuja nada por sí solo, y como
   * cambia junto con el error de la mutation, el re-render ya viene con él.
   */
  const errores = useRef(0);

  const { control, handleSubmit } = useForm<VerificarCorreoFormValues>({
    resolver: zodResolver(verificarCorreoSchema),
    defaultValues: { codigo: '' },
    mode: 'onSubmit',
  });

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        try {
          // Se manda como lo escribió la persona: el backend acepta espacios.
          await verificarMutation({ codigo: valores.codigo }).unwrap();
          errores.current = 0;
        } catch {
          errores.current += 1;
        }
      }),
    [handleSubmit, verificarMutation],
  );

  const verificar = useCallback(() => {
    // El `onPress` de un botón no espera nada; RHF ya atrapó el error del submit.
    enviar().catch(() => {});
  }, [enviar]);

  const reenviar = useCallback(() => {
    reenviarMutation()
      .unwrap()
      .then(() => {
        // El código viejo se dio de baja: los intentos de ese ya no cuentan.
        errores.current = 0;
        espera.arrancar();
      })
      .catch(() => {});
  }, [reenviarMutation, espera]);

  return {
    control,
    verificar,
    verificando: isLoading,
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
