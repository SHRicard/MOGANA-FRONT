import { baseApi } from '@/services/api';
import { setUser, toUser } from '@/features/auth';
import {
  bajaHechaSchema,
  perfilSchema,
  vistaPreviaDeBajaSchema,
  type ActualizarPerfilPayload,
  type BajaHecha,
  type DarDeBajaPayload,
  type Perfil,
  type VistaPreviaDeBaja,
} from '../types';

/**
 * La cuenta propia. Sirve para **cualquier rol** y nunca lleva un id: sale de la
 * sesión, así que no hay forma de tocar la cuenta de otro
 * (`docs/flujo_mi_cuenta.md`).
 *
 * ⚠️ Reemplaza a `GET`/`PATCH /api/cliente/mi-cuenta`, que **ya no existen**:
 * hoy responden `404`.
 *
 * ⚠️ Es el **mismo endpoint** que pide `useSyncSession` en auth, con otro
 * schema: allá se guarda lo que decide qué se ve —rol y estado— y se persiste
 * con la sesión; acá se lee el perfil entero, que es de esta pantalla. Son dos
 * entradas de cache y una request de más al abrir Mi cuenta, a cambio de no
 * cargar la sesión de todo el mundo con el teléfono y la dirección.
 */
export const perfilApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * `GET /api/users/me` — lo que se muestra en Mi cuenta.
     *
     * La pantalla se arma con esto y **no con lo que quedó del login**: el
     * teléfono, la dirección y las reglas de edición no viajan en la sesión, y
     * el DNI puede habérselo cargado un administrador desde el panel.
     */
    getMiPerfil: builder.query<Perfil, void>({
      query: () => ({ url: '/users/me', method: 'GET' }),
      responseSchema: perfilSchema,
      providesTags: ['User'],
    }),

    /**
     * `PATCH /api/users/me` — guarda lo que cambió y devuelve **el perfil
     * completo**, igual que el `GET`.
     *
     * Por eso el estado se reemplaza con la respuesta en vez de recomponerlo a
     * mano: vuelve ya normalizado —el teléfono sin paréntesis, la dirección sin
     * espacios de más— y, si lo que se mandó era el DNI, también con
     * `estado: "activo"`. **No hace falta renovar el token**: el mismo Bearer
     * entra a todos lados en la request siguiente.
     */
    actualizarMiCuenta: builder.mutation<Perfil, ActualizarPerfilPayload>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      responseSchema: perfilSchema,

      /**
       * La sesión se actualiza con lo que volvió, y con ella el `estado`. Es lo
       * que baja el cartel del bloqueo: el `RootNavigator` mira la sesión, no
       * esta mutation.
       *
       * `toUser` es el mismo normalizador que usa auth para el login y para
       * `/users/me`, así que el usuario del store queda con la forma de siempre.
       */
      async onQueryStarted(_payload, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setUser(toUser(data)));
      },

      /**
       * Todo lo demás quedó viejo, y no es solo el nombre: si la cuenta venía
       * bloqueada, **cada request contestó `403`**, así que las listas del panel
       * están vacías en el cache. Invalidando los dos tags se vuelven a pedir
       * ahora que el token pasa.
       */
      invalidatesTags: ['User', 'Factura'],
    }),

    /**
     * `GET /api/users/me/baja` — **qué va a pasar si se da de baja. No borra
     * nada** (`docs/README_FRONT_BAJA_DE_CUENTA.md` §3).
     *
     * ⚠️ Lo que devuelve no es una cortesía de UX: es **el aviso que la política
     * de Google Play obliga a mostrar** —qué datos se retienen y por qué—, y por
     * eso los seis textos vienen escritos del servidor y se muestran tal cual.
     *
     * ⚠️ **No provee ni consume el tag `User`.** Se pide al entrar a la pantalla
     * y una sola vez: la deuda puede cambiar entre que se mira y se confirma, y
     * el que decide de verdad es el `DELETE`, que la vuelve a calcular. Colgarlo
     * del tag haría que un refetch de la sesión reescriba el cartel que la
     * persona está leyendo.
     */
    getVistaPreviaDeBaja: builder.query<VistaPreviaDeBaja, void>({
      query: () => ({ url: '/users/me/baja', method: 'GET' }),
      responseSchema: vistaPreviaDeBajaSchema,
    }),

    /**
     * `DELETE /api/users/me` — **el borrado** (§4).
     *
     * ⚠️ **Lleva body**, y hay clientes HTTP y proxies que lo tiran; si eso
     * pasara, el resultado es el `400` de *"Para confirmar, escribí ELIMINAR."*
     * — el lado correcto por el que fallar. En React Native el `fetch` de
     * `fetchBaseQuery` lo manda bien.
     *
     * ⚠️ **No invalida ningún tag, y es lo importante de este endpoint.** El
     * token dejó de servir en el mismo request: cualquier refetch que disparara
     * una invalidación volvería con `401` y la persona vería un error donde
     * tendría que ver una despedida. La sesión la cierra la pantalla, después de
     * mostrar el mensaje.
     *
     * Errores: `400` si la palabra no coincide, `409` si la cuenta es de
     * administración (*"Las cuentas del negocio no se dan de baja desde acá"*),
     * `401` si el token ya no sirve — un doble toque.
     */
    darDeBaja: builder.mutation<BajaHecha, DarDeBajaPayload>({
      query: (body) => ({ url: '/users/me', method: 'DELETE', body }),
      responseSchema: bajaHechaSchema,
    }),
  }),
});

export const {
  useGetMiPerfilQuery,
  useActualizarMiCuentaMutation,
  useGetVistaPreviaDeBajaQuery,
  useDarDeBajaMutation,
} = perfilApi;
