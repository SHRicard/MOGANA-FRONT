import { useAppSelector } from '@/store';
import { selectIsAuthenticated } from '@/features/auth';
import { useListarNotificacionesQuery } from '../api';
import { PARAMS_GLOBITO } from '../types';

/**
 * Cuántos avisos sin leer tiene la cuenta. Es **el número del globito** de la
 * campanita (`docs/notificaciones.md`).
 *
 * Pide una sola fila (`PARAMS_GLOBITO`): `noLeidas` viene en la respuesta y
 * cuenta todas las sin leer, así que traer la lista entera para mostrar un
 * número sería trabajo al pedo. Es una entrada de cache aparte de la que usa la
 * pantalla —a propósito—: el globito tiene que estar bien aunque nadie haya
 * abierto Avisos, y aunque la pantalla esté en la página 3.
 *
 * `selectFromResult` recorta la suscripción al número: el navigator se vuelve a
 * dibujar cuando cambia el globito, no cada vez que llega una lista.
 *
 * Las dos mutaciones invalidan el mismo tag, así que marcar uno como leído
 * actualiza esto solo.
 */
export function useNoLeidas(): number {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const { noLeidas } = useListarNotificacionesQuery(PARAMS_GLOBITO, {
    // Sin sesión no hay a quién preguntarle, y la request saldría sin
    // `Authorization` para volver con un 401.
    skip: !isAuthenticated,
    selectFromResult: ({ data }) => ({ noLeidas: data?.noLeidas ?? 0 }),
  });

  return noLeidas;
}
