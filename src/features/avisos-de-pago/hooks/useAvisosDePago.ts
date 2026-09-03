import { useCallback, useMemo, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useListarAvisosDePagoQuery } from '../api';
import {
  AVISOS_DE_PAGO_LIMITE,
  type AvisoDePago,
  type EstadoDeAvisoDePago,
  type ListarAvisosDePagoParams,
} from '../types';

/** Todo lo que necesita la bandeja para dibujarse. La pantalla no calcula nada. */
export interface BandejaDeAvisos {
  /** `null` = los pendientes, que es para lo que se abre la pantalla. */
  estado: EstadoDeAvisoDePago | null;
  onEstadoChange: (estado: EstadoDeAvisoDePago | null) => void;

  /** Los avisos de la página, el más viejo primero. */
  avisos: readonly AvisoDePago[];
  /** Cuántos hay **en el filtro**, no en la página. */
  total: number;
  /**
   * Cuántos esperan respuesta, del filtro entero. Es el globito, y sigue siendo
   * el mismo número mientras se mira el archivo.
   */
  pendientes: number;
  pagina: number;
  paginas: number;
  irAPagina: (pagina: number) => void;

  /** Primera carga, sin nada que mostrar todavía. */
  isLoading: boolean;
  /** Hay una request en vuelo (incluye cambiar de filtro o de página). */
  isFetching: boolean;
  /** `403`: el rol de quien mira no alcanza. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** Igual que `reintentar` pero esperable: lo usa el "tirar para abajo". */
  refrescar: () => Promise<void>;
}

/**
 * **La bandeja de avisos de pago** (`MORGANA-BACK/docs/flujo_comprobantes.md`).
 *
 * ⚠️ Lo que hay acá **no es plata cobrada**: es lo que los clientes *dicen* que
 * pagaron. La deuda de cada uno sigue entera hasta que alguien confirma, y ese
 * es el trabajo que esta pantalla existe para hacer.
 *
 * Arranca en los **pendientes** —sin mandar `estado`— porque es para lo que se
 * abre: ver qué hay que resolver. El archivo está a un toque, en el filtro.
 *
 * ⚠️ **Las URLs de los comprobantes se vencen en una hora.** Por eso la pantalla
 * tiene que poder refrescarse: si estuvo abierta mucho rato, las miniaturas
 * dejan de cargar y lo que las arregla es volver a pedir la lista, no reintentar
 * cada imagen.
 */
export function useAvisosDePago(): BandejaDeAvisos {
  const [estado, setEstado] = useState<EstadoDeAvisoDePago | null>(null);
  const [pagina, setPagina] = useState(1);

  /**
   * Los params son la **clave de cache** de RTK Query, así que se memorizan: un
   * objeto nuevo por render sería una request nueva por render.
   */
  const params = useMemo<ListarAvisosDePagoParams>(
    () => ({
      // `undefined` y no `null`: es lo que hace que el filtro no viaje y el
      // backend devuelva los pendientes, que es su default.
      estado: estado ?? undefined,
      pagina,
      limite: AVISOS_DE_PAGO_LIMITE,
    }),
    [estado, pagina],
  );

  const { data, isLoading, isFetching, error, refetch } = useListarAvisosDePagoQuery(params);

  /**
   * Cambiar de filtro vuelve a la página 1.
   *
   * Sin esto, ir a la página 3 de los pendientes y pasar a "rechazados" pide una
   * página 3 que puede no existir, y la pantalla queda vacía como si no hubiera
   * ninguno.
   */
  const onEstadoChange = useCallback((siguiente: EstadoDeAvisoDePago | null) => {
    setEstado(siguiente);
    setPagina(1);
  }, []);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    estado,
    onEstadoChange,

    avisos: data?.datos ?? [],
    total: data?.total ?? 0,
    pendientes: data?.pendientes ?? 0,
    pagina: data?.pagina ?? pagina,
    paginas: data?.paginas ?? 1,
    irAPagina: setPagina,

    isLoading,
    isFetching,
    // El apartado entero es de administración: un `403` no es un error de red,
    // es "esto no es para vos".
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
