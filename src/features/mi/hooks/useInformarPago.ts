import { useCallback, useMemo, useState } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ImagenLocal } from '@/services/imagenes';
import { formatMonto, getApiErrorMessage, getApiErrorStatus, hoyPantalla } from '@/shared/utils';
import { useInformarPagoMutation } from '../api';
import {
  aInformarPagoPayload,
  comprobanteObligatorio,
  crearInformarPagoSchema,
  MediosDePago,
  type InformarPagoFormValues,
  type MiAvisoDePago,
} from '../types';

/**
 * El `503` es el **único** error que se reintenta
 * (`docs/README_FRONT_COMPROBANTES.md` §7).
 *
 * Y se puede reintentar por un motivo concreto: si la imagen no se pudo guardar,
 * el backend borra el aviso antes de contestar, así que mandarlo de nuevo no
 * duplica nada. Los demás son de corregir, no de reintentar: repetir un `400` de
 * "supera el saldo" da otro `400` idéntico.
 *
 * Solo aparece con comprobante adjunto: sin imagen no hay store que pueda no
 * responder.
 */
const REINTENTABLE = 503;

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
  /** `true` solo con el `503`, que es el único que se arregla mandando de nuevo. */
  sePuedeReintentar: boolean;
  /** Deja el formulario como recién abierto. */
  limpiar: () => void;

  // ── El comprobante adjunto (§4) ──
  /** La captura elegida, o `null`. */
  comprobante: ImagenLocal | null;
  /** La cambia el input de adjuntar. `null` la quita. */
  elegirComprobante: (imagen: ImagenLocal | null) => void;
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
 * **Se puede adjuntar la captura del pago**
 * (`docs/README_FRONT_COMPROBANTES.md` §4), y con `transferencia`,
 * `mercado_pago` o `deposito` el backend la exige. Es el mismo endpoint de
 * siempre: con imagen sale `multipart/form-data`, sin imagen sale el JSON de
 * siempre. Y con imagen aparece el `503` —el store que no responde—, que es el
 * único error que este hook reintenta solo.
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

  /**
   * La captura del pago (`docs/README_FRONT_COMPROBANTES.md` §4).
   *
   * Estado local y no de Redux: vive lo que vive esta pantalla y no le sirve a
   * nadie más. El pendiente de la hoja de compartir sí va al store, pero porque
   * tiene que sobrevivir al login — este no.
   */
  const [comprobante, setComprobante] = useState<ImagenLocal | null>(null);

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
    setComprobante(null);
  }, [reset, resetMutation, defaultValues]);

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        /*
          La red del botón apagado. El formulario ya no deja llegar hasta acá sin
          la captura cuando el medio la exige, pero la regla es del backend y
          mandar igual es un `400` seguro: es más barato cortarlo que gastar el
          request para que vuelva con ese mismo texto (§4).
        */
        if (comprobanteObligatorio(valores.medio) && comprobante === null) {
          return;
        }

        // Un intento nuevo tiene que empezar sin el cartel del anterior.
        resetMutation();

        const payload = aInformarPagoPayload(facturaId, valores, comprobante ?? undefined);
        const resultado = await informar(payload);

        if ('error' in resultado && getApiErrorStatus(resultado.error) === REINTENTABLE) {
          // El store no respondió y el backend borró el aviso antes de
          // contestar, así que mandarlo de nuevo no duplica nada (§7). **Una
          // sola vez**: si el segundo también falla, el cartel invita a mandarlo
          // a mano en vez de quedarse reintentando solo.
          const segundo = await informar(payload);
          if ('data' in segundo && segundo.data) {
            onAvisado?.(segundo.data);
          }
          return;
        }

        if ('data' in resultado && resultado.data) {
          onAvisado?.(resultado.data);
        }
      }),
    [handleSubmit, informar, facturaId, onAvisado, resetMutation, comprobante],
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
    sePuedeReintentar: getApiErrorStatus(error) === REINTENTABLE,
    limpiar,

    comprobante,
    elegirComprobante: setComprobante,
  };
}
