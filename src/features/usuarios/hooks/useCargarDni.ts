import { useCallback, useMemo } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage } from '@/shared/utils';
import { useCargarDniMutation } from '../api';
import {
  aCargarDniPayload,
  cargarDniSchema,
  type CargarDniFormValues,
  type Usuario,
} from '../types';

export interface CargaDeDni {
  /** El formulario: el documento y por qué se carga o se corrige. */
  control: Control<CargarDniFormValues>;
  guardar: () => void;
  isSubmitting: boolean;
  mensajeError: string | null;
  /** Deja el formulario vacío y sin el cartel del intento anterior. */
  limpiar: () => void;
}

/**
 * Cargarle o corregirle el DNI a un cliente desde el panel
 * (`docs/flujo_login.md`).
 *
 * Es **la otra salida del bloqueo**: la persona puede cargarlo sola desde la app,
 * pero si se equivocó no puede cambiarlo —el segundo intento le da `409`—, así
 * que corregirlo es cosa del mostrador. También sirve para completarle la ficha
 * a quien nunca abrió la app.
 *
 * El motivo es obligatorio: queda guardado con quién lo hizo y cuándo.
 *
 * @param clienteId a quién. Va en la URL.
 * @param onCargado se llama con el cliente ya activo que devuelve el 200.
 */
export function useCargarDni(
  clienteId: string,
  onCargado?: (cliente: Usuario) => void,
): CargaDeDni {
  const [cargarDni, { isLoading, error, reset: resetMutation }] = useCargarDniMutation();

  const { control, handleSubmit, reset } = useForm<CargarDniFormValues>({
    resolver: zodResolver(cargarDniSchema),
    defaultValues: { dni: '', motivo: '' },
    mode: 'onBlur',
  });

  const limpiar = useCallback(() => {
    resetMutation();
    reset({ dni: '', motivo: '' });
  }, [reset, resetMutation]);

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        // Un intento nuevo tiene que empezar sin el cartel del anterior.
        resetMutation();
        const cliente = await cargarDni(aCargarDniPayload(clienteId, valores)).unwrap();
        onCargado?.(cliente);
      }),
    [handleSubmit, cargarDni, clienteId, onCargado, resetMutation],
  );

  const guardar = useCallback(() => {
    // El `onPress` de un botón no espera nada; RHF ya atrapó el error del submit.
    enviar().catch(() => {});
  }, [enviar]);

  return {
    control,
    guardar,
    isSubmitting: isLoading,
    mensajeError: getApiErrorMessage(error),
    limpiar,
  };
}
