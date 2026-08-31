import { useCallback, useState } from 'react';
import { getApiErrorMessage } from '@/shared/utils';
import { useBorrarEspecieMutation } from '../api';
import type { Especie } from '../types';

/** El borrado, que siempre pasa por una confirmación. */
export interface BorradoDeEspecie {
  /** La que está por borrarse, o `null` si no hay diálogo abierto. */
  especie: Especie | null;
  pedirBorrar: (especie: Especie) => void;
  cancelar: () => void;
  confirmar: () => void;
  isSubmitting: boolean;
  /** Error de la API, ya redactado. El `409` explica que está en uso. */
  mensajeError: string | null;
}

/**
 * Borrar una especie (`docs/flujo_especies.md` §4).
 *
 * **Solo la que no se usó nunca.** Es la salida para la que se creó por error,
 * no una forma de limpiar el catálogo: borrar una en uso dejaría renglones sin
 * clasificar y facturas que ya no se pueden explicar. El listado trae `usos`,
 * así que la pantalla apaga el botón antes de llegar al `409`.
 *
 * Pasa por confirmación porque **no se puede deshacer**, aunque sea una especie
 * sin uso: el nombre y su fecha de creación se pierden.
 */
export function useBorrarEspecie(): BorradoDeEspecie {
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [borrar, { isLoading, error, reset }] = useBorrarEspecieMutation();

  const pedirBorrar = useCallback(
    (aBorrar: Especie) => {
      // Un intento nuevo tiene que empezar sin el cartel del anterior.
      reset();
      setEspecie(aBorrar);
    },
    [reset],
  );

  const cancelar = useCallback(() => setEspecie(null), []);

  const confirmar = useCallback(() => {
    if (!especie) {
      return;
    }
    borrar(especie.id)
      .unwrap()
      // Recién con el `204` se cierra: si falló, el diálogo se queda con el
      // cartel explicando por qué.
      .then(() => setEspecie(null))
      .catch(() => {});
  }, [borrar, especie]);

  return {
    especie,
    pedirBorrar,
    cancelar,
    confirmar,
    isSubmitting: isLoading,
    mensajeError: getApiErrorMessage(error),
  };
}
