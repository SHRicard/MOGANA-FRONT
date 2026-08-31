import { useCallback, useEffect, useState } from 'react';
import { SEGUNDOS_REENVIO } from '../types';

export interface ContadorReenvio {
  /** Segundos que faltan para poder pedir otro código. `0` = ya se puede. */
  segundos: number;
  /** Arranca la cuenta. Se llama cuando el envío salió. */
  arrancar: () => void;
}

/**
 * La espera entre dos envíos de código (`docs/flujo_login.md`).
 *
 * **El backend impone un minuto**: pedir otro antes contesta *"Recién te
 * mandamos uno"*. El contador no reemplaza esa regla —no se puede confiar en el
 * reloj del teléfono para nada— sino que la hace visible: sin él, tocar
 * "reenviar" dos veces devuelve un mensaje que parece un error.
 *
 * Guarda **hasta cuándo** y no cuántos faltan: si el intervalo se atrasa —la app
 * pasó a segundo plano, el teléfono durmió—, restar de una marca de tiempo da el
 * número correcto igual, y descontando de a uno no.
 */
export function useContadorReenvio(): ContadorReenvio {
  const [hasta, setHasta] = useState<number | null>(null);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (hasta === null) {
      return;
    }

    const marcar = () => {
      const faltan = Math.max(0, Math.ceil((hasta - Date.now()) / 1000));
      setSegundos(faltan);
      if (faltan === 0) {
        setHasta(null);
      }
    };

    // Se marca ya, sin esperar el primer segundo: el botón tiene que apagarse
    // en el mismo toque.
    marcar();
    const id = setInterval(marcar, 1000);
    return () => clearInterval(id);
  }, [hasta]);

  const arrancar = useCallback(() => {
    setHasta(Date.now() + SEGUNDOS_REENVIO * 1000);
  }, []);

  return { segundos, arrancar };
}
