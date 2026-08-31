import { useCallback, useRef, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useListarMetricasClientesQuery } from '../api';
import {
  BUSQUEDA_DEBOUNCE_MS,
  METRICAS_CLIENTES_LIMITE,
  ORDEN_POR_DEFECTO,
  type MetricaCliente,
  type OrdenMetricaCliente,
} from '../types';

/** Todo lo que necesita `MetricasClientesScreen`. La pantalla no calcula nada. */
export interface MetricasDeClientes {
  // ── Filtros ──
  /** Lo que se ve en el input, sin atrasar (la API se llama con debounce). */
  texto: string;
  onTextoChange: (texto: string) => void;
  /**
   * El texto con el que se buscó de verdad. Es el que nombra el estado vacío:
   * decir "no hay resultados para X" con lo que todavía se está tipeando muestra
   * un texto que nunca se buscó.
   */
  busqueda: string;
  limpiarBusqueda: () => void;
  hayBusqueda: boolean;
  /** Qué aparece primero. **Es lo que vuelve útil a esta pantalla.** */
  orden: OrdenMetricaCliente;
  onOrdenChange: (orden: OrdenMetricaCliente) => void;

  // ── Resultados ──
  clientes: readonly MetricaCliente[];
  pagina: number;
  paginas: number;
  /** Cuántos clientes entran en la búsqueda. */
  total: number;
  irAPagina: (pagina: number) => void;

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
 * Las métricas cliente por cliente (`docs/flujo_metricas.md` §4): **"¿qué clase
 * de cliente es?"**.
 *
 * ⚠️ **No reemplaza al tablero de facturación**, que contesta otra cosa: a quién
 * llamar **hoy**. Un cliente puede deber cero y ser malísimo —compró una vez
 * hace un año— y otro puede deber plata y ser el mejor que tenés.
 *
 * El orden es el corazón de la pantalla: el mismo listado ordenado por
 * `inactividad` es la lista de a quiénes llamar para recuperar, y por
 * `cumplimiento` es la de a quiénes cortarles el fiado.
 */
export function useMetricasClientes(): MetricasDeClientes {
  const [texto, setTexto] = useState('');
  const [orden, setOrden] = useState<OrdenMetricaCliente>(ORDEN_POR_DEFECTO);
  const [pagina, setPagina] = useState(1);

  // Sin debounce saldría una request por tecla, y el orden lo hace la base:
  // cada una es una consulta con su corte.
  const busqueda = useDebouncedValue(texto.trim(), BUSQUEDA_DEBOUNCE_MS);

  /**
   * Volver a la página 1 cuando cambia un filtro.
   *
   * Se ajusta **durante el render** y no en un `useEffect`: con el efecto, este
   * render todavía pediría la página vieja —"página 3 de los que peor pagan"— y
   * recién el siguiente pediría la 1. Son dos requests, y una es basura.
   */
  const filtroPrevio = useRef({ busqueda, orden });
  if (filtroPrevio.current.busqueda !== busqueda || filtroPrevio.current.orden !== orden) {
    filtroPrevio.current = { busqueda, orden };
    setPagina(1);
  }

  const { data, error, isLoading, isFetching, refetch } = useListarMetricasClientesQuery({
    q: busqueda,
    orden,
    pagina,
    limite: METRICAS_CLIENTES_LIMITE,
  });

  const irAPagina = useCallback((destino: number) => setPagina(destino), []);
  const limpiarBusqueda = useCallback(() => setTexto(''), []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    texto,
    onTextoChange: setTexto,
    busqueda,
    limpiarBusqueda,
    hayBusqueda: busqueda.length > 0,
    orden,
    onOrdenChange: setOrden,

    clientes: data?.datos ?? [],
    pagina,
    paginas: data?.paginas ?? 0,
    total: data?.total ?? 0,
    irAPagina,

    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
