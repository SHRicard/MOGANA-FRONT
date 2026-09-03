import { baseApi } from '@/services/api';
import {
  usuarioSchema,
  usuariosPaginaSchema,
  type CambiarFiadoPayload,
  type CargarDniPayload,
  type ListarClientesParams,
  type ListarUsuariosParams,
  type Usuario,
  type UsuariosPagina,
} from '../types';

/**
 * Tags del listado. `id: 'LIST'` y no el tag pelado: `/users/me` provee `'User'`
 * sin id, y sin distinguirlos una invalidación de la sesión se llevaría también
 * el listado (y al revés).
 */
const provideListado = (result: UsuariosPagina | undefined) => [
  { type: 'User' as const, id: 'LIST' },
  ...(result?.datos ?? []).map((usuario) => ({ type: 'User' as const, id: usuario.id })),
];

/**
 * Endpoints del apartado Administrador, inyectados sobre el `baseApi`.
 *
 * Son **dos listados con la misma respuesta**, uno por rol (`docs/s.roles.md`):
 * el administrador ve clientes, el super admin ve todas las cuentas. Cuál se
 * llama lo decide `useListadoUsuarios`.
 *
 * 🚧 De la cuenta en sí es **casi solo lectura**: crear, editar y desactivar no
 * existen del lado del backend. Desde acá se le cambian a un cliente la marca de
 * fiado y el DNI; facturarle vive en `@/features/facturas`, y **cambiarle el
 * rol** en `@/features/super-admin`, que es el único que tiene ese endpoint.
 */
export const usuariosApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Clientes de la app. Roles `administrador` y `super_admin`.
     *
     * **Solo devuelve clientes**: no hay forma de que este panel muestre cuentas
     * privilegiadas — pedir por id la de un administrador da `404`.
     *
     * Está pensado para llamarse **mientras la persona tipea**, con debounce del
     * lado del hook. Cada combinación de params es una entrada de cache distinta:
     * volver a una página ya vista no vuelve a pegarle a la API.
     */
    listarClientes: builder.query<UsuariosPagina, ListarClientesParams | void>({
      query: (params) => ({
        url: '/admin/clientes',
        method: 'GET',
        // `fetchBaseQuery` omite los `undefined` del query string, así que no
        // hace falta limpiarlos a mano. El `|| undefined` del `q` es para que un
        // texto vacío no viaje como `q=`.
        params: {
          q: params?.q || undefined,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: usuariosPaginaSchema,
      providesTags: provideListado,
    }),

    /**
     * La ficha de un cliente. Roles `administrador` y `super_admin`.
     *
     * ⚠️ **Solo existen los clientes acá adentro**: pedir por id la cuenta de un
     * administrador da `404`, igual que al facturar (`docs/s.roles.md`).
     *
     * Comparte el tag con el listado: la fila que ya se vio y la ficha son la
     * misma cuenta, así que se invalidan juntas.
     */
    getCliente: builder.query<Usuario, string>({
      query: (clienteId) => ({ url: `/admin/clientes/${clienteId}`, method: 'GET' }),
      responseSchema: usuarioSchema,
      providesTags: (_result, _error, clienteId) => [{ type: 'User', id: clienteId }],
    }),

    /**
     * Cortarle el fiado a un cliente, o devolvérselo
     * (`docs/bloquear_fiado.md`).
     *
     * Es **una marca, no una traba**: el backend sigue aceptando facturarle a
     * plazo. Sirve para que el que atiende sepa a quién no dejarle llevar
     * mercadería a cuenta.
     *
     * ⚠️ El `motivo` es **obligatorio al bloquear** y se ignora al desbloquear
     * (ahí el backend borra el que había).
     *
     * Devuelve el cliente entero, así que invalida su ficha y el listado. Y
     * también los tags de facturación: la marca se muestra en el tablero y en la
     * cuenta, que son del otro feature pero leen el mismo cliente.
     */
    cambiarFiado: builder.mutation<Usuario, CambiarFiadoPayload>({
      query: ({ clienteId, seLeFia, motivo }) => ({
        url: `/admin/clientes/${clienteId}/fiado`,
        method: 'PATCH',
        // El motivo solo cuando se bloquea: mandarlo al devolver el fiado
        // confunde al leer el log, y el backend lo ignora igual.
        body: seLeFia ? { seLeFia } : { seLeFia, motivo },
      }),
      responseSchema: usuarioSchema,
      invalidatesTags: (_result, _error, { clienteId }) => [
        { type: 'User', id: clienteId },
        { type: 'User', id: 'LIST' },
        { type: 'Factura', id: 'LIST' },
        { type: 'Factura', id: `CLIENTE-${clienteId}` },
      ],
    }),

    /**
     * Cargar o corregir el DNI de un cliente, con la persona enfrente
     * (`docs/flujo_login.md`).
     *
     * Es la única forma de arreglar un documento mal tipeado: desde la app el
     * cliente no puede cambiarlo —el segundo intento le da `409`—. También sirve
     * para completarle la ficha a quien nunca abrió la app.
     *
     * Devuelve la ficha ya en `estado: "activo"`. Invalida lo mismo que el
     * fiado: este cliente se muestra en el listado, en el tablero y en la cuenta.
     *
     * Errores: `404` si ese cliente no existe, `409` si el documento ya está en
     * otra cuenta (*"Revisá si el cliente está registrado dos veces"*).
     */
    cargarDni: builder.mutation<Usuario, CargarDniPayload>({
      query: ({ clienteId, dni, motivo }) => ({
        url: `/admin/clientes/${clienteId}/dni`,
        method: 'PATCH',
        body: { dni, motivo },
      }),
      responseSchema: usuarioSchema,
      invalidatesTags: (_result, _error, { clienteId }) => [
        { type: 'User', id: clienteId },
        { type: 'User', id: 'LIST' },
        { type: 'Factura', id: 'LIST' },
        { type: 'Factura', id: `CLIENTE-${clienteId}` },
      ],
    }),

    /** Todas las cuentas, con los tres roles. Solo `super_admin`. */
    listarUsuarios: builder.query<UsuariosPagina, ListarUsuariosParams | void>({
      query: (params) => ({
        url: '/super-admin/usuarios',
        method: 'GET',
        params: {
          q: params?.q || undefined,
          rol: params?.rol,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: usuariosPaginaSchema,
      providesTags: provideListado,
    }),
  }),
});

export const {
  useCambiarFiadoMutation,
  useCargarDniMutation,
  useListarClientesQuery,
  useLazyListarClientesQuery,
  useGetClienteQuery,
  useListarUsuariosQuery,
  useLazyListarUsuariosQuery,
} = usuariosApi;
