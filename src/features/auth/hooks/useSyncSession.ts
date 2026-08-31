import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { useGetMeQuery } from '../api';
import { selectIsAuthenticated, setUser } from '../store';

/**
 * Trae `GET /users/me` al entrar a la app y refresca el usuario en el store.
 *
 * Hace falta porque **el rol decide qué se muestra** y la sesión persiste en el
 * storage: al abrir la app, el usuario cacheado puede tener días. El rol **no
 * viaja en el token** (`docs/s.roles.md`): el backend lo lee de la base en cada
 * request, así que el token sigue valiendo aunque el rol haya cambiado.
 *
 * Y trae el **`estado`**, que decide algo más grande todavía: si la persona
 * puede usar la app o le falta cargar el DNI (`docs/flujo_login.md`). Es lo que
 * pide el doc — refrescar antes de navegar—, y no es teórico: el administrador
 * puede habérselo cargado desde el panel, y la sesión guardada en el teléfono
 * diría `bloqueado` de más.
 *
 * Se monta una sola vez, en el `RootNavigator`.
 *
 * Si el endpoint todavía no existe del lado del backend, la query falla y no se
 * despacha nada: la app sigue andando con lo que vino del login. Degradar así es
 * a propósito — que falte `/auth/me` no puede tirar abajo una sesión válida.
 */
export function useSyncSession() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // `skip` y no un `if`: sin sesión no hay a quién preguntarle, y la request
  // saldría sin `Authorization` para volver con un 401.
  const { data } = useGetMeQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (data) {
      if (__DEV__) {
        // Qué tabs y filas del menú se ven sale ENTERO del rol. Cuando algo no
        // aparece —o aparece de más— la primera pregunta es qué mandó el
        // backend, y sin esto hay que salir a averiguarlo.
        console.info(
          '[auth] Sesión sincronizada:',
          // Los dos identificadores, porque una cuenta creada con DNI no tiene email.
          JSON.stringify({ email: data.email, dni: data.dni, rol: data.rol, estado: data.estado }),
        );
      }
      dispatch(setUser(data));
    }
    // `data` viene del cache de RTK Query: mantiene la identidad entre renders,
    // así que esto no se dispara en loop con el cambio de state que provoca.
  }, [data, dispatch]);
}
