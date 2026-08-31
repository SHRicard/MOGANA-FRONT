import { useCallback } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useListarEspeciesQuery } from '../api';
import type { Especie } from '../types';

/** El catálogo crudo, sin filtrar. Es la base de las dos pantallas que lo usan. */
export interface Catalogo {
  /** Alfabético, tal como viene. Vacío mientras carga o si falló. */
  especies: readonly Especie[];
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
 * El catálogo de especies entero (`docs/flujo_especies.md` §3).
 *
 * **Una sola request y el catálogo completo**: son decenas de especies, así que
 * viene sin paginar y el filtrado se hace en memoria. Lo usan las dos pantallas
 * que necesitan la lista —el catálogo y el selector de la factura— y comparten
 * la misma entrada de cache, así que abrir el formulario con varios renglones no
 * multiplica el pedido.
 *
 * Se vuelve a pedir al entrar (`refetchOnMountOrArgChange`) porque una factura
 * pudo haber creado especies nuevas desde la última vez: el renglón siguiente
 * tiene que poder elegirlas del selector.
 */
export function useEspecies(): Catalogo {
  const { data, error, isLoading, isFetching, refetch } = useListarEspeciesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    especies: data?.datos ?? [],
    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
