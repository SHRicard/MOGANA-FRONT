import { useCallback } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useListarTicketsMesesQuery } from '../api';
import type { MesTicket } from '../types';

/** Todo lo que necesita `TicketsScreen`. La pantalla no calcula nada. */
export interface TicketsPorMes {
  /** El día al que corresponde la foto, tal como lo devuelve la API. */
  hoy: string | undefined;
  /**
   * Del más nuevo al más viejo. **Los meses sin movimiento vienen igual**: se
   * marcan en gris, pero no se filtran.
   */
  meses: readonly MesTicket[];
  total: number;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  /** `403`: el rol de quien mira no alcanza. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** Con la promesa, para el "tirar para abajo". */
  refrescar: () => Promise<void>;
}

/**
 * El índice de meses del apartado de tickets (`docs/flujo_metricas.md` §5.1):
 * **"¿qué meses hay para mirar?"**.
 *
 * ⚠️ La deuda de cada renglón es la del **cierre de ese mes**, no la de hoy. Es
 * al revés que en el tablero, y es la razón de ser del apartado: el ticket de
 * julio sigue contando julio y no se mueve con cada cobro nuevo.
 *
 * Se pide de nuevo **cada vez que se entra** (`refetchOnMountOrArgChange`): un
 * mes cerrado puede cambiar —se anula una factura vieja, se anota un cobro con
 * fecha atrasada— y el doc pide expresamente no cachear esto del lado del
 * cliente por más de una sesión.
 */
export function useTicketsMeses(): TicketsPorMes {
  const { data, error, isLoading, isFetching, refetch } = useListarTicketsMesesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    hoy: data?.hoy,
    meses: data?.meses ?? [],
    total: data?.total ?? 0,

    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
