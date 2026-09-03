import { baseApi } from '@/services/api';
import {
  auditoriaPaginaSchema,
  cuentaDelSistemaSchema,
  resumenDelSistemaSchema,
  type AuditoriaPagina,
  type CambiarRolPayload,
  type CuentaDelSistema,
  type ListarAuditoriaParams,
  type ResumenDelSistema,
} from '../types';

/**
 * Id del tag del tablero. Es un `User` con id propio y no un tag nuevo: el
 * tablero cuenta cuentas, así que se invalida por lo mismo que el listado —pero
 * hace falta distinguirlo para que un cambio en una cuenta suelta no lo tire.
 */
const RESUMEN = 'RESUMEN-SISTEMA';

/**
 * Los endpoints del panel del sistema (`docs/README_FRONT_SUPER_ADMIN.md`),
 * inyectados sobre el `baseApi`. **Todos piden rol `super_admin`.**
 *
 * El quinto —`GET /api/super-admin/usuarios`, todas las cuentas— no está acá: ya
 * vive en `@/features/usuarios` como `listarUsuarios`, porque es el mismo
 * listado que el del administrador con una columna más. Reusarlo es lo que hace
 * que las dos pantallas digan lo mismo de una cuenta.
 */
export const superAdminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * El tablero del sistema (§3).
     *
     * ⚠️ `store` puede venir `null` y la pantalla se dibuja igual: entrar a ver
     * si el sistema está bien y encontrarse una pantalla en blanco porque
     * Cloudinary está lento es exactamente lo contrario de lo que hace falta.
     */
    getResumenDelSistema: builder.query<ResumenDelSistema, void>({
      query: () => ({ url: '/super-admin/resumen', method: 'GET' }),
      responseSchema: resumenDelSistemaSchema,
      providesTags: [{ type: 'User', id: RESUMEN }],
    }),

    /**
     * La ficha completa de una cuenta (§5): quién le tocó qué, por qué, y **qué
     * cambios de rol admite hoy**.
     *
     * Comparte el tag `{ User, id }` con el listado y con la ficha del cliente:
     * es la misma cuenta, así que cargarle el DNI o cortarle el fiado desde el
     * otro apartado deja esta ficha al día sin que nadie lo coordine.
     *
     * Un id que no tiene forma de uuid da `400` antes de tocar la base.
     */
    getCuentaDelSistema: builder.query<CuentaDelSistema, string>({
      query: (cuentaId) => ({ url: `/super-admin/usuarios/${cuentaId}`, method: 'GET' }),
      responseSchema: cuentaDelSistemaSchema,
      providesTags: (_result, _error, cuentaId) => [{ type: 'User', id: cuentaId }],
    }),

    /**
     * **Mover a alguien de rol** (§6). El `motivo` es obligatorio, de 1 a 300
     * caracteres, y queda registrado en la auditoría.
     *
     * Devuelve `200` con **la ficha entera ya actualizada** —el rol nuevo, el
     * bloque `cambioDeRol` recién escrito y `rolesPosibles` recalculado—, así
     * que la respuesta se escribe directo en el cache en vez de invalidar la
     * ficha, que dispararía un GET para traer algo que ya está en la mano.
     *
     * Mandar el rol que la cuenta ya tiene devuelve `200` y **no hace nada**: no
     * escribe y no deja renglón en el historial. Igual, el botón se deshabilita
     * mientras el request está en vuelo.
     *
     * Errores que hay que mostrar tal cual (`{ message }`): `400` cambiarse el
     * rol a uno mismo, `409` último super admin, `409` cliente con facturas.
     */
    cambiarRol: builder.mutation<CuentaDelSistema, CambiarRolPayload>({
      query: ({ cuentaId, rol, motivo }) => ({
        url: `/super-admin/usuarios/${cuentaId}/rol`,
        method: 'PATCH',
        body: { rol, motivo },
      }),
      responseSchema: cuentaDelSistemaSchema,
      async onQueryStarted({ cuentaId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(superAdminApi.util.upsertQueryData('getCuentaDelSistema', cuentaId, data));
      },
      /**
       * Lo que sí cambió en otro lado: el listado muestra el rol en cada fila,
       * el tablero cuenta las cuentas por rol y el historial tiene un renglón
       * nuevo.
       *
       * ⚠️ **No se invalida `{ User, id: cuentaId }`**: esa es la ficha que
       * acabamos de escribir a mano con la respuesta.
       */
      invalidatesTags: [
        { type: 'User', id: 'LIST' },
        { type: 'User', id: RESUMEN },
        { type: 'Auditoria', id: 'LIST' },
      ],
    }),

    /**
     * El historial de los cambios de rol (§7).
     *
     * **No hay forma de escribir ni de borrar acá**: no existe el endpoint, y es
     * la mitad del punto — un registro que la app puede reescribir no prueba
     * nada.
     */
    listarAuditoria: builder.query<AuditoriaPagina, ListarAuditoriaParams | void>({
      query: (params) => ({
        url: '/super-admin/auditoria',
        method: 'GET',
        // `fetchBaseQuery` omite los `undefined` del query string, así que no
        // hace falta limpiarlos a mano.
        params: {
          accion: params?.accion,
          objetivoId: params?.objetivoId,
          actorId: params?.actorId,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: auditoriaPaginaSchema,
      providesTags: [{ type: 'Auditoria', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetResumenDelSistemaQuery,
  useGetCuentaDelSistemaQuery,
  useCambiarRolMutation,
  useListarAuditoriaQuery,
} = superAdminApi;
