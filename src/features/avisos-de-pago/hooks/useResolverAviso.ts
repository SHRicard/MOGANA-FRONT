import { useCallback, useMemo, useState } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatFecha, formatMonto, getApiErrorMessage } from '@/shared/utils';
import { useConfirmarAvisoMutation, useRechazarAvisoMutation } from '../api';
import {
  aConfirmarAvisoPayload,
  crearConfirmarAvisoSchema,
  rechazarAvisoSchema,
  type AvisoDePago,
  type ConfirmarAvisoFormValues,
  type RechazarAvisoFormValues,
} from '../types';

/** Qué diálogo está abierto para un aviso, si hay alguno. */
export type AccionSobreElAviso = 'confirmar' | 'rechazar' | null;

export interface ResolucionDeAviso {
  /** Sobre cuál se está decidiendo, o `null` si no hay ninguno abierto. */
  aviso: AvisoDePago | null;
  accion: AccionSobreElAviso;
  abrirConfirmar: (aviso: AvisoDePago) => void;
  abrirRechazar: (aviso: AvisoDePago) => void;
  cerrar: () => void;

  confirmarControl: Control<ConfirmarAvisoFormValues>;
  rechazarControl: Control<RechazarAvisoFormValues>;
  confirmar: () => void;
  rechazar: () => void;
  resolviendo: boolean;
  mensajeError: string | null;
}

/**
 * **Decidir sobre un aviso**: confirmarlo o rechazarlo
 * (`MORGANA-BACK/docs/flujo_comprobantes.md`).
 *
 * Las dos acciones viven en el mismo hook porque son **la misma decisión** con
 * dos salidas, y comparten todo lo que las rodea: cuál es el aviso abierto,
 * cuál de los dos formularios se está mostrando y el cartel de error. Separarlas
 * obligaría a la pantalla a coordinar dos hooks para que no se pisen.
 *
 * ⚠️ **Confirmar mueve plata.** Anota un cobro contra la factura y le baja la
 * deuda al cliente; al cliente le llega un aviso de que se le tomó. Rechazar no
 * toca la factura: solo escribe el motivo, que le llega tal cual.
 *
 * **El formulario de confirmar nace con lo que informó el cliente**, así el caso
 * normal —"sí, eso entró"— es abrir y tocar el botón. Se corrige cuando el banco
 * dice otra cosa.
 */
export function useResolverAviso(): ResolucionDeAviso {
  const [aviso, setAviso] = useState<AvisoDePago | null>(null);
  const [accion, setAccion] = useState<AccionSobreElAviso>(null);

  const [confirmarAviso, confirmarEstado] = useConfirmarAvisoMutation();
  const [rechazarAviso, rechazarEstado] = useRechazarAvisoMutation();

  /**
   * El tope de lo que se puede anotar es el saldo de la factura. Con el diálogo
   * cerrado da igual: el schema solo se usa mientras hay un aviso abierto.
   */
  const saldo = aviso?.factura.saldo ?? 0;
  const confirmarResolver = useMemo(() => zodResolver(crearConfirmarAvisoSchema(saldo)), [saldo]);

  const {
    control: confirmarControl,
    handleSubmit: submitConfirmar,
    reset: resetConfirmar,
  } = useForm<ConfirmarAvisoFormValues>({
    resolver: confirmarResolver,
    defaultValues: { monto: '', fecha: '', nota: '' },
    mode: 'onBlur',
  });

  const {
    control: rechazarControl,
    handleSubmit: submitRechazar,
    reset: resetRechazar,
  } = useForm<RechazarAvisoFormValues>({
    resolver: zodResolver(rechazarAvisoSchema),
    defaultValues: { motivo: '' },
    mode: 'onBlur',
  });

  const abrirConfirmar = useCallback(
    (elegido: AvisoDePago) => {
      confirmarEstado.reset();
      rechazarEstado.reset();
      /*
        Precargado con lo que dijo el cliente (§confirmar): lo normal es que el
        banco muestre exactamente eso, y así confirmar es abrir y tocar el botón.
        Va en un `reset` y no en `defaultValues` porque el aviso se elige
        DESPUÉS de montar el formulario, y React Hook Form lee los defaults una
        sola vez.
      */
      resetConfirmar({
        // Sin símbolo: es el contenido de un input, no un importe para leer.
        monto: formatMonto(elegido.monto, { conSimbolo: false }),
        fecha: formatFecha(elegido.fecha),
        nota: '',
      });
      setAviso(elegido);
      setAccion('confirmar');
    },
    [resetConfirmar, confirmarEstado, rechazarEstado],
  );

  const abrirRechazar = useCallback(
    (elegido: AvisoDePago) => {
      confirmarEstado.reset();
      rechazarEstado.reset();
      // El motivo arranca vacío a propósito: no hay ninguno que se pueda
      // proponer sin inventarlo, y le llega al cliente tal cual.
      resetRechazar({ motivo: '' });
      setAviso(elegido);
      setAccion('rechazar');
    },
    [resetRechazar, confirmarEstado, rechazarEstado],
  );

  const cerrar = useCallback(() => {
    setAccion(null);
    setAviso(null);
    confirmarEstado.reset();
    rechazarEstado.reset();
  }, [confirmarEstado, rechazarEstado]);

  const confirmar = useMemo(
    () =>
      submitConfirmar(async (valores) => {
        if (!aviso) {
          return;
        }
        const resultado = await confirmarAviso(aConfirmarAvisoPayload(aviso.id, valores));
        // Se cierra solo con el `200`: si falló, el diálogo tiene que quedar
        // abierto con el cartel, no desaparecer como si hubiera andado.
        if ('data' in resultado) {
          cerrar();
        }
      }),
    [submitConfirmar, aviso, confirmarAviso, cerrar],
  );

  const rechazar = useMemo(
    () =>
      submitRechazar(async (valores) => {
        if (!aviso) {
          return;
        }
        const resultado = await rechazarAviso({
          avisoId: aviso.id,
          datos: { motivo: valores.motivo.trim() },
        });
        if ('data' in resultado) {
          cerrar();
        }
      }),
    [submitRechazar, aviso, rechazarAviso, cerrar],
  );

  /*
    `handleSubmit` devuelve una promesa que ya no rechaza (RHF atrapa el error
    del submit). Se descarta a propósito: el `onPress` de un botón no espera
    nada, y devolverla haría que React avise de una promesa colgada.
  */
  const confirmarSeguro = useCallback(() => {
    confirmar().catch(() => {});
  }, [confirmar]);

  const rechazarSeguro = useCallback(() => {
    rechazar().catch(() => {});
  }, [rechazar]);

  return {
    aviso,
    accion,
    abrirConfirmar,
    abrirRechazar,
    cerrar,

    confirmarControl,
    rechazarControl,
    confirmar: confirmarSeguro,
    rechazar: rechazarSeguro,
    resolviendo: confirmarEstado.isLoading || rechazarEstado.isLoading,
    // Los errores del backend llegan con el texto listo: van tal cual al cartel.
    mensajeError:
      getApiErrorMessage(confirmarEstado.error) ?? getApiErrorMessage(rechazarEstado.error),
  };
}
