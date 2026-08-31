import { useCallback, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/shared/utils';
import { useListarMisAvisosQuery } from '../api';
import {
  MIS_AVISOS_LIMITE,
  type EstadoDeAviso,
  type MiAvisoDePago,
  type MisAvisosPagina,
} from '../types';

/** Todo lo que necesita `MisAvisosScreen` para dibujarse. */
export interface MisAvisos {
  /** El último primero. */
  avisos: readonly MiAvisoDePago[];

  /** `null` = todos los estados. */
  estado: EstadoDeAviso | null;
  onEstadoChange: (estado: EstadoDeAviso | null) => void;
  hayFiltros: boolean;

  pagina: number;
  paginas: number;
  total: number;
  irAPagina: (pagina: number) => void;

  isLoading: boolean;
  isFetching: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * Mis avisos de pago (`docs/user_cliente_flujo.md` §9): la pantalla que contesta
 * *"avisé que pagué, ¿en qué quedó?"*.
 *
 * Es la única que puede explicar por qué alguien avisó que pagó y le sigue
 * figurando la deuda: los rechazados vienen con el motivo escrito, y los
 * confirmados con **lo que se anotó de verdad**, que puede no ser lo que se
 * informó.
 */
export function useMisAvisos(): MisAvisos {
  const [estado, setEstado] = useState<EstadoDeAviso | null>(null);
  const [pagina, setPagina] = useState(1);

  /**
   * Volver a la página 1 al cambiar el filtro, durante el render: con un
   * `useEffect` este render pediría la página vieja del filtro nuevo.
   */
  const estadoPrevio = useRef(estado);
  if (estadoPrevio.current !== estado) {
    estadoPrevio.current = estado;
    setPagina(1);
  }

  const { data, error, isLoading, isFetching, refetch } = useListarMisAvisosQuery({
    estado: estado ?? undefined,
    pagina,
    limite: MIS_AVISOS_LIMITE,
  });

  /** La última respuesta, para que la lista no parpadee en blanco al filtrar. */
  const ultima = useRef<MisAvisosPagina | null>(null);
  if (data) {
    ultima.current = data;
  }

  const listado = error ? null : data ?? ultima.current;

  const irAPagina = useCallback((destino: number) => setPagina(destino), []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    avisos: listado?.datos ?? [],

    estado,
    onEstadoChange: setEstado,
    hayFiltros: estado !== null,

    pagina,
    paginas: listado?.paginas ?? 0,
    total: listado?.total ?? 0,
    irAPagina,

    isLoading: isLoading && ultima.current === null,
    isFetching,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
