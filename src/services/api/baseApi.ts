import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config';
// Ruta profunda y NO el barrel `@/features/auth`: ese barrel arrastra las
// screens, que llegan por sus hooks hasta este archivo → ciclo en runtime. Es el
// mismo motivo por el que `src/store` importa el reducer así.
import { logout } from '@/features/auth/store';
import { secureStorageService, SecureStorageKeys } from '@/services/storage';
import { esCuentaDadaDeBaja, esErrorDePerfilIncompleto, getApiErrorMessage } from '@/shared/utils';

const fetchConToken = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = secureStorageService.getToken(SecureStorageKeys.AUTH_TOKEN);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

/** La cuenta propia. Es lo único que contesta con la sesión bloqueada. */
const RUTA_PERFIL = '/users/me';

function urlDe(args: string | FetchArgs): string {
  return typeof args === 'string' ? args : args.url;
}

/**
 * `true` si esta request es **el borrado de la cuenta propia**
 * (`docs/README_FRONT_BAJA_DE_CUENTA.md` §4).
 *
 * Se mira el método y no solo la URL porque `/users/me` es también el `GET` y el
 * `PATCH` del perfil: lo único que hay que dejar pasar es el `DELETE`, que tiene
 * su propia pantalla y su propio cierre de sesión.
 */
function esElBorradoDeLaCuenta(args: string | FetchArgs): boolean {
  return typeof args !== 'string' && args.method === 'DELETE' && urlDe(args) === RUTA_PERFIL;
}

/**
 * El mismo fetch, con dos redes.
 *
 * **1. El `403` de perfil incompleto** (`docs/flujo_login.md`): vuelve a pedir la
 * sesión. Con la sesión al día, `estado` pasa a `bloqueado` y el `RootNavigator`
 * cambia solo a la pantalla del DNI. Por eso acá no se navega ni se abre nada a
 * mano: se corrige el dato y la app se reacomoda.
 *
 * Es una **red y no el camino principal**: lo normal es que la sesión ya tenga
 * a la persona en el cartel antes de que salga ninguna request. Esto cubre el
 * caso en que la bloquearon desde el panel mientras la app estaba abierta.
 *
 * ⚠️ No se dispara sobre `/users/me`, que es justamente lo que se vuelve a
 * pedir: si ese endpoint contestara `403`, invalidar su propio tag sería un
 * loop infinito de requests.
 *
 * **2. El `401` de cuenta dada de baja**
 * (`docs/README_FRONT_BAJA_DE_CUENTA.md` §5): ese token no va a volver a servir
 * nunca, así que se cierra la sesión con el mensaje del backend. El
 * `RootNavigator` cambia solo al login y ahí se muestra el texto.
 *
 * Es el caso del **segundo teléfono**: alguien se dio de baja desde uno y en el
 * otro la app sigue abierta con un token que ya murió. Sin esto vería un error
 * de red distinto en cada pantalla que abra.
 *
 * ⚠️ **Salvo cuando la request es el `DELETE` de la baja**: ahí un `401` es el
 * doble toque de quien está justo dándose de baja, y su pantalla ya está por
 * mostrarle la despedida. Cerrarle la sesión desde acá se la sacaría de encima
 * antes de que la lea.
 */
const fetchConRedes: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const resultado = await fetchConToken(args, api, extraOptions);

  if (esErrorDePerfilIncompleto(resultado.error) && !urlDe(args).startsWith(RUTA_PERFIL)) {
    api.dispatch(baseApi.util.invalidateTags(['User']));
  }

  if (esCuentaDadaDeBaja(resultado.error) && !esElBorradoDeLaCuenta(args)) {
    // El texto del backend viaja con el logout: es lo que el login va a mostrar,
    // y está escrito para leerse tal cual.
    api.dispatch(logout(getApiErrorMessage(resultado.error) ?? undefined));
    api.dispatch(baseApi.util.resetApiState());
  }

  return resultado;
};

/**
 * Base de RTK Query. Es la ÚNICA `createApi` de la app.
 * Cada feature inyecta sus endpoints acá con `baseApi.injectEndpoints({...})`
 * en su archivo `<feature>Api.ts`.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchConRedes,

  /**
   * Si la respuesta de la API no cumple el `responseSchema` de Zod, el error se
   * convierte en un FetchBaseQueryError normal. Así la UI lo trata como
   * cualquier otro fallo en vez de romper con una excepción sin manejar.
   */
  catchSchemaFailure: (error, info): FetchBaseQueryError => {
    if (__DEV__) {
      // Se loguea también el valor crudo: saber QUÉ llegó es la mitad del
      // diagnóstico. Con solo los issues, un "invalid_value" no dice cuál fue el
      // valor que no encajó, y ahí se va el rato averiguándolo a mano.
      //
      // En dos llamadas y en una línea cada una, sin indentar: LogBox recorta
      // los payloads largos y así el valor no llega nunca a la consola.
      console.error(`[API] Respuesta inválida en "${info.endpoint}":`, error.issues);
      console.error(`[API] Recibido en "${info.endpoint}":`, JSON.stringify(error.value));
    }
    return {
      status: 'CUSTOM_ERROR',
      error: 'La respuesta del servidor no tiene el formato esperado.',
      data: __DEV__ ? error.issues : undefined,
    };
  },

  /**
   * Tags para invalidación de cache. Se declaran acá y se usan en los endpoints
   * de cada feature (providesTags / invalidatesTags).
   */
  tagTypes: ['User', 'Factura', 'Notificacion', 'Especie', 'Mensaje', 'Auditoria'],
  endpoints: () => ({}), // vacío a propósito: las features inyectan sus endpoints
});
