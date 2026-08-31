import { useCallback, useRef, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus, parseFechaPantalla } from '@/shared/utils';
import { useGetCuentaClienteQuery } from '../api';
import {
  FACTURAS_CUENTA_LIMITE,
  type CuentaCliente,
  type CuentaClienteDatos,
  type EstadoFactura,
  type FacturaDeCuenta,
  type ResumenCuenta,
} from '../types';

/** Todo lo que necesita `CuentaClienteScreen` para dibujarse. */
export interface CuentaDelCliente {
  /** `undefined` mientras carga o si falló. */
  cliente: CuentaClienteDatos | undefined;
  /**
   * El estado de plata de la cuenta **entera**: no lo tocan ni la paginación ni
   * los filtros. Mirar solo las pagadas no cambia cuánto debe el cliente.
   */
  resumen: ResumenCuenta | undefined;
  /** Las facturas de la página, la última primero. Renglones livianos. */
  facturas: readonly FacturaDeCuenta[];

  // ── Filtros ──
  /**
   * `null` = todos. Son los estados de **la factura** (`pagada` incluido), no
   * los de la cuenta.
   */
  estado: EstadoFactura | null;
  onEstadoChange: (estado: EstadoFactura | null) => void;
  /**
   * Rango por **fecha de emisión**, en formato de pantalla (`"01/08/2026"`) o
   * `null`. Los dos extremos entran: "lo que le facturé en julio".
   */
  desde: string | null;
  hasta: string | null;
  onDesdeChange: (fecha: string | null) => void;
  onHastaChange: (fecha: string | null) => void;
  /** Borra estado y fechas: es el "ver todas". */
  limpiarFiltros: () => void;
  /** `true` si hay algún filtro puesto. Es lo que puede dejar la lista vacía. */
  hayFiltros: boolean;

  // ── Paginación (de las FACTURAS) ──
  pagina: number;
  paginas: number;
  /** Cuántas facturas entran en el filtro. */
  total: number;
  irAPagina: (pagina: number) => void;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  /** `404`: ese id no es de un cliente (también si es de un administrador). */
  noEncontrado: boolean;
  /** `403`: el rol de quien mira no alcanza. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** Con la promesa, para el "tirar para abajo". */
  refrescar: () => Promise<void>;
}

/**
 * La cuenta de un cliente (`docs/flujo_pagos.md` §4): **la pantalla que contesta
 * "¿tiene algo atrás?"**.
 *
 * Trae el resumen de la deuda y la lista de facturas, con filtros por estado y
 * por fecha de emisión, y paginada — un cliente puede tener mil. Los renglones
 * son livianos: el detalle de una factura se pide recién al tocarla.
 *
 * **Filtrar no cambia el resumen**, y es a propósito: la deuda de arriba es la
 * de toda la cuenta. Lo que sí cambia es `total` y la cantidad de páginas.
 */
export function useCuentaCliente(clienteId: string): CuentaDelCliente {
  const [estado, setEstado] = useState<EstadoFactura | null>(null);
  const [desde, setDesde] = useState<string | null>(null);
  const [hasta, setHasta] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  // Las fechas se eligen en el calendario (día/mes/año) y a la API viajan en
  // `AAAA-MM-DD`. Una a medio elegir no viaja: `parseFechaPantalla` da `null`.
  const desdeApi = desde ? parseFechaPantalla(desde) ?? undefined : undefined;
  const hastaApi = hasta ? parseFechaPantalla(hasta) ?? undefined : undefined;

  /**
   * Volver a la página 1 cuando cambia un filtro.
   *
   * Se ajusta **durante el render** y no en un `useEffect`: con el efecto, este
   * render todavía pediría la página vieja —"página 3 de las pagadas"— y recién
   * el siguiente pediría la 1. Son dos requests, y una es basura.
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

  const { data, error, isLoading, isFetching, refetch } = useGetCuentaClienteQuery({
    clienteId,
    estado: estado ?? undefined,
    desde: desdeApi,
    hasta: hastaApi,
    pagina,
    limite: FACTURAS_CUENTA_LIMITE,
  });

  /**
   * Cada combinación de filtros y página es una entrada de cache distinta, así
   * que `data` vuelve a ser `undefined` en cuanto se toca un filtro. Se guarda
   * la última respuesta para dejarla puesta mientras carga la nueva: sin esto,
   * la pantalla entera —resumen incluido— se borra y se vuelve a dibujar (el
   * indicador del encabezado avisa que se está actualizando).
   */
  const ultima = useRef<CuentaCliente | null>(null);
  if (data) {
    ultima.current = data;
  }

  // Con error manda el cartel: una cuenta vieja que ya no representa nada es
  // peor que no mostrar cuenta.
  const cuenta = error ? null : data ?? ultima.current;

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

  const status = getApiErrorStatus(error);

  return {
    cliente: cuenta?.cliente,
    resumen: cuenta?.resumen,
    facturas: cuenta?.facturas ?? [],

    estado,
    onEstadoChange: setEstado,
    desde,
    hasta,
    onDesdeChange: setDesde,
    onHastaChange: setHasta,
    limpiarFiltros,
    hayFiltros: estado !== null || desde !== null || hasta !== null,

    pagina,
    paginas: cuenta?.paginas ?? 0,
    total: cuenta?.total ?? 0,
    irAPagina,

    // Solo la primera carga: al filtrar o pasar de página queda la anterior.
    isLoading: isLoading && ultima.current === null,
    isFetching,
    noEncontrado: status === 404,
    sinPermiso: status === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
