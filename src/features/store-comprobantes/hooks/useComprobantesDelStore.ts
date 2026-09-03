import { useCallback, useMemo, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import {
  useBorrarComprobanteMutation,
  useBorrarSeleccionMutation,
  useListarComprobantesDelStoreQuery,
} from '../api';
import {
  COMPROBANTES_DEL_STORE_LIMITE,
  MAX_SELECCION,
  sePuedeBorrar,
  type ComprobanteEnElStore,
  type EstadoDeAviso,
  type ListarComprobantesParams,
  type TramoDeAntiguedad,
} from '../types';

export interface ListadoDelStore {
  // ── Filtros ──
  antiguedad: TramoDeAntiguedad | null;
  onAntiguedadChange: (antiguedad: TramoDeAntiguedad | null) => void;
  estado: EstadoDeAviso | null;
  onEstadoChange: (estado: EstadoDeAviso | null) => void;
  /** Ver también los que ya se soltaron. Por defecto solo lo que ocupa lugar. */
  incluirBorrados: boolean;
  onIncluirBorradosChange: (incluir: boolean) => void;
  hayFiltros: boolean;
  limpiarFiltros: () => void;

  // ── Resultados ──
  comprobantes: readonly ComprobanteEnElStore[];
  total: number;
  /** Los bytes **del filtro entero**, no de la página: es con lo que se decide. */
  bytes: number;
  pagina: number;
  paginas: number;
  irAPagina: (pagina: number) => void;

  // ── Selección múltiple ──
  /**
   * Los tildados, por id. Son los **objetos** y no solo los ids: así se puede
   * decir cuántos bytes se van a liberar sin volver a pedir nada, aunque estén
   * repartidos en varias páginas.
   */
  seleccion: ReadonlyMap<string, ComprobanteEnElStore>;
  alternarUno: (comprobante: ComprobanteEnElStore) => void;
  /** Tilda o destilda **los de esta página** que se puedan borrar. */
  alternarPagina: () => void;
  /** `true`, `false` o `'indeterminado'`: el estado de la casilla de "todos". */
  paginaTildada: boolean | 'indeterminado';
  limpiarSeleccion: () => void;
  /** Cuántos bytes se liberarían con lo tildado. */
  bytesSeleccionados: number;
  /** `true` si ya se llegó al tope de 100 que acepta el backend. */
  seleccionLlena: boolean;
  /** Confirmar el borrado de lo tildado. Abre el diálogo. */
  pedirBorrarSeleccion: () => void;
  /** `true` mientras el diálogo de la selección está abierto. */
  confirmandoSeleccion: boolean;
  confirmarBorradoSeleccion: () => void;
  cancelarBorradoSeleccion: () => void;
  borrandoSeleccion: boolean;
  mensajeErrorSeleccion: string | null;

  // ── Borrar de a uno ──
  /** Cuál se está por borrar, o `null`. Abre la confirmación. */
  aBorrar: ComprobanteEnElStore | null;
  pedirBorrar: (comprobante: ComprobanteEnElStore) => void;
  confirmarBorrado: () => void;
  cancelarBorrado: () => void;
  borrando: boolean;
  mensajeErrorBorrado: string | null;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * El listado del store (`MORGANA-BACK/docs/flujo_comprobantes.md` §5.2 y §5.5).
 *
 * **El más viejo primero**, y lo pone la API: es una pantalla para tirar cosas,
 * y lo primero que se mira es lo primero que se va.
 *
 * ⚠️ **Borrar de a uno no pide confirmación en el backend**, a diferencia del
 * masivo: las guardas de aquel existen porque ahí no se ve lo que se borra. Acá
 * sí se ve, así que la confirmación es de la pantalla —un diálogo— y no del
 * protocolo.
 *
 * ⚠️ Los de un aviso **pendiente** no se pueden borrar, ni desde acá: su imagen
 * es la única evidencia con la que todavía hay que decidir. El backend contesta
 * `400`, y la lista ni ofrece el botón.
 */
export function useComprobantesDelStore(): ListadoDelStore {
  const [antiguedad, setAntiguedad] = useState<TramoDeAntiguedad | null>(null);
  const [estado, setEstado] = useState<EstadoDeAviso | null>(null);
  const [incluirBorrados, setIncluirBorrados] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [aBorrar, setABorrar] = useState<ComprobanteEnElStore | null>(null);
  /**
   * Lo tildado, **por id y con el objeto entero**.
   *
   * Con el objeto y no solo el id porque hace falta el `bytes` para poder decir
   * cuánto se libera, y la selección sobrevive al cambio de página: los de la
   * página 2 ya no están en `data` cuando se vuelve a la 1.
   */
  const [seleccion, setSeleccion] = useState<ReadonlyMap<string, ComprobanteEnElStore>>(
    () => new Map(),
  );
  const [confirmandoSeleccion, setConfirmandoSeleccion] = useState(false);

  /** Los params son la clave de cache: un objeto nuevo por render sería una request nueva. */
  const params = useMemo<ListarComprobantesParams>(
    () => ({
      antiguedad: antiguedad ?? undefined,
      estado: estado ?? undefined,
      incluirBorrados: incluirBorrados || undefined,
      pagina,
      limite: COMPROBANTES_DEL_STORE_LIMITE,
    }),
    [antiguedad, estado, incluirBorrados, pagina],
  );

  const { data, isLoading, isFetching, error, refetch } =
    useListarComprobantesDelStoreQuery(params);

  const [borrarUno, estadoBorrado] = useBorrarComprobanteMutation();
  const [borrarSeleccion, estadoSeleccion] = useBorrarSeleccionMutation();

  /** Los de esta página que se pueden tildar: los pendientes nunca entran. */
  const tildables = useMemo(() => (data?.datos ?? []).filter(sePuedeBorrar), [data]);

  const alternarUno = useCallback((comprobante: ComprobanteEnElStore) => {
    setSeleccion((actual) => {
      const siguiente = new Map(actual);

      if (siguiente.delete(comprobante.avisoId)) {
        return siguiente;
      }
      // El tope es del backend: pasarse es un `400`, así que no se deja llegar.
      if (siguiente.size >= MAX_SELECCION) {
        return actual;
      }
      siguiente.set(comprobante.avisoId, comprobante);
      return siguiente;
    });
  }, []);

  /**
   * La casilla de "todos" trabaja sobre **esta página**, no sobre el filtro
   * entero: tildar 143 cosas que no se ven con un toque es justo lo que la
   * limpieza por criterio ya hace, con su vista previa y sus guardas.
   */
  const alternarPagina = useCallback(() => {
    setSeleccion((actual) => {
      const siguiente = new Map(actual);
      const todosTildados =
        tildables.length > 0 && tildables.every((uno) => siguiente.has(uno.avisoId));

      if (todosTildados) {
        for (const uno of tildables) {
          siguiente.delete(uno.avisoId);
        }
        return siguiente;
      }

      for (const uno of tildables) {
        if (siguiente.size >= MAX_SELECCION) {
          break;
        }
        siguiente.set(uno.avisoId, uno);
      }
      return siguiente;
    });
  }, [tildables]);

  /**
   * Tres estados y no dos: sin el `'indeterminado'`, una página con la mitad
   * tildada se ve igual que una sin nada.
   */
  const paginaTildada: boolean | 'indeterminado' = useMemo(() => {
    if (tildables.length === 0) {
      return false;
    }
    const cuantos = tildables.filter((uno) => seleccion.has(uno.avisoId)).length;
    if (cuantos === 0) {
      return false;
    }
    return cuantos === tildables.length ? true : 'indeterminado';
  }, [tildables, seleccion]);

  const limpiarSeleccion = useCallback(() => {
    setSeleccion(new Map());
    setConfirmandoSeleccion(false);
    estadoSeleccion.reset();
  }, [estadoSeleccion]);

  const bytesSeleccionados = useMemo(() => {
    let total = 0;
    for (const uno of seleccion.values()) {
      total += uno.bytes;
    }
    return total;
  }, [seleccion]);

  const pedirBorrarSeleccion = useCallback(() => {
    estadoSeleccion.reset();
    setConfirmandoSeleccion(true);
  }, [estadoSeleccion]);

  const cancelarBorradoSeleccion = useCallback(() => {
    setConfirmandoSeleccion(false);
    estadoSeleccion.reset();
  }, [estadoSeleccion]);

  const confirmarBorradoSeleccion = useCallback(() => {
    if (seleccion.size === 0) {
      return;
    }
    borrarSeleccion({ avisoIds: [...seleccion.keys()] })
      .unwrap()
      .then(() => {
        // Se vacía recién con el 200: si falló —un pendiente colado, por
        // ejemplo— lo tildado tiene que seguir ahí para poder corregirlo.
        setSeleccion(new Map());
        setConfirmandoSeleccion(false);
      })
      .catch(() => {});
  }, [borrarSeleccion, seleccion]);

  /**
   * Cambiar un filtro vuelve a la página 1: sin esto, estar en la 3 y filtrar
   * pide una página que puede no existir, y la lista queda vacía como si no
   * hubiera nada.
   */
  const onAntiguedadChange = useCallback((siguiente: TramoDeAntiguedad | null) => {
    setAntiguedad(siguiente);
    setPagina(1);
  }, []);

  const onEstadoChange = useCallback((siguiente: EstadoDeAviso | null) => {
    setEstado(siguiente);
    setPagina(1);
  }, []);

  const onIncluirBorradosChange = useCallback((incluir: boolean) => {
    setIncluirBorrados(incluir);
    setPagina(1);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setAntiguedad(null);
    setEstado(null);
    setIncluirBorrados(false);
    setPagina(1);
  }, []);

  /*
    ⚠️ Cambiar de filtro o de página **no borra lo tildado**, y es a propósito:
    el caso real es barrer varias páginas marcando lo que no sirve. Lo que hace
    que eso no sea peligroso es que la barra de abajo dice siempre cuántos hay
    tildados, así que nunca se borra algo que se eligió y se olvidó.
  */

  const pedirBorrar = useCallback(
    (comprobante: ComprobanteEnElStore) => {
      estadoBorrado.reset();
      setABorrar(comprobante);
    },
    [estadoBorrado],
  );

  const cancelarBorrado = useCallback(() => {
    setABorrar(null);
    estadoBorrado.reset();
  }, [estadoBorrado]);

  const confirmarBorrado = useCallback(() => {
    if (!aBorrar) {
      return;
    }
    borrarUno(aBorrar.avisoId)
      .unwrap()
      // Se cierra solo si salió: con el error, el diálogo queda abierto con el
      // cartel en vez de desaparecer como si hubiera andado.
      .then(() => setABorrar(null))
      .catch(() => {});
  }, [borrarUno, aBorrar]);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    antiguedad,
    onAntiguedadChange,
    estado,
    onEstadoChange,
    incluirBorrados,
    onIncluirBorradosChange,
    hayFiltros: antiguedad !== null || estado !== null || incluirBorrados,
    limpiarFiltros,

    comprobantes: data?.datos ?? [],
    total: data?.total ?? 0,
    bytes: data?.bytes ?? 0,
    pagina: data?.pagina ?? pagina,
    paginas: data?.paginas ?? 1,
    irAPagina: setPagina,

    seleccion,
    alternarUno,
    alternarPagina,
    paginaTildada,
    limpiarSeleccion,
    bytesSeleccionados,
    seleccionLlena: seleccion.size >= MAX_SELECCION,
    pedirBorrarSeleccion,
    confirmandoSeleccion,
    confirmarBorradoSeleccion,
    cancelarBorradoSeleccion,
    borrandoSeleccion: estadoSeleccion.isLoading,
    // El `400` de los pendientes llega redactado y explica qué hacer
    // ("destildalos o resolvé esos avisos primero"): va tal cual al cartel.
    mensajeErrorSeleccion: getApiErrorMessage(estadoSeleccion.error),

    aBorrar,
    pedirBorrar,
    confirmarBorrado,
    cancelarBorrado,
    borrando: estadoBorrado.isLoading,
    mensajeErrorBorrado: getApiErrorMessage(estadoBorrado.error),

    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
