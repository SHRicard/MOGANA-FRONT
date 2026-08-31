import { baseApi } from '@/services/api';
import {
  catalogoEspeciesSchema,
  especieSchema,
  type CatalogoEspecies,
  type Especie,
  type ListarEspeciesParams,
  type NombreDeEspeciePayload,
  type RenombrarEspeciePayload,
} from '../types';

/** El catálogo entero. Es una sola entrada de cache: no hay paginado ni filtros. */
const TAG_CATALOGO = { type: 'Especie' as const, id: 'LIST' };

/**
 * El catálogo de especies (`docs/flujo_especies.md`).
 *
 * Solo administrador y super admin: al cliente le contesta `403`. En su factura
 * ve la especie de cada renglón y nada más.
 *
 * ⚠️ **Hay un quinto camino que no está acá**: crear una especie **dentro** del
 * alta de una factura, mandándola en el renglón que la necesita. Eso viaja en
 * el body de la factura (`facturasApi`), en la misma transacción — si la
 * factura falla, la especie no queda dando vueltas.
 */
export const especiesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * `GET /api/admin/especies` — el catálogo entero, alfabético.
     *
     * **Sin paginado y sin `q`**: viene completo de una vez y el filtrado se
     * hace en memoria (`filtrarEspecies`). Buscar del lado del servidor sería
     * una consulta por tecla para recortar una lista que ya está en el teléfono.
     */
    listarEspecies: builder.query<CatalogoEspecies, ListarEspeciesParams | void>({
      query: (params) => ({
        url: '/admin/especies',
        method: 'GET',
        // `undefined` no viaja: sin búsqueda, la query sale limpia.
        params: { q: params?.q || undefined },
      }),
      responseSchema: catalogoEspeciesSchema,
      providesTags: [TAG_CATALOGO],
    }),

    /**
     * `POST /api/admin/especies` — crea una especie desde el catálogo.
     *
     * `409` si ya existe una que se escribe igual una vez normalizada:
     * "Gaseosa", "gaseosa " y "Gaséosa" son la misma.
     */
    crearEspecie: builder.mutation<Especie, NombreDeEspeciePayload>({
      query: (datos) => ({ url: '/admin/especies', method: 'POST', body: datos }),
      responseSchema: especieSchema,
      invalidatesTags: [TAG_CATALOGO],
    }),

    /**
     * `PATCH /api/admin/especies/:id` — le cambia el nombre.
     *
     * ⚠️ **Cambia también en las facturas viejas**, y es a propósito: la especie
     * es una clasificación, no lo que se cobró. Por eso invalida además las
     * facturas: el renglón de una factura de marzo ya está mostrando este
     * nombre en pantalla.
     */
    renombrarEspecie: builder.mutation<Especie, RenombrarEspeciePayload>({
      query: ({ id, nombre }) => ({
        url: `/admin/especies/${id}`,
        method: 'PATCH',
        body: { nombre },
      }),
      responseSchema: especieSchema,
      invalidatesTags: [TAG_CATALOGO, { type: 'Factura', id: 'LIST' }],
    }),

    /**
     * `DELETE /api/admin/especies/:id` — borra una que **no se usó nunca**.
     *
     * `409` si está en algún renglón, con el texto ya redactado. No hace falta
     * llegar hasta ahí: el listado trae `usos`, así que el botón se apaga antes.
     */
    borrarEspecie: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/especies/${id}`, method: 'DELETE' }),
      invalidatesTags: [TAG_CATALOGO],
    }),
  }),
});

export const {
  useListarEspeciesQuery,
  useCrearEspecieMutation,
  useRenombrarEspecieMutation,
  useBorrarEspecieMutation,
} = especiesApi;
