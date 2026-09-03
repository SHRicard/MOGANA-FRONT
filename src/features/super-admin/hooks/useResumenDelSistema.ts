import { useCallback } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useGetResumenDelSistemaQuery } from '../api';
import { relojCorrido, type ResumenDelSistema } from '../types';

/** Todo lo que necesita `SistemaScreen` para dibujarse. */
export interface TableroDelSistema {
  /** `undefined` mientras carga o si falló. */
  resumen: ResumenDelSistema | undefined;
  isLoading: boolean;
  isFetching: boolean;
  /** `403`: el rol de quien mira no alcanza. Merece pantalla propia, no un toast. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** El `refetch` envuelto, devolviendo la promesa: es lo que usa el gesto de refrescar. */
  refrescar: () => Promise<void>;
  /**
   * `true` si la hora del servidor se aparta de la de este teléfono más de lo
   * tolerable. Se calcula acá y no en la pantalla porque es una regla del
   * dominio, no un formato.
   */
  relojDesfasado: boolean;
}

/**
 * El tablero del sistema (`GET /api/super-admin/resumen`).
 *
 * ⚠️ La pantalla no decide nada sobre el store: el semáforo lo decide `nivel`,
 * que viene del servidor (`semaforoDelStore`). Repetir los umbrales acá haría
 * que el día que se muevan la app diga "todo bien" mientras salen los avisos.
 */
export function useResumenDelSistema(): TableroDelSistema {
  const { data, error, isLoading, isFetching, refetch } = useGetResumenDelSistemaQuery();

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    resumen: data,
    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
    // Se evalúa contra el reloj de AHORA en cada render y no una sola vez: el
    // dato solo tiene sentido comparado con la hora que tiene el teléfono
    // mientras alguien mira la pantalla.
    relojDesfasado: data ? relojCorrido(data.servidor.hora) : false,
  };
}
