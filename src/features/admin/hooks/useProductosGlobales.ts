import { useCallback, useRef, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus, moverMesApi } from '@/shared/utils';
import { useGetProductosGlobalesQuery } from '../api';
import {
  OrdenesDeProducto,
  type Concentracion,
  type EspecieGlobal,
  type OrdenDeProducto,
  type ProductosGlobales,
  type TotalesGlobales,
} from '../mercaderia';

/** Todo lo que necesita `ProductosScreen`. La pantalla no calcula nada. */
export interface ProductosDelNegocio {
  /**
   * El período que se está mirando, **ya resuelto**: sin filtro son los que
   * devolvió la API —el mes de la primera venta y hoy—, no un `null`.
   */
  desde: string | undefined;
  hasta: string | undefined;
  meses: number | undefined;
  /** `true` si se acotó el período a mano: habilita el "todo el período". */
  hayFiltro: boolean;
  correrDesde: (cantidad: number) => void;
  correrHasta: (cantidad: number) => void;
  verTodo: () => void;

  orden: OrdenDeProducto;
  onOrdenChange: (orden: OrdenDeProducto) => void;

  /** ⚠️ **El catálogo completo**, incluso lo que no se vendió nunca. */
  especies: readonly EspecieGlobal[];
  totales: TotalesGlobales | undefined;
  concentracion: Concentracion | undefined;

  isLoading: boolean;
  isFetching: boolean;
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * La métrica global de productos (`docs/flujo_metricas.md` §6): de todo lo que
 * se vende, **qué manda y qué no se vende**.
 *
 * Las otras dos pantallas de mercadería están ancladas al calendario, así que
 * una especie que vende mucho **pero cada tres meses** se ve chica en las dos.
 * Acá se ve entera.
 *
 * El período arranca **sin filtro** —todo el historial— y se acota corriendo los
 * extremos. Acotarlo es el uso más interesante: pedir el verano y pedir el año
 * dan dos rankings distintos, y ese cambio de puesto **es** el dato.
 */
export function useProductosGlobales(): ProductosDelNegocio {
  const [desde, setDesde] = useState<string | null>(null);
  const [hasta, setHasta] = useState<string | null>(null);
  const [orden, setOrden] = useState<OrdenDeProducto>(OrdenesDeProducto.MONTO);

  const { data, error, isLoading, isFetching, refetch } = useGetProductosGlobalesQuery(
    { desde: desde ?? undefined, hasta: hasta ?? undefined, orden },
    { refetchOnMountOrArgChange: true },
  );

  // Se conserva la última respuesta para que la lista no parpadee al mover un
  // extremo del período o cambiar el orden.
  const ultima = useRef<ProductosGlobales | null>(null);
  if (data) {
    ultima.current = data;
  }

  const productos = error ? null : data ?? ultima.current;

  /**
   * Los extremos se corren **desde lo que se está mostrando**, que sin filtro es
   * el período efectivo que devolvió la API. Así el primer toque acota el rango
   * real en vez de saltar a un mes cualquiera.
   */
  const correrDesde = useCallback(
    (cantidad: number) => {
      const base = desde ?? productos?.desde;
      if (base) {
        setDesde(moverMesApi(base, cantidad));
      }
    },
    [desde, productos?.desde],
  );

  const correrHasta = useCallback(
    (cantidad: number) => {
      const base = hasta ?? productos?.hasta;
      if (base) {
        setHasta(moverMesApi(base, cantidad));
      }
    },
    [hasta, productos?.hasta],
  );

  const verTodo = useCallback(() => {
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
    desde: productos?.desde,
    hasta: productos?.hasta,
    meses: productos?.meses,
    hayFiltro: desde !== null || hasta !== null,
    correrDesde,
    correrHasta,
    verTodo,

    orden,
    onOrdenChange: setOrden,

    especies: productos?.especies ?? [],
    totales: productos?.totales,
    concentracion: productos?.concentracion,

    isLoading: isLoading && ultima.current === null,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
