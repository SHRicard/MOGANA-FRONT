import { baseApi } from '@/services/api';
import {
  borradaSchema,
  borradasSchema,
  leerTodasSchema,
  notificacionesPaginaSchema,
  notificacionSchema,
  type BorradaRespuesta,
  type BorradasRespuesta,
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

    /**
     * `DELETE /api/notificaciones/:id` — saca un aviso de la campanita.
     *
     * Es idempotente: borrarlo dos veces devuelve lo mismo y no mueve la fecha
     * del primer borrado. El de otra persona da `404` —igual que uno que no
     * existe—, así que nadie se entera de que ese id existe.
     *
     * ⚠️ **Es un borrado blando**: la fila queda en la base y deja de aparecer.
     * Un aviso es la prueba de qué se le comunicó a alguien y cuándo —*"no
     * tomamos tu pago del 3 porque el comprobante no se leía"* es, tres semanas
     * después, la única explicación de una deuda que sigue figurando—, así que
     * lo que se borra es de su vista, no del registro.
     *
     * ⚠️ **No se saca la fila a mano de la cache**: se invalida y se vuelve a
     * pedir. El `noLeidas` que vuelve ya es el número correcto del globito, y
     * calcularlo acá sería adivinar —un aviso sin leer que se borra también
     * queda marcado como leído del lado del backend—.
     */
    borrarNotificacion: builder.mutation<BorradaRespuesta, string>({
      query: (id) => ({ url: `/notificaciones/${id}`, method: 'DELETE' }),
      responseSchema: borradaSchema,
      invalidatesTags: [{ type: 'Notificacion', id: 'LIST' }],
    }),

    /**
     * `DELETE /api/notificaciones` — **vacía la campanita entera.**
     *
     * Solo las de quien pregunta, y solo las que seguían ahí: llamarlo dos veces
     * devuelve `0` la segunda, que es la respuesta correcta y no un error.
     *
     * ⚠️ **No hay forma de deshacerlo desde la app.** La fila queda en la base,
     * pero no hay endpoint para traerla de vuelta. Por eso la pantalla pregunta
     * antes.
     */
    borrarTodasLasNotificaciones: builder.mutation<BorradasRespuesta, void>({
      query: () => ({ url: '/notificaciones', method: 'DELETE' }),
      responseSchema: borradasSchema,
      invalidatesTags: [{ type: 'Notificacion', id: 'LIST' }],
    }),
  }),
});

export const {
  useListarNotificacionesQuery,
  useMarcarLeidaMutation,
  useLeerTodasMutation,
  useBorrarNotificacionMutation,
  useBorrarTodasLasNotificacionesMutation,
} = notificacionesApi;
