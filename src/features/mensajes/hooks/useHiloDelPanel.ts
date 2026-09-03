import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { getApiErrorMessage, getApiErrorStatus, type ApiError } from '@/shared/utils';
import {
  useEscribirDelPanelMutation,
  useHiloDelPanelQuery,
  useLazyHiloDelPanelQuery,
  useLeerDelPanelMutation,
  useSilenciarConversacionMutation,
} from '../api';
import {
  fusionarMensajes,
  MENSAJES_LIMITE,
  REFRESCO_MS,
  type MensajeDelPanel,
  type PersonaDelHilo,
} from '../types';
import type { MensajeEnVuelo } from './useMiChat';

export interface HiloDelCliente {
  cliente: PersonaDelHilo | null;
  /** **Del más nuevo al más viejo**: el orden de la lista invertida. */
  mensajes: readonly MensajeDelPanel[];
  enVuelo: readonly MensajeEnVuelo[];

  /** `true` si a este cliente le cortaron la palabra. */
  silenciada: boolean;
  silenciar: (silenciar: boolean) => void;
  cambiandoSilencio: boolean;

  /** Quién del panel lo miró último. Evita que dos personas contesten lo mismo. */
  miradoPor: string | null;

  escribir: (texto: string) => void;
  reintentar: (id: string) => void;
  descartar: (id: string) => void;

  verAnteriores: () => void;
  hayAnteriores: boolean;
  cargandoAnteriores: boolean;

  isLoading: boolean;
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentarCarga: () => void;
  refrescar: () => Promise<void>;
}

let proximoId = 0;
const nuevoIdLocal = () => `panel-en-vuelo-${++proximoId}`;

/**
 * **El hilo de un cliente, visto desde el panel.**
 *
 * Es el gemelo de `useMiChat` y comparte sus tres decisiones —refresco por
 * sondeo en foco, marcar leído con un `POST` aparte, mostrar lo que se manda
 * antes de que el servidor conteste— más dos que son solo de este lado:
 *
 * - **Silenciar**, que corta que el cliente escriba pero **no** que se le
 *   escriba: el hilo sigue abierto desde acá.
 * - **`leidoPor`**, que dice quién del panel ya pasó por este hilo. La bandeja
 *   es compartida y ese dato es lo único que evita dos respuestas iguales.
 */
export function useHiloDelPanel(clienteId: string): HiloDelCliente {
  const enfocada = useIsFocused();

  const { data, error, isLoading, refetch } = useHiloDelPanelQuery(
    { clienteId, pagina: 1, limite: MENSAJES_LIMITE },
    { pollingInterval: enfocada ? REFRESCO_MS : 0 },
  );

  const [pedirPagina, { isFetching: cargandoAnteriores }] = useLazyHiloDelPanelQuery();
  const [escribirMutation] = useEscribirDelPanelMutation();
  const [leerMutation] = useLeerDelPanelMutation();
  const [silenciarMutation, { isLoading: cambiandoSilencio }] = useSilenciarConversacionMutation();

  const [anteriores, setAnteriores] = useState<readonly (readonly MensajeDelPanel[])[]>([]);
  const [enVuelo, setEnVuelo] = useState<readonly MensajeEnVuelo[]>([]);

  const mensajes = useMemo(
    () => fusionarMensajes([data?.datos ?? [], ...anteriores]),
    [data?.datos, anteriores],
  );

  /** Ver el hilo es atenderlo: se marca leído al entrar. Ver `useMiChat`. */
  const leyendo = useRef(false);
  const sinLeer = data?.sinLeer ?? 0;

  useEffect(() => {
    if (!enfocada || sinLeer === 0 || leyendo.current) {
      return;
    }
    leyendo.current = true;
    leerMutation(clienteId)
      .unwrap()
      .catch(() => {})
      .finally(() => {
        leyendo.current = false;
      });
  }, [enfocada, sinLeer, clienteId, leerMutation]);

  const despachar = useCallback(
    (pendiente: MensajeEnVuelo) => {
      escribirMutation({ clienteId, texto: pendiente.texto })
        .unwrap()
        .then(() => setEnVuelo((cola) => cola.filter((uno) => uno.id !== pendiente.id)))
        .catch((problema: ApiError) => {
          setEnVuelo((cola) =>
            cola.map((uno) =>
              uno.id === pendiente.id
                ? { ...uno, problema: getApiErrorMessage(problema) ?? 'No se pudo enviar.' }
                : uno,
            ),
          );
        });
    },
    [clienteId, escribirMutation],
  );

  const escribir = useCallback(
    (texto: string) => {
      const limpio = texto.trim();
      if (limpio.length === 0) {
        return;
      }
      const pendiente: MensajeEnVuelo = { id: nuevoIdLocal(), texto: limpio, problema: null };
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

  const silenciar = useCallback(
    (valor: boolean) => {
      silenciarMutation({ clienteId, silenciar: valor })
        .unwrap()
        .catch(() => {});
    },
    [clienteId, silenciarMutation],
  );

  const paginas = data?.paginas ?? 1;
  const hayAnteriores = anteriores.length + 1 < paginas;

  const verAnteriores = useCallback(() => {
    if (!hayAnteriores || cargandoAnteriores) {
      return;
    }
    pedirPagina({ clienteId, pagina: anteriores.length + 2, limite: MENSAJES_LIMITE })
      .unwrap()
      .then((pagina) => setAnteriores((previas) => [...previas, pagina.datos]))
      .catch(() => {});
  }, [hayAnteriores, cargandoAnteriores, anteriores.length, clienteId, pedirPagina]);

  const reintentarCarga = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const sinPermiso = getApiErrorStatus(error) === 403;

  return {
    cliente: data?.cliente ?? null,
    mensajes,
    enVuelo,

    silenciada: data?.silenciada ?? false,
    silenciar,
    cambiandoSilencio,

    miradoPor: data?.leidoPor?.displayName ?? null,

    escribir,
    reintentar,
    descartar,

    verAnteriores,
    hayAnteriores,
    cargandoAnteriores,

    isLoading: isLoading && data === undefined,
    sinPermiso,
    mensajeError: sinPermiso ? null : getApiErrorMessage(error),
    reintentarCarga,
    refrescar,
  };
}
