/** API pública de la feature auth. El resto de la app importa SOLO desde acá. */
export { LoginScreen } from './screens/LoginScreen';
export { RegisterScreen } from './screens/RegisterScreen';
export { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';

/**
 * Las dos pantallas que abren los enlaces de los correos
 * (`docs/flujo_login.md`). Son **públicas**: se registran fuera del switch por
 * sesión del `RootNavigator`.
 */
export { VerificarCorreoScreen } from './screens/VerificarCorreoScreen';
export { NuevaClaveScreen } from './screens/NuevaClaveScreen';

/** Cierre de sesión completo (Google + token + cache). Usar esto, no `logout()`. */
export { useLogout } from './hooks';

/** Rol del usuario logueado, para esconder lo que no le corresponde. */
export { useRol } from './hooks';

/**
 * Refresca el usuario —y su rol— con `/users/me`. Va en el RootNavigator.
 * Hace falta porque el rol NO viaja en el token: si cambió del otro lado, el
 * token sigue valiendo y el store quedaría viejo (`docs/s.roles.md`).
 */
export { useSyncSession } from './hooks';

/** Vuelve a pedir `/users/me` y devuelve la promesa. Para el "tirar para abajo". */
export { useRefrescarSesion } from './hooks';

export { authReducer, setCredentials, setUser, logout } from './store';
export { selectIsAuthenticated, selectCurrentUser, selectRol } from './store';

/**
 * Si la sesión está trabada por perfil incompleto, y por qué
 * (`docs/flujo_login.md`). Lo consume el `RootNavigator` y la feature `perfil`.
 */
export { selectEstaBloqueado, selectMotivoBloqueo } from './store';

/**
 * Los tres roles del sistema (`docs/s.roles.md`). Vienen del backend dentro del
 * usuario, en `rol`. **Es lo único que decide quién ve qué**: el array
 * `permissions` no existe más.
 */
export { Roles, toRol } from './types';

/**
 * Cómo se normaliza el usuario que devuelve la API. Se exporta porque hay **más
 * de un endpoint que devuelve la misma cuenta** —`/users/me` y el PATCH del
 * perfil (`@/features/perfil`)— y los dos tienen que dejarla en la forma única
 * con la que trabaja la app.
 */
export { userApiSchema, userSchema, toUser } from './types';

/**
 * El estado de la cuenta: si puede usar la app o le falta cargar el DNI. Lo
 * decide el **backend** (`docs/flujo_login.md`), nunca la app.
 */
export { EstadosAcceso, toEstadoAcceso, estaBloqueado, estadoAccesoSchema } from './types';

export type { User, Rol, EstadoAcceso } from './types';
