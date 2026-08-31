import { useCallback, useMemo } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage } from '@/shared/utils';
import { useAnularFacturaMutation } from '../api';
import {
  aAnularFacturaPayload,
  anularFacturaSchema,
  type AnularFacturaFormValues,
  type Factura,
} from '../types';

export interface AnulacionDeFactura {
  control: Control<AnularFacturaFormValues>;
  enviar: () => void;
  isSubmitting: boolean;
  mensajeError: string | null;
  /** Deja el formulario vacío y sin el cartel del intento anterior. */
  limpiar: () => void;
}

/**
 * Dar de baja una factura mal emitida (`docs/flujo_pagos.md` §9).
 *
 * Un solo campo, el **motivo**, y no es un trámite: es lo único que explica,
 * seis meses después, por qué falta ese número en la numeración. Se valida acá
 * el largo que pide el backend (`Contá en una línea por qué se anula.`).
 *
 * ⚠️ **No se puede deshacer**, así que la pantalla pide confirmación antes de
 * mandarlo.
 *
 * @param facturaId cuál se anula. Va en la URL.
 * @param onAnulada se llama con la factura ya anulada que devuelve el 201.
 */
export function useAnularFactura(
  facturaId: string,
  onAnulada?: (factura: Factura) => void,
): AnulacionDeFactura {
  const [anularFactura, { isLoading, error, reset: resetMutation }] = useAnularFacturaMutation();

  const { control, handleSubmit, reset } = useForm<AnularFacturaFormValues>({
    resolver: zodResolver(anularFacturaSchema),
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
        const anulada = await anularFactura(aAnularFacturaPayload(facturaId, valores)).unwrap();
        onAnulada?.(anulada);
      }),
    // El `.unwrap()` rechaza cuando la API falla; el error ya queda en el hook de
    // la mutation, así que no hace falta un catch que lo duplique.
    [handleSubmit, anularFactura, facturaId, onAnulada, resetMutation],
  );

  const enviarSeguro = useCallback(() => {
    // `handleSubmit` devuelve una promesa que ya no rechaza (RHF atrapa el error
    // del submit). Se descarta a propósito: el `onPress` de un botón no espera
    // nada, y devolverla haría que React avise de una promesa colgada.
    enviar().catch(() => {});
  }, [enviar]);

  return {
    control,
    enviar: enviarSeguro,
    isSubmitting: isLoading,
    mensajeError: getApiErrorMessage(error),
    limpiar,
  };
}
