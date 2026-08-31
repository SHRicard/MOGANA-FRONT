import { useCallback, useRef, useState } from 'react';
import type { EstadoFactura } from '@/features/facturas';
import { getApiErrorMessage, parseFechaPantalla } from '@/shared/utils';
import { useListarMisFacturasQuery } from '../api';
import { MIS_FACTURAS_LIMITE, type MiFacturaDeLaLista, type MisFacturasPagina } from '../types';

/** Todo lo que necesita `MisFacturasScreen` para dibujarse. */
export interface MisFacturas {
  facturas: readonly MiFacturaDeLaLista[];

  // ── Filtros ──
  /** `null` = todas. */
  estado: EstadoFactura | null;
  onEstadoChange: (estado: EstadoFactura | null) => void;
  /**
   * Rango por **fecha de emisión**, en formato de pantalla (`"01/08/2026"`) o
   * `null`. Los dos extremos entran: "qué me facturaron en julio".
   */
  desde: string | null;
  hasta: string | null;
  onDesdeChange: (fecha: string | null) => void;
  onHastaChange: (fecha: string | null) => void;
  limpiarFiltros: () => void;
  /** `true` si hay algún filtro puesto: es lo que puede dejar la lista vacía. */
  hayFiltros: boolean;

  // ── Paginación ──
  pagina: number;
  paginas: number;
  /** Cuántas entran **en el filtro**, no cuántas tiene. */
  total: number;
  irAPagina: (pagina: number) => void;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * Mis facturas (`docs/user_cliente_flujo.md` §5): la lista con filtros,
 * ordenada por número y la última primero.
 *
 * ⚠️ **Los filtros no tocan el resumen de la cuenta.** El encabezado del inicio
 * es siempre el de la cuenta entera; acá lo que cambia es cuántas facturas
 * entran en la lista.
 *
 * ⚠️ **Las fechas filtran por emisión, no por vencimiento**: "qué me facturaron
 * en julio" se pide con el rango, "qué está vencido" con el estado.
 *
 * @param estadoInicial con qué filtro abre. Lo usa el aviso de deuda vencida de
 *   la campanita, que lleva directo a lo que ya venció (§11).
 */
export function useMisFacturas(estadoInicial: EstadoFactura | null = null): MisFacturas {
  const [estado, setEstado] = useState<EstadoFactura | null>(estadoInicial);
  const [desde, setDesde] = useState<string | null>(null);
  const [hasta, setHasta] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  // Las fechas se eligen en el calendario (día/mes/año) y a la API viajan en
  // `AAAA-MM-DD`. Una a medio elegir no viaja: `parseFechaPantalla` da `null`.
  const desdeApi = desde ? parseFechaPantalla(desde) ?? undefined : undefined;
  const hastaApi = hasta ? parseFechaPantalla(hasta) ?? undefined : undefined;

  /**
   * Volver a la página 1 cuando cambia un filtro. Se ajusta **durante el
   * render** y no en un `useEffect`: con el efecto, este render todavía pediría
   * la página vieja y recién el siguiente pediría la 1 — son dos requests, y
   * una es basura.
   */
  const filtroPrevio = useRef({ estado, desdeApi, hastaApi });
  if (
    filtroPrevio.current.estado !== estado ||
    filtroPrevio.current.desdeApi !== desdeApi ||
    filtroPrevio.current.hastaApi !== hastaApi
  ) {
    filtroPrevio.current = { estado, desdeApi, hastaApi };
    setPagina(1);
  }

  const { data, error, isLoading, isFetching, refetch } = useListarMisFacturasQuery({
    estado: estado ?? undefined,
    desde: desdeApi,
    hasta: hastaApi,
    pagina,
    limite: MIS_FACTURAS_LIMITE,
  });

  /**
   * Cada combinación de filtros y página es una entrada de cache distinta, así
   * que `data` vuelve a ser `undefined` en cuanto se toca un filtro. Se guarda
   * la última respuesta para dejarla puesta mientras carga la nueva: sin esto la
   * lista parpadea en blanco en cada toque.
   */
  const ultima = useRef<MisFacturasPagina | null>(null);
  if (data) {
    ultima.current = data;
  }

  const pagina_ = error ? null : data ?? ultima.current;

  const irAPagina = useCallback((destino: number) => setPagina(destino), []);

  const limpiarFiltros = useCallback(() => {
    setEstado(null);
    setDesde(null);
    setHasta(null);
  }, []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    facturas: pagina_?.datos ?? [],

    estado,
    onEstadoChange: setEstado,
    desde,
    hasta,
    onDesdeChange: setDesde,
    onHastaChange: setHasta,
    limpiarFiltros,
    hayFiltros: estado !== null || desde !== null || hasta !== null,

    pagina,
    paginas: pagina_?.paginas ?? 0,
    total: pagina_?.total ?? 0,
    irAPagina,

    // Solo la primera carga: al filtrar o pasar de página queda la anterior.
    isLoading: isLoading && ultima.current === null,
    isFetching,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
