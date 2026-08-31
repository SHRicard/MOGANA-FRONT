import { baseApi } from '@/services/api';
import {
  leerTodasSchema,
  notificacionesPaginaSchema,
  notificacionSchema,
  type LeerTodasRespuesta,
  type ListarNotificacionesParams,
  type Notificacion,
  type NotificacionesPagina,
} from '../types';

/**
 * Los avisos de quien pregunta (`docs/notificaciones.md`). **Nunca llevan un id
 * de persona**: sale de la sesión, así que no hay forma de leer los de otro.
 */

/**
 * Al marcar uno como leído hay que tocar **la lista que se está viendo**, y una
 * lista en RTK Query es una entrada de cache por combinación de params. Por eso
 * el `params` viaja al lado del id: no se manda a la API —el `POST` no lleva
 * body— y es lo único que permite pintar el aviso leído sin esperar la
 * respuesta, que es lo que pide el doc.
 */
type MarcarLeidaArgs = {
  id: string;
  params: ListarNotificacionesParams;
};

export const notificacionesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** `GET /api/notificaciones` — del más nuevo al más viejo. */
    listarNotificaciones: builder.query<NotificacionesPagina, ListarNotificacionesParams | void>({
      query: (params) => ({
        url: '/notificaciones',
        method: 'GET',
        params: {
          // `undefined` no viaja: sin filtro, la query sale limpia.
          soloNoLeidas: params?.soloNoLeidas ? true : undefined,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: notificacionesPaginaSchema,
      providesTags: [{ type: 'Notificacion', id: 'LIST' }],
    }),

    /**
     * `POST /api/notificaciones/:id/leida` — sin body. Devuelve el aviso ya
     * marcado.
     *
     * Es idempotente: marcarlo dos veces no cambia la fecha de la primera
     * lectura. El aviso de otra persona da `404` —igual que uno que no existe—,
     * así que nadie se entera de que ese id existe.
     *
     * **Se pinta leído antes de que conteste la API**: abrir un aviso y esperar
     * medio segundo a que se apague el punto se siente roto. Si la request
     * falla, el parche se deshace solo y el número vuelve en el próximo listado.
     */
    marcarLeida: builder.mutation<Notificacion, MarcarLeidaArgs>({
      query: ({ id }) => ({ url: `/notificaciones/${id}/leida`, method: 'POST' }),
      responseSchema: notificacionSchema,

      async onQueryStarted({ id, params }, { dispatch, queryFulfilled }) {
        const parche = dispatch(
          notificacionesApi.util.updateQueryData('listarNotificaciones', params, (borrador) => {
            const aviso = borrador.datos.find((n) => n.id === id);
            // Ya estaba leído: ni se toca la fecha ni se descuenta de más.
            if (!aviso || aviso.leidaEn) {
              return;
            }
            // La fecha real la manda el backend; acá alcanza con que deje de ser
            // `null`, que es lo que apaga el punto.
            aviso.leidaEn = new Date().toISOString();
            borrador.noLeidas = Math.max(0, borrador.noLeidas - 1);
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          parche.undo();
        }
      },

      /**
       * Invalida igual: el globito es otra entrada de cache (`PARAMS_GLOBITO`) y
       * el parche de arriba solo toca la lista que se está viendo.
       */
      invalidatesTags: [{ type: 'Notificacion', id: 'LIST' }],
    }),

    /** `POST /api/notificaciones/leer-todas` — vacía el globito de una. */
    leerTodas: builder.mutation<LeerTodasRespuesta, void>({
      query: () => ({ url: '/notificaciones/leer-todas', method: 'POST' }),
      responseSchema: leerTodasSchema,
      invalidatesTags: [{ type: 'Notificacion', id: 'LIST' }],
    }),
  }),
});

export const { useListarNotificacionesQuery, useMarcarLeidaMutation, useLeerTodasMutation } =
  notificacionesApi;
