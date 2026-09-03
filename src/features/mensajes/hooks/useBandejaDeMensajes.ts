import { useCallback, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useDebouncedValue } from '@/shared/hooks';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useListarConversacionesQuery } from '../api';
import {
  BUSQUEDA_DEBOUNCE_MS,
  CONVERSACIONES_LIMITE,
  REFRESCO_MS,
  type Conversacion,
  type ListarConversacionesParams,
} from '../types';

export interface BandejaDeMensajes {
  // ── Filtros ──
  busqueda: string;
  onBusquedaChange: (busqueda: string) => void;
  soloSinLeer: boolean;
  onSoloSinLeerChange: (soloSinLeer: boolean) => void;

  // ── Resultados ──
  conversaciones: readonly Conversacion[];
  total: number;
  /** Todos los mensajes de clientes sin leer, **no los de esta página ni los del filtro**. */
  sinLeerEnTotal: number;
  pagina: number;
  paginas: number;
  irAPagina: (pagina: number) => void;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  /** `403`: la sesión no es de administración. No es una falla de red. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * **La bandeja de mensajes del panel** (`/admin/mensajes`).
 *
 * Un renglón por cliente que escribió alguna vez, el más reciente arriba.
 *
 * ⚠️ **Es compartida**: leer un hilo lo deja leído para todos los
 * administradores. Por eso cada renglón trae `leidoPor` — no para saber quién
 * mandó, sino para que dos personas no contesten lo mismo.
 *
 * Se refresca sola cada ocho segundos mientras la pantalla está en foco, igual
 * que el hilo del cliente y por el mismo motivo: es lo que hay en vez de un
 * websocket.
 */
export function useBandejaDeMensajes(): BandejaDeMensajes {
  const enfocada = useIsFocused();

  const [busqueda, setBusqueda] = useState('');
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const [pagina, setPagina] = useState(1);

  /**
   * La búsqueda espera a que se deje de tipear. Sin esto, "Rodríguez" son diez
   * requests y nueve respuestas que ya no importan.
   */
  const busquedaDiferida = useDebouncedValue(busqueda.trim(), BUSQUEDA_DEBOUNCE_MS);

  /**
   * Volver a la página 1 al cambiar cualquier filtro, ajustado **durante el
   * render** y no en un `useEffect`: con el efecto, este render todavía pediría
   * la página vieja del filtro nuevo y recién el siguiente pediría la 1. Son dos
   * requests y una es basura.
   */
  const filtroPrevio = useRef({ q: busquedaDiferida, soloSinLeer });
  if (
    filtroPrevio.current.q !== busquedaDiferida ||
    filtroPrevio.current.soloSinLeer !== soloSinLeer
  ) {
    filtroPrevio.current = { q: busquedaDiferida, soloSinLeer };
    setPagina(1);
  }

  const params: ListarConversacionesParams = useMemo(
    () => ({
      q: busquedaDiferida || undefined,
      soloSinLeer,
      pagina,
      limite: CONVERSACIONES_LIMITE,
    }),
    [busquedaDiferida, soloSinLeer, pagina],
  );

  const { data, error, isLoading, isFetching, refetch } = useListarConversacionesQuery(params, {
    pollingInterval: enfocada ? REFRESCO_MS : 0,
  });

  /**
   * La última respuesta, para no dejar la lista en blanco mientras carga la
   * siguiente: cada combinación de filtros es una entrada de cache distinta, así
   * que `data` vuelve a ser `undefined` en cada cambio de página.
   */
  const ultima = useRef<{
    datos: readonly Conversacion[];
    total: number;
    sinLeerEnTotal: number;
    paginas: number;
  } | null>(null);

  if (data) {
    ultima.current = {
      datos: data.datos,
      total: data.total,
      sinLeerEnTotal: data.sinLeerEnTotal,
      paginas: data.paginas,
    };
  }

  const sinPermiso = getApiErrorStatus(error) === 403;

  // Con error manda el cartel: una lista vieja que ya no representa nada es peor
  // que no mostrar lista.
  const vacio = { datos: [], total: 0, sinLeerEnTotal: 0, paginas: 0 };
  const resultado = error ? vacio : ultima.current ?? vacio;

  const irAPagina = useCallback((destino: number) => setPagina(destino), []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    busqueda,
    onBusquedaChange: setBusqueda,
    soloSinLeer,
    onSoloSinLeerChange: setSoloSinLeer,

    conversaciones: resultado.datos,
    total: resultado.total,
    sinLeerEnTotal: resultado.sinLeerEnTotal,
    pagina,
    paginas: resultado.paginas,
    irAPagina,

    isLoading: isLoading && ultima.current === null,
    isFetching,
    sinPermiso,
    mensajeError: sinPermiso ? null : getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
