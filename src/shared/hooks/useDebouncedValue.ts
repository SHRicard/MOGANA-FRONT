import { useEffect, useState } from 'react';

/**
 * El valor, pero "atrasado": solo se actualiza cuando pasaron `delayMs` sin
 * cambios. Es lo que hace que un buscador dispare **una** request cuando la
 * persona deja de tipear y no una por tecla.
 *
 * ```ts
 * const [texto, setTexto] = useState('');
 * const q = useDebouncedValue(texto, 300); // esto es lo que va a la API
 * ```
 *
 * ⚠️ El valor INICIAL no se atrasa: la primera carga tiene que salir ya, no
 * 300 ms después de montar la pantalla.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    // Cada tecla cancela el timer anterior: por eso solo llega el último valor.
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
