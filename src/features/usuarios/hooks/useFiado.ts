import { useCallback, useMemo } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage } from '@/shared/utils';
import { useCambiarFiadoMutation } from '../api';
import {
  aBloquearFiadoPayload,
  bloquearFiadoSchema,
  type BloquearFiadoFormValues,
  type Usuario,
} from '../types';

export interface ControlDeFiado {
  /** El formulario del bloqueo: un solo campo, el motivo. */
  control: Control<BloquearFiadoFormValues>;
  /** Corta el fiado con el motivo cargado. Valida antes de salir a la red. */
  bloquear: () => void;
  /** Se lo devuelve. No pide nada: el motivo viejo lo borra el backend. */
  desbloquear: () => void;
  /** Hay un cambio en vuelo: los botones se bloquean. */
  isSubmitting: boolean;
  mensajeError: string | null;
  /** Deja el formulario vacío y sin el cartel del intento anterior. */
  limpiar: () => void;
}

/**
 * Cortarle el fiado a un cliente o devolvérselo (`docs/bloquear_fiado.md`).
 *
 * **Todos arrancan con fiado**: esto se usa cuando hay que dejar la marca de que
 * a esta persona no se le fía más, con el motivo que va a leer el que atienda.
 *
 * ⚠️ Es **una marca, no una traba**: el backend sigue dejando facturarle a
 * plazo. Por eso el motivo es obligatorio — es lo único que hace que la marca
 * signifique algo en el mostrador.
 *
 * @param clienteId a quién. Va en la URL.
 * @param onCambiado se llama con el cliente ya actualizado que devuelve el 200.
 */
export function useFiado(
  clienteId: string,
  onCambiado?: (cliente: Usuario) => void,
): ControlDeFiado {
  const [cambiarFiado, { isLoading, error, reset: resetMutation }] = useCambiarFiadoMutation();

  const { control, handleSubmit, reset } = useForm<BloquearFiadoFormValues>({
    resolver: zodResolver(bloquearFiadoSchema),
    defaultValues: { motivo: '' },
    mode: 'onBlur',
  });

  const limpiar = useCallback(() => {
    resetMutation();
    reset({ motivo: '' });
  }, [reset, resetMutation]);

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        // Un intento nuevo tiene que empezar sin el cartel del anterior.
        resetMutation();
        const actualizado = await cambiarFiado(aBloquearFiadoPayload(clienteId, valores)).unwrap();
        onCambiado?.(actualizado);
      }),
    // El `.unwrap()` rechaza cuando la API falla; el error ya queda en el hook de
    // la mutation, así que no hace falta un catch que lo duplique.
    [handleSubmit, cambiarFiado, clienteId, onCambiado, resetMutation],
  );

  const bloquear = useCallback(() => {
    // `handleSubmit` devuelve una promesa que ya no rechaza (RHF atrapa el error
    // del submit). Se descarta a propósito: el `onPress` de un botón no espera
    // nada, y devolverla haría que React avise de una promesa colgada.
    enviar().catch(() => {});
  }, [enviar]);

  const desbloquear = useCallback(() => {
    resetMutation();
    // Sin motivo: devolver el fiado no se explica, y el backend borra el viejo.
    cambiarFiado({ clienteId, seLeFia: true })
      .unwrap()
      .then((actualizado) => onCambiado?.(actualizado))
      .catch(() => {});
  }, [cambiarFiado, clienteId, onCambiado, resetMutation]);

  return {
    control,
    bloquear,
    desbloquear,
    isSubmitting: isLoading,
    mensajeError: getApiErrorMessage(error),
    limpiar,
  };
}
