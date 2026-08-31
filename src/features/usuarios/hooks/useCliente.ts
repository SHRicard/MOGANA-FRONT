import { useCallback } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useGetClienteQuery } from '../api';
import { esFacturable, type Usuario } from '../types';

/** Todo lo que necesita `ClienteScreen` para dibujarse. */
export interface FichaCliente {
  /** `undefined` mientras carga o si falló. */
  cliente: Usuario | undefined;
  isLoading: boolean;
  /** Hay una request en vuelo (incluye el refetch al reintentar). */
  isFetching: boolean;
  /**
   * `404`: no hay ninguna cuenta de cliente con ese id. También pasa cuando el
   * id es de un administrador — acá adentro solo existen los clientes.
   */
  noEncontrado: boolean;
  /** `403`: el rol de quien mira no alcanza para este apartado. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /**
   * Vuelve a pedirle los datos a la API, igual que `reintentar`, pero
   * **devolviendo la promesa**: es lo que usa el "tirar para abajo" para dejar
   * la rueda girando hasta que la respuesta llega.
   */
  refrescar: () => Promise<void>;
  /**
   * Si se le puede emitir una factura. Con la ficha en mano siempre es un
   * cliente —el endpoint no devuelve otra cosa—, pero se chequea igual: el
   * botón se dibuja a partir del dato, no de una suposición.
   */
  puedeFacturar: boolean;
}

/**
 * La ficha de un cliente (`GET /api/admin/clientes/:id`).
 *
 * Se pide a la API en vez de arrastrar la fila del listado: así la pantalla
 * también funciona al volver de facturar, después de un refresh o desde un deep
 * link, y no muestra datos viejos de una lista que quedó en cache.
 */
export function useCliente(clienteId: string): FichaCliente {
  const { data, error, isLoading, isFetching, refetch } = useGetClienteQuery(clienteId);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  /**
   * Lo mismo que `reintentar`, pero esperable. Son dos porque se usan distinto:
   * el botón de reintentar dispara y se olvida, y el gesto de refrescar necesita
   * saber cuándo terminó para bajar la rueda.
   */
  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const status = getApiErrorStatus(error);

  return {
    cliente: data,
    isLoading,
    isFetching,
    noEncontrado: status === 404,
    sinPermiso: status === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
    puedeFacturar: data !== undefined && esFacturable(data),
  };
}
