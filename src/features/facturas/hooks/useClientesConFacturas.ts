import { useCallback, useRef, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useListarClientesConFacturasQuery } from '../api';
import {
  CLIENTES_FACTURADOS_LIMITE,
  TABLERO_DEBOUNCE_MS,
  type ClienteFacturado,
  type EstadoCuenta,
  type TotalesTablero,
} from '../types';

/**
 * Todo lo que necesita el tablero para dibujarse. La pantalla no calcula nada:
 * pinta esto.
 */
export interface TableroFacturas {
  // ── Filtros ──
  /** Lo que se ve en el input, sin atrasar (la API se llama con debounce). */
  texto: string;
  onTextoChange: (texto: string) => void;
  /**
   * El texto con el que se buscó de verdad (ya con debounce). Es el que nombra
   * el estado vacío: decir "no hay resultados para X" con lo que todavía se está
   * tipeando muestra un texto que nunca se buscó.
   */
  busqueda: string;
  /** `null` = todos los estados. Son los de **la cuenta**: `al_dia`, no `pagada`. */
  estado: EstadoCuenta | null;
  onEstadoChange: (estado: EstadoCuenta | null) => void;
  /** Vacía solo el buscador. Es la "✕" del campo. */
  limpiarBusqueda: () => void;
  /** Borra el texto y el estado: es el "volver al tablero completo". */
  limpiarFiltros: () => void;
  /** `true` si hay un texto buscado. Cambia qué dice el estado vacío. */
  hayBusqueda: boolean;
  /** `true` si hay texto o estado elegido. Es lo que puede dejar la tabla vacía. */
  hayFiltros: boolean;

  // ── Resultados ──
  /**
   * Un renglón por cliente —su cuenta entera—, ordenados por urgencia: primero
   * el que hace más que se pasó, y los que están al día al final.
   */
  clientes: readonly ClienteFacturado[];
  /** Cuántos CLIENTES hay (no cuánta plata: eso está en `totales`). */
  total: number;
  /**
   * Lo que hay que cobrar en el filtro **entero**, no en la página. Es el
   * encabezado "por cobrar / vencido / por vencer", y viene calculado: no se
   * suman los renglones de la página, que serían solo ocho.
   */
  totales: TotalesTablero;
  pagina: number;
  paginas: number;
  /** A qué página ir. Los bordes los cuida la paginación, que sabe cuántas hay. */
  irAPagina: (pagina: number) => void;

  // ── Estados ──
  /** Primera carga, sin nada que mostrar todavía. */
  isLoading: boolean;
  /** Hay una request en vuelo (incluye buscar o cambiar de página). */
  isFetching: boolean;
  /** `403`: el rol de quien mira no alcanza. Se esconde el apartado. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /**
   * Vuelve a pedirle los datos a la API, igual que `reintentar`, pero
   * **devolviendo la promesa**: es lo que usa el "tirar para abajo" para dejar
   * la rueda girando hasta que la respuesta llega.
   */
  refrescar: () => Promise<void>;
}

/** Los totales en cero, para antes de la primera respuesta y para el error. */
const SIN_TOTALES: TotalesTablero = { deuda: 0, vencido: 0, porVencer: 0 };

/**
 * El tablero de facturación (`docs/flujo_pagos.md` §3): buscador con debounce,
 * filtro por estado de cuenta y paginación.
 *
 * **Un renglón es un cliente con su cuenta entera**, no una factura: cuánto debe
 * en total, cuántas le faltan pagar y desde cuándo se pasó la más vieja. El
 * estado del cliente sale de **lo peor que tenga sin pagar**, así que uno que
 * arrastra una vencida de marzo no desaparece del filtro porque ayer se le
 * facturó el mes nuevo.
 */
export function useClientesConFacturas(): TableroFacturas {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const [pagina, setPagina] = useState(1);

  // Lo que realmente viaja a la API. Se busca sin espacios de los costados: un
  // teclado móvil los agrega solo y cambiarían el resultado sin que se vean.
  const q = useDebouncedValue(texto.trim(), TABLERO_DEBOUNCE_MS);

  /**
   * Volver a la página 1 cuando cambia un filtro.
   *
   * Se ajusta **durante el render** y no en un `useEffect` a propósito: con el
   * efecto, este render todavía pediría la página vieja (filtrar por vencidas
   * estando en la 3 saldría a buscar "página 3 de las vencidas") y recién el
   * siguiente pediría la 1. Son dos requests, y una es basura.
   */
  const filtroPrevio = useRef({ q, estado });
  if (filtroPrevio.current.q !== q || filtroPrevio.current.estado !== estado) {
    filtroPrevio.current = { q, estado };
    setPagina(1);
  }

  const { data, error, isLoading, isFetching, refetch } = useListarClientesConFacturasQuery({
    q,
    estado: estado ?? undefined,
    pagina,
    limite: CLIENTES_FACTURADOS_LIMITE,
  });

  /**
   * Cada combinación de filtros es una entrada de cache distinta, así que `data`
   * vuelve a ser `undefined` en cuanto cambia una letra del buscador. Se guarda
   * la última página que llegó para dejarla puesta mientras carga la nueva: sin
   * esto, la tabla desaparece y vuelve en cada tecla (el spinner del encabezado
   * avisa que se está actualizando).
   */
  const ultimaPagina = useRef<{
    datos: readonly ClienteFacturado[];
    total: number;
    paginas: number;
    totales: TotalesTablero;
  }>({ datos: [], total: 0, paginas: 0, totales: SIN_TOTALES });
  if (data) {
    ultimaPagina.current = {
      datos: data.datos,
      total: data.total,
      paginas: data.paginas,
      totales: data.totales,
    };
  }

  // Con error manda el cartel: una tabla vieja que ya no representa nada es peor
  // que no mostrar tabla.
  const resultado = error
    ? { datos: [], total: 0, paginas: 0, totales: SIN_TOTALES }
    : ultimaPagina.current;

  const irAPagina = useCallback((destino: number) => setPagina(destino), []);

  const limpiarBusqueda = useCallback(() => setTexto(''), []);

  const limpiarFiltros = useCallback(() => {
    setTexto('');
    setEstado(null);
  }, []);

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

  return {
    texto,
    onTextoChange: setTexto,
    busqueda: q,
    estado,
    onEstadoChange: setEstado,
    limpiarBusqueda,
    limpiarFiltros,
    hayBusqueda: q.length > 0,
    hayFiltros: q.length > 0 || estado !== null,

    clientes: resultado.datos,
    total: resultado.total,
    totales: resultado.totales,
    pagina,
    paginas: resultado.paginas,
    irAPagina,

    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
