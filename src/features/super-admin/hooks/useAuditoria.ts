import { useCallback, useMemo, useRef, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useListarAuditoriaQuery } from '../api';
import { accionLabel, AUDITORIA_LIMITE, type RenglonDeAuditoria } from '../types';

/** Una opción del filtro por acción. `null` es "todas". */
export interface OpcionDeAccion {
  value: string | null;
  label: string;
}

/** Todo lo que necesita `AuditoriaScreen` para dibujarse. */
export interface HistorialDelSistema {
  renglones: readonly RenglonDeAuditoria[];
  total: number;
  pagina: number;
  paginas: number;
  irAPagina: (pagina: number) => void;

  // ── Filtros ──
  /**
   * Las acciones que ofrece el filtro, **armadas desde los datos que llegaron**
   * y no de una lista escrita a mano: hoy hay una sola (`cambio_de_rol`) y va a
   * haber más. Con una sola el filtro no se dibuja — no separa nada.
   */
  acciones: readonly OpcionDeAccion[];
  /** `null` = todas las acciones. */
  accion: string | null;
  onAccionChange: (accion: string | null) => void;
  /**
   * Si el historial está acotado a una cuenta. Viene de la ficha ("ver el
   * historial de esta cuenta") y no se puede sacar desde acá: para ver todo se
   * entra por el panel.
   */
  deUnaCuenta: boolean;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * El historial de los cambios de rol (`GET /api/super-admin/auditoria`).
 *
 * **Es de solo lectura y no por falta de tiempo**: no existe el endpoint para
 * escribir ni para borrar, y es la mitad del punto — un registro que la app
 * puede reescribir no prueba nada.
 *
 * @param objetivoId para abrirlo filtrado por una cuenta, que es de donde sale
 *   la mitad del valor de esta pantalla: la lista completa sin filtrar se mira
 *   una vez por mes.
 */
export function useAuditoria(objetivoId?: string): HistorialDelSistema {
  const [accion, setAccion] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  /**
   * Volver a la página 1 cuando cambia el filtro, **durante el render** y no en
   * un `useEffect`: con el efecto, este render todavía pediría la página vieja
   * del filtro nuevo y recién el siguiente pediría la 1. Son dos requests y una
   * es basura. Mismo criterio que el listado de cuentas.
   */
  const filtroPrevio = useRef(accion);
  if (filtroPrevio.current !== accion) {
    filtroPrevio.current = accion;
    setPagina(1);
  }

  const { data, error, isLoading, isFetching, refetch } = useListarAuditoriaQuery({
    accion: accion ?? undefined,
    objetivoId,
    pagina,
    limite: AUDITORIA_LIMITE,
  });

  /**
   * Cada combinación de params es una entrada de cache distinta, así que `data`
   * vuelve a `undefined` en cuanto se cambia de página. Se guarda la última que
   * llegó para dejarla puesta mientras carga la nueva; el spinner del encabezado
   * avisa que se está actualizando.
   */
  const ultimaPagina = useRef<{
    datos: readonly RenglonDeAuditoria[];
    total: number;
    paginas: number;
  }>({ datos: [], total: 0, paginas: 0 });
  if (data) {
    ultimaPagina.current = { datos: data.datos, total: data.total, paginas: data.paginas };
  }

  // Con error manda el cartel: una página vieja que ya no representa nada es
  // peor que no mostrar lista.
  const resultado = error ? { datos: [], total: 0, paginas: 0 } : ultimaPagina.current;

  /**
   * Las acciones que existen de verdad, sacadas de lo que llegó.
   *
   * ⚠️ Es lo que hay **en esta página**, no el catálogo completo del backend: no
   * existe un endpoint que lo liste. Mientras `cambio_de_rol` sea la única
   * acción da igual, y el día que haya más el filtro va a ofrecer las que se
   * estén viendo en vez de una lista hardcodeada que se desactualiza sola.
   */
  const acciones = useMemo<readonly OpcionDeAccion[]>(() => {
    const vistas = new Set(resultado.datos.map((renglon) => renglon.accion));
    // La elegida se agrega igual aunque su página haya venido vacía: si no, el
    // filtro puesto desaparecería de la lista y no habría cómo sacarlo.
    if (accion !== null) {
      vistas.add(accion);
    }
    if (vistas.size <= 1) {
      return [];
    }
    return [
      { value: null, label: 'Todas' },
      ...[...vistas].sort().map((value) => ({ value, label: accionLabel(value) })),
    ];
  }, [resultado.datos, accion]);

  const irAPagina = useCallback((destino: number) => setPagina(destino), []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    renglones: resultado.datos,
    total: resultado.total,
    pagina,
    paginas: resultado.paginas,
    irAPagina,

    acciones,
    accion,
    onAccionChange: setAccion,
    deUnaCuenta: objetivoId !== undefined,

    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
