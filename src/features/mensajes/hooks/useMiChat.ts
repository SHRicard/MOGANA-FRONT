import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { getApiErrorMessage, getApiErrorStatus, type ApiError } from '@/shared/utils';
import {
  useEscribirMensajeMutation,
  useLazyMiHiloQuery,
  useLeerMisMensajesMutation,
  useMiHiloQuery,
} from '../api';
import {
  fusionarMensajes,
  MENSAJES_LIMITE,
  REFRESCO_MS,
  type MiMensaje,
  type SobreQue,
} from '../types';

/**
 * Un mensaje que se está mandando o que no se pudo mandar.
 *
 * Vive **fuera de la lista del servidor** porque todavía no existe del otro
 * lado. Se dibuja abajo de todo, en gris, y desaparece en cuanto el servidor
 * devuelve el de verdad.
 */
export interface MensajeEnVuelo {
  /** Sirve de `key` y para reintentar el mismo. */
  id: string;
  texto: string;
  sobre?: SobreQue;
  /** `null` mientras va en camino; el texto del error si no salió. */
  problema: string | null;
}

export interface MiChat {
  /** **Del más nuevo al más viejo**: es el orden que consume la lista invertida. */
  mensajes: readonly MiMensaje[];
  /** Los que todavía no llegaron al servidor, del más nuevo al más viejo. */
  enVuelo: readonly MensajeEnVuelo[];

  /** `true` si el local cortó el canal: hay que esconder el campo de escribir. */
  silenciada: boolean;
  /** Cuántos me escribieron y todavía no abrí. */
  sinLeer: number;

  escribir: (texto: string, sobre?: SobreQue) => void;
  /** Vuelve a intentar uno que no salió. */
  reintentar: (id: string) => void;
  /** Lo saca de la pantalla sin mandarlo. */
  descartar: (id: string) => void;

  /** Trae la página siguiente hacia atrás. Sin más para traer, no hace nada. */
  verAnteriores: () => void;
  hayAnteriores: boolean;
  cargandoAnteriores: boolean;

  isLoading: boolean;
  mensajeError: string | null;
  reintentarCarga: () => void;
  refrescar: () => Promise<void>;
}

/** Id local de un mensaje en vuelo. No es el del servidor y nunca se manda. */
let proximoId = 0;
const nuevoIdLocal = () => `en-vuelo-${++proximoId}`;

/**
 * **El chat del cliente con el local** (`/mi/mensajes`).
 *
 * Tres cosas que hace y que no son obvias:
 *
 * 1. **Pregunta cada ocho segundos, pero solo con la pantalla en foco.** Es lo
 *    que reemplaza al websocket que el backend deliberadamente no tiene. Fuera
 *    de foco se apaga: para avisar con la app cerrada está la campanita.
 *
 * 2. **Marca leído al entrar, con un `POST` aparte.** El `GET` del hilo no lo
 *    hace, y está bien que no lo haga: un `GET` que escribe vacía el globito
 *    cuando alguien abre la pantalla sin querer, y cambia el estado con cada
 *    reintento de red.
 *
 * 3. **Muestra lo que se manda antes de que el servidor conteste.** Un chat que
 *    tarda medio segundo en mostrar lo que uno acaba de escribir se siente roto,
 *    y en una conexión mala ese medio segundo son cinco.
 */
export function useMiChat(): MiChat {
  const enfocada = useIsFocused();

  /**
   * La página 1, que es la que se refresca sola. Las anteriores se piden a mano
   * y se guardan aparte: son historia, no cambian.
   */
  const { data, error, isLoading, refetch } = useMiHiloQuery(
    { pagina: 1, limite: MENSAJES_LIMITE },
    { pollingInterval: enfocada ? REFRESCO_MS : 0 },
  );

  const [pedirPagina, { isFetching: cargandoAnteriores }] = useLazyMiHiloQuery();
  const [escribirMutation] = useEscribirMensajeMutation();
  const [leerMutation] = useLeerMisMensajesMutation();

  /** Las páginas viejas ya traídas, en orden de pedido. */
  const [anteriores, setAnteriores] = useState<readonly (readonly MiMensaje[])[]>([]);
  const [enVuelo, setEnVuelo] = useState<readonly MensajeEnVuelo[]>([]);

  /**
   * Todo junto y sin repetidos.
   *
   * Hace falta fusionar y no concatenar porque las dos cosas que pasa acá pelean
   * entre sí: se piden páginas hacia atrás mientras la 1 se vuelve a pedir sola.
   * Cuando entra un mensaje nuevo **las páginas se corren**, y el último de la 1
   * pasa a ser el primero de la 2.
   */
  const mensajes = useMemo(
    () => fusionarMensajes([data?.datos ?? [], ...anteriores]),
    [data?.datos, anteriores],
  );

  /**
   * Marcar leído al entrar.
   *
   * El `ref` no es paranoia: `leer` invalida el hilo, el hilo se vuelve a pedir,
   * y hasta que llegue la respuesta `sinLeer` sigue siendo mayor que cero. Sin
   * la guarda, ese hueco dispara una segunda llamada, y la segunda una tercera.
   */
  const leyendo = useRef(false);
  const sinLeer = data?.sinLeer ?? 0;

  useEffect(() => {
    if (!enfocada || sinLeer === 0 || leyendo.current) {
      return;
    }
    leyendo.current = true;
    leerMutation()
      .unwrap()
      .catch(() => {})
      .finally(() => {
        leyendo.current = false;
      });
  }, [enfocada, sinLeer, leerMutation]);

  /** Manda uno y lo saca de la cola si sale. Si no, le deja el motivo puesto. */
  const despachar = useCallback(
    (pendiente: MensajeEnVuelo) => {
      escribirMutation({ texto: pendiente.texto, sobre: pendiente.sobre })
        .unwrap()
        .then(() => {
          // El de verdad ya está en la lista del servidor: dejar el fantasma
          // puesto lo mostraría dos veces.
          setEnVuelo((cola) => cola.filter((uno) => uno.id !== pendiente.id));
        })
        .catch((problema: ApiError) => {
          /*
            El `429` y el `403` **no son fallas**: son el local diciendo algo, y
            el texto viene ya redactado para mostrarse tal cual —"esperá un
            minuto", "pasá por el local"—. Cualquier otro error es de red y se
            reintenta.
          */
          setEnVuelo((cola) =>
            cola.map((uno) =>
              uno.id === pendiente.id
                ? { ...uno, problema: getApiErrorMessage(problema) ?? 'No se pudo enviar.' }
                : uno,
            ),
          );
        });
    },
    [escribirMutation],
  );

  const escribir = useCallback(
    (texto: string, sobre?: SobreQue) => {
      const limpio = texto.trim();
      if (limpio.length === 0) {
        return;
      }
      const pendiente: MensajeEnVuelo = { id: nuevoIdLocal(), texto: limpio, sobre, problema: null };
      setEnVuelo((cola) => [pendiente, ...cola]);
      despachar(pendiente);
    },
    [despachar],
  );

  const reintentar = useCallback(
    (id: string) => {
      setEnVuelo((cola) => cola.map((uno) => (uno.id === id ? { ...uno, problema: null } : uno)));
      const pendiente = enVuelo.find((uno) => uno.id === id);
      if (pendiente) {
        despachar({ ...pendiente, problema: null });
      }
    },
    [enVuelo, despachar],
  );

  const descartar = useCallback((id: string) => {
    setEnVuelo((cola) => cola.filter((uno) => uno.id !== id));
  }, []);

  const paginas = data?.paginas ?? 1;
  const hayAnteriores = anteriores.length + 1 < paginas;

  const verAnteriores = useCallback(() => {
    if (!hayAnteriores || cargandoAnteriores) {
      return;
    }
    // +2: la 1 es la que se refresca sola, así que la primera "anterior" es la 2.
    const siguiente = anteriores.length + 2;

    pedirPagina({ pagina: siguiente, limite: MENSAJES_LIMITE })
      .unwrap()
      .then((pagina) => setAnteriores((previas) => [...previas, pagina.datos]))
      .catch(() => {});
  }, [hayAnteriores, cargandoAnteriores, anteriores.length, pedirPagina]);

  const reintentarCarga = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  /**
   * Un `403` acá **no es un error de pantalla**: es el canal cortado, y eso ya
   * lo dice `silenciada`. Mostrar el cartel rojo encima sería contar dos veces
   * lo mismo, y la segunda como si algo se hubiera roto.
   */
  const esSilencio = getApiErrorStatus(error) === 403;

  return {
    mensajes,
    enVuelo,

    silenciada: data?.silenciada ?? esSilencio,
    sinLeer,

    escribir,
    reintentar,
    descartar,

    verAnteriores,
    hayAnteriores,
    cargandoAnteriores,

    isLoading: isLoading && data === undefined,
    mensajeError: esSilencio ? null : getApiErrorMessage(error),
    reintentarCarga,
    refrescar,
  };
}
