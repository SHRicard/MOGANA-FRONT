import { useCallback, useMemo, useRef, useState } from 'react';
// Del barrel de `mi` sale UNA constante: el id de cache de la cuenta propia.
// Leer que tomaron —o rechazaron— un pago es el único momento en que esa cuenta
// cambia sin que la persona haga nada, y es acá donde nos enteramos
// (`docs/user_cliente_flujo.md` §12).
import { MIS_DATOS } from '@/features/mi';
import { baseApi } from '@/services/api';
import { getApiErrorMessage } from '@/shared/utils';
import { useAppDispatch } from '@/store';
import { useLeerTodasMutation, useListarNotificacionesQuery, useMarcarLeidaMutation } from '../api';
import {
  destinoDeAviso,
  esPagoResuelto,
  NOTIFICACIONES_LIMITE,
  type DestinoDeAviso,
  type ListarNotificacionesParams,
  type Notificacion,
} from '../types';

/**
 * Todo lo que necesita `NotificationsScreen` para dibujarse. La pantalla no
 * calcula nada: pinta esto.
 */
export interface ListadoNotificaciones {
  // ── Filtro ──
  /** `true` cuando está puesta la pestaña "Sin leer". */
  soloNoLeidas: boolean;
  onSoloNoLeidasChange: (soloNoLeidas: boolean) => void;

  // ── Resultados ──
  notificaciones: readonly Notificacion[];
  total: number;
  /** Todas las sin leer de la cuenta, no las de esta página ni las del filtro. */
  noLeidas: number;
  pagina: number;
  paginas: number;
  irAPagina: (pagina: number) => void;

  // ── Acciones ──
  /**
   * Tocar un aviso: lo marca leído —se pinta al toque, sin esperar a la API— y
   * devuelve **a dónde lleva**, o `null` si no lleva a ningún lado.
   *
   * Devuelve el destino en vez de navegar porque esta feature no conoce los
   * nombres de las rutas: eso lo traduce la pantalla.
   */
  abrir: (notificacion: Notificacion) => DestinoDeAviso | null;
  /** Vacía el globito de una. */
  leerTodas: () => void;
  /** Hay un "marcar todas" en vuelo. */
  marcandoTodas: boolean;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** El "tirar para abajo": devuelve la promesa para que la rueda espere. */
  refrescar: () => Promise<void>;
}

/**
 * El apartado Avisos (`docs/notificaciones.md`): la lista, la pestaña de sin
 * leer y las dos formas de marcarlos.
 *
 * Tocar un aviso lo marca leído **y abre lo que está diciendo**: la factura de
 * la que hablan los de pago, o las vencidas en el de deuda
 * (`docs/user_cliente_flujo.md` §11). Los que no llevan a ningún lado solo se
 * marcan.
 *
 * ⚠️ **Leer que tomaron o rechazaron un pago refresca la cuenta propia.** Es el
 * único momento en que esa cuenta cambia sin que la persona haga nada, y sin
 * esto el aviso llevaría a una factura con el saldo de antes (§12).
 */
export function useNotificaciones(): ListadoNotificaciones {
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [pagina, setPagina] = useState(1);

  /**
   * Volver a la página 1 al cambiar de pestaña, ajustado **durante el render** y
   * no en un `useEffect`: con el efecto, este render todavía pediría la página
   * vieja del filtro nuevo y recién el siguiente pediría la 1. Son dos requests,
   * y una es basura.
   */
  const filtroPrevio = useRef(soloNoLeidas);
  if (filtroPrevio.current !== soloNoLeidas) {
    filtroPrevio.current = soloNoLeidas;
    setPagina(1);
  }

  const params: ListarNotificacionesParams = useMemo(
    () => ({ soloNoLeidas, pagina, limite: NOTIFICACIONES_LIMITE }),
    [soloNoLeidas, pagina],
  );

  const { data, error, isLoading, isFetching, refetch } = useListarNotificacionesQuery(params);

  const dispatch = useAppDispatch();
  const [marcarLeidaMutation] = useMarcarLeidaMutation();
  const [leerTodasMutation, { isLoading: marcandoTodas }] = useLeerTodasMutation();

  /**
   * Cada combinación de params es una entrada de cache distinta, así que `data`
   * vuelve a ser `undefined` en cuanto se cambia de página o de pestaña. Se
   * guarda la última respuesta para dejarla puesta mientras carga la nueva: sin
   * esto, la lista desaparece y vuelve en cada toque.
   */
  const ultima = useRef<{
    datos: readonly Notificacion[];
    total: number;
    noLeidas: number;
    paginas: number;
  } | null>(null);
  if (data) {
    ultima.current = {
      datos: data.datos,
      total: data.total,
      noLeidas: data.noLeidas,
      paginas: data.paginas,
    };
  }

  // Con error manda el cartel: una lista vieja que ya no representa nada es peor
  // que no mostrar lista.
  const resultado = error
    ? { datos: [], total: 0, noLeidas: 0, paginas: 0 }
    : ultima.current ?? { datos: [], total: 0, noLeidas: 0, paginas: 0 };

  const abrir = useCallback(
    (notificacion: Notificacion): DestinoDeAviso | null => {
      // Ya leído: no se manda nada. La API es idempotente igual, pero una
      // request por cada toque en una lista ya leída no le sirve a nadie.
      if (!notificacion.leidaEn) {
        // El `params` viaja para que el parche optimista toque la lista que se
        // está viendo. `catch` vacío: el error ya lo maneja el `onQueryStarted`
        // deshaciendo el parche, y acá solo evita la promesa colgada.
        marcarLeidaMutation({ id: notificacion.id, params })
          .unwrap()
          .catch(() => {});
      }

      /*
        Se invalida SIEMPRE que el aviso hable de un pago resuelto, esté leído o
        no: lo que quedó viejo es la cuenta, y eso no depende de si el punto ya
        estaba apagado. Sin esto se navega a una factura que sigue mostrando el
        saldo de antes de que le tomaran el pago.
      */
      if (esPagoResuelto(notificacion)) {
        dispatch(baseApi.util.invalidateTags([{ type: 'Factura', id: MIS_DATOS }]));
      }

      return destinoDeAviso(notificacion);
    },
    [marcarLeidaMutation, params, dispatch],
  );

  const leerTodas = useCallback(() => {
    leerTodasMutation()
      .unwrap()
      .catch(() => {});
  }, [leerTodasMutation]);

  const irAPagina = useCallback((destino: number) => setPagina(destino), []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    soloNoLeidas,
    onSoloNoLeidasChange: setSoloNoLeidas,

    notificaciones: resultado.datos,
    total: resultado.total,
    noLeidas: resultado.noLeidas,
    pagina,
    paginas: resultado.paginas,
    irAPagina,

    abrir,
    leerTodas,
    marcandoTodas,

    isLoading: isLoading && ultima.current === null,
    isFetching,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
