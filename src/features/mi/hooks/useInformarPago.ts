import { useCallback, useMemo } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatMonto, getApiErrorMessage, getApiErrorStatus, hoyPantalla } from '@/shared/utils';
import { useInformarPagoMutation } from '../api';
import {
  aInformarPagoPayload,
  crearInformarPagoSchema,
  MediosDePago,
  type InformarPagoFormValues,
  type MiAvisoDePago,
} from '../types';

export interface AvisoDePago {
  control: Control<InformarPagoFormValues>;
  enviar: () => void;
  isSubmitting: boolean;
  /**
   * El aviso creado por el `201`, o `undefined` si todavía no se mandó.
   *
   * Es lo que permite mostrar **"avisado, esperando confirmación"** sin volver a
   * pedir nada — y su `factura.saldo`, que sigue igual, es la confirmación de
   * que la pantalla no tiene que descontar nada.
   */
  avisado: MiAvisoDePago | undefined;
  /** `404`: esa factura **no existe o no es tuya**. Se vuelve a la lista. */
  noEncontrada: boolean;
  mensajeError: string | null;
  /** Deja el formulario como recién abierto. */
  limpiar: () => void;
}

/**
 * El formulario de **avisar que pagué** (`docs/user_cliente_flujo.md` §8).
 *
 * ⚠️ **Esto no descuenta nada.** Deja un aviso en la bandeja del panel; la deuda
 * baja recién cuando un administrador lo confirma contra el resumen del banco.
 * Si el aviso descontara solo, cualquiera saldaría su cuenta escribiendo un
 * número en un formulario. La pantalla tiene que decirlo, y por eso este hook
 * expone el aviso creado en vez de cerrar y volver.
 *
 * El monto arranca en el máximo y la fecha en hoy: el caso normal —"pagué todo,
 * hoy"— es abrir y tocar el botón. Los dos se pueden cambiar: se paga por partes
 * y la transferencia pudo salir el viernes con el aviso llegando el lunes.
 *
 * Los topes se validan acá para marcar el campo exacto en vez de gastar un
 * request que volvería con ese mismo texto. El `400` del backend es la red, no
 * la primera línea de defensa.
 *
 * @param facturaId contra qué factura se avisa. Va en la URL, nunca en el body.
 * @param maximo `saldo − lo ya informado y sin resolver`.
 * @param fechaEmision el día de la factura, en formato de API: antes de eso no
 *   existía, así que no se pudo pagar.
 * @param onAvisado se llama con el aviso creado que devuelve el `201`.
 */
export function useInformarPago(
  facturaId: string,
  maximo: number,
  fechaEmision: string,
  onAvisado?: (aviso: MiAvisoDePago) => void,
): AvisoDePago {
  const [informar, { data, isLoading, error, reset: resetMutation }] = useInformarPagoMutation();

  const defaultValues = useMemo<InformarPagoFormValues>(
    () => ({
      // Sin símbolo: es el contenido de un input, no un importe para leer. El
      // parseo entiende el "1.000,00" que sale de acá.
      monto: formatMonto(maximo, { conSimbolo: false }),
      // El medio más usado va primero puesto; igual es una lista cerrada de
      // cinco y se cambia con un toque.
      medio: MediosDePago.TRANSFERENCIA,
      fecha: hoyPantalla(),
      referencia: '',
      nota: '',
    }),
    [maximo],
  );

  /**
   * El schema depende de la factura —el máximo cambia con cada cobro anotado y
   * con cada aviso sin resolver—, así que se rehace cuando cambian sus topes.
   */
  const resolver = useMemo(
    () => zodResolver(crearInformarPagoSchema(maximo, fechaEmision)),
    [maximo, fechaEmision],
  );

  const { control, handleSubmit, reset } = useForm<InformarPagoFormValues>({
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
        const aviso = await informar(aInformarPagoPayload(facturaId, valores)).unwrap();
        onAvisado?.(aviso);
      }),
    // El `.unwrap()` rechaza cuando la API falla; el error ya queda en el hook de
    // la mutation, así que no hace falta un catch que lo duplique.
    [handleSubmit, informar, facturaId, onAvisado, resetMutation],
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
    avisado: data,
    noEncontrada: getApiErrorStatus(error) === 404,
    // Los ocho errores del `400` llegan con el texto listo: van tal cual al
    // cartel del formulario, sin traducir ni reescribir.
    mensajeError: getApiErrorMessage(error),
    limpiar,
  };
}
