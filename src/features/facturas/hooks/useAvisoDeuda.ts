import { useCallback } from 'react';
import { getApiErrorMessage } from '@/shared/utils';
import { useAvisarDeudaMutation } from '../api';

export interface AvisoDeDeuda {
  /** Manda el aviso. La pantalla confirma antes: del otro lado hay una persona. */
  avisar: () => void;
  enviando: boolean;
  /** `true` cuando salió: la pantalla muestra el cartel de que llegó. */
  enviado: boolean;
  mensajeError: string | null;
  /** Deja el estado limpio para el próximo aviso (y cierra los carteles). */
  limpiar: () => void;
}

/**
 * Reclamarle la deuda a un cliente (`docs/notificaciones.md`).
 *
 * Le deja un **aviso adentro de la app** —que queda ahí hasta que lo lea— y le
 * manda un **correo** si tiene dirección cargada. Las dos cosas porque el correo
 * se pierde entre cien más y el aviso de la app no.
 *
 * ⚠️ **El sistema no reclama solo.** Esto lo aprieta una persona con la decisión
 * tomada, así que el hook no lo dispara en ningún efecto ni lo reintenta solo.
 *
 * @param clienteId a quién. Va en la URL.
 */
export function useAvisoDeuda(clienteId: string): AvisoDeDeuda {
  const [avisarDeuda, { isLoading, isSuccess, error, reset }] = useAvisarDeudaMutation();

  const avisar = useCallback(() => {
    // El `onPress` de un botón no espera nada; el error queda en la mutation.
    avisarDeuda(clienteId)
      .unwrap()
      .catch(() => {});
  }, [avisarDeuda, clienteId]);

  return {
    avisar,
    enviando: isLoading,
    enviado: isSuccess,
    mensajeError: getApiErrorMessage(error),
    limpiar: reset,
  };
}
