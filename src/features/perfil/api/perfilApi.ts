import { baseApi } from '@/services/api';
import { setUser, toUser } from '@/features/auth';
import { perfilSchema, type ActualizarPerfilPayload, type Perfil } from '../types';

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
  }),
});

export const { useGetMiPerfilQuery, useActualizarMiCuentaMutation } = perfilApi;
