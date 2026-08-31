import { useCallback, useMemo } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatMonto, getApiErrorMessage, hoyPantalla } from '@/shared/utils';
import { useRegistrarPagoMutation } from '../api';
import {
  aNuevoPagoPayload,
  crearNuevoPagoSchema,
  type Factura,
  type NuevoPagoFormValues,
} from '../types';

export interface RegistroDePago {
  control: Control<NuevoPagoFormValues>;
  enviar: () => void;
  isSubmitting: boolean;
  mensajeError: string | null;
  /** Deja el formulario como recién abierto: monto en el saldo y fecha en hoy. */
  limpiar: () => void;
}

/**
 * El formulario de cobro de una factura (`docs/flujo_pagos.md` §7).
 *
 * **El monto arranca precargado con el saldo**: lo más común es que pague todo
 * lo que falta, y así el caso normal es tocar un botón. La fecha arranca en hoy
 * y se puede mover para atrás — la plata pudo entrar el viernes y anotarse el
 * lunes.
 *
 * El tope del monto es el saldo, y se valida acá: el `400` del backend
 * (`El pago supera el saldo de esta factura: debe $500.00.`) es la red, no la
 * primera línea de defensa.
 *
 * @param facturaId contra qué factura se anota. Va en la URL.
 * @param saldo cuánto falta cobrar: es el valor propuesto y también el tope.
 * @param onRegistrado se llama con la factura ya recalculada que devuelve el 201.
 */
export function useRegistrarPago(
  facturaId: string,
  saldo: number,
  onRegistrado?: (factura: Factura) => void,
): RegistroDePago {
  const [registrarPago, { isLoading, error, reset: resetMutation }] = useRegistrarPagoMutation();

  const defaultValues = useMemo<NuevoPagoFormValues>(
    () => ({
      // Sin símbolo: es el contenido de un input, no un importe para leer. El
      // parseo entiende el "1.000,00" que sale de acá.
      monto: formatMonto(saldo, { conSimbolo: false }),
      fecha: hoyPantalla(),
      nota: '',
    }),
    [saldo],
  );

  // El schema depende del saldo —un pago no puede superarlo—, así que se rehace
  // cuando cambia: después de cobrar la mitad, el tope es la otra mitad.
  const resolver = useMemo(() => zodResolver(crearNuevoPagoSchema(saldo)), [saldo]);

  const { control, handleSubmit, reset } = useForm<NuevoPagoFormValues>({
    resolver,
    defaultValues,
    mode: 'onBlur',
  });

  const limpiar = useCallback(() => {
    resetMutation();
    reset(defaultValues);
  }, [reset, resetMutation, defaultValues]);

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        // Un intento nuevo tiene que empezar sin el cartel del anterior.
        resetMutation();
        const actualizada = await registrarPago(aNuevoPagoPayload(facturaId, valores)).unwrap();
        onRegistrado?.(actualizada);
      }),
    // El `.unwrap()` rechaza cuando la API falla; el error ya queda en el hook de
    // la mutation, así que no hace falta un catch que lo duplique.
    [handleSubmit, registrarPago, facturaId, onRegistrado, resetMutation],
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
