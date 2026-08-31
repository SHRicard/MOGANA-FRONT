import { useCallback } from 'react';
import { useAppSelector } from '@/store';
import { useGetMeQuery } from '../api';
import { selectIsAuthenticated } from '../store';

/**
 * Vuelve a pedir `GET /users/me` y devuelve la promesa: es el "tirar para abajo"
 * de las pantallas que muestran datos de la sesión.
 *
 * Sirve de verdad porque **el rol no viaja en el token** (`docs/s.roles.md`): si
 * del otro lado le cambiaron el rol a la cuenta, la app se entera recién cuando
 * vuelve a preguntar. La respuesta la escribe en el store `useSyncSession`, que
 * escucha el mismo cache, así que los tabs y el menú se reacomodan solos.
 */
export function useRefrescarSesion(): () => Promise<void> {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Mismo `skip` que `useSyncSession`: sin sesión no hay a quién preguntarle.
  // Comparten la entrada del cache, así que esto no agrega una segunda request.
  const { refetch } = useGetMeQuery(undefined, { skip: !isAuthenticated });

  return useCallback(async () => {
    // Sin sesión la query está en `skip` y nunca arrancó: pedirle un refetch
    // solo deja un warning de RTK Query en consola.
    if (!isAuthenticated) {
      return;
    }
    await refetch();
  }, [isAuthenticated, refetch]);
}
