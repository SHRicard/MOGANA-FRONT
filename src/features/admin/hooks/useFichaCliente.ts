import { useCallback } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useGetFichaClienteQuery } from '../api';
import type { FichaCliente } from '../types';

/** Todo lo que necesita `FichaClienteScreen`. La pantalla no calcula nada. */
export interface FichaDelCliente {
  ficha: FichaCliente | undefined;
  /**
   * Existe, pero **todavía no compró nada**. No es un error ni un estado vacío
   * a medias: es la respuesta a "¿qué clase de cliente es?" cuando la persona
   * está registrada y nunca se le facturó.
   */
  sinCompras: boolean;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  /** `403`: el rol de quien mira no alcanza. */
  sinPermiso: boolean;
  /** `404`: no existe, **o no es un cliente** (un administrador no tiene ficha). */
  noExiste: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** Con la promesa, para el "tirar para abajo". */
  refrescar: () => Promise<void>;
}

/**
 * La ficha de un cliente (`docs/flujo_metricas_cliente.md`): **"¿qué clase de
 * cliente es este?"**.
 *
 * Es la lectura de toda su historia, no la foto de su deuda: para eso está la
 * cuenta corriente, que trae sus facturas una por una. Esta contesta si le
 * seguís fiando; aquella, qué factura ir a cobrar.
 *
 * Nada se guarda del otro lado: la tasa y las demoras se calculan con las
 * facturas y los pagos cada vez que se pide, así que un cobro anotado hace un
 * segundo ya está reflejado. Por eso se vuelve a pedir al entrar
 * (`refetchOnMountOrArgChange`) y lo que el doc pide no hacer es ponerla en un
 * `setInterval`.
 */
export function useFichaCliente(clienteId: string): FichaDelCliente {
  const { data, error, isLoading, isFetching, refetch } = useGetFichaClienteQuery(clienteId, {
    refetchOnMountOrArgChange: true,
  });

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Con error no se muestran números viejos: podrían ser de otro cliente.
  const ficha = error ? undefined : data;

  return {
    ficha,
    /**
     * Sin facturas vigentes ni anuladas: nunca se le emitió nada. Se mira el
     * total de las dos y no la plata, porque una factura en cero igual es una
     * compra que pasó.
     */
    sinCompras: ficha !== undefined && ficha.facturas.total === 0 && ficha.facturas.anuladas === 0,

    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    noExiste: getApiErrorStatus(error) === 404,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
