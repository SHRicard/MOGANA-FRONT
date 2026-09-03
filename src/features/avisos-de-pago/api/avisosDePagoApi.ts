import { baseApi } from '@/services/api';
import {
  avisoDePagoSchema,
  avisosDePagoPaginaSchema,
  type AvisoDePago,
  type AvisosDePagoPagina,
  type ConfirmarAvisoPayload,
  type ListarAvisosDePagoParams,
  type RechazarAvisoPayload,
} from '../types';
import { AVISOS_DE_PAGO } from './tags';

/**
 * Los endpoints de la **bandeja de avisos de pago** del panel
 * (`MORGANA-BACK/docs/flujo_comprobantes.md`), inyectados sobre el `baseApi`.
 *
 * Los tres son **solo de administración**: el backend los tiene detrás de
 * `@Roles('administrador', 'super_admin')`, así que a un cliente le contestan
 * `403`. Por eso el hook expone `sinPermiso` en vez de tratar ese caso como un
 * error de red.
 *
 * ⚠️ **Confirmar mueve plata; rechazar no.** Confirmar anota un cobro y baja la
 * deuda del cliente; rechazar deja la factura como estaba y solo escribe el
 * motivo. De ahí sale qué invalida cada uno.
 */
export const avisosDePagoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * La bandeja. **Sin `estado` trae los pendientes**, que es para lo que se
     * abre la pantalla; `confirmado` y `rechazado` son el archivo.
     *
     * El más viejo primero: es el que hace más que espera.
     *
     * `pendientes` viene del **filtro entero**, no de la página, así que sirve
     * de globito aunque se esté mirando el archivo.
     */
    listarAvisosDePago: builder.query<AvisosDePagoPagina, ListarAvisosDePagoParams | void>({
      query: (params) => ({
        url: '/admin/pagos-informados',
        method: 'GET',
        // `fetchBaseQuery` omite los `undefined`, así que un filtro sin poner
        // no viaja en la query.
        params: {
          estado: params?.estado,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: avisosDePagoPaginaSchema,
      providesTags: [{ type: 'Factura', id: AVISOS_DE_PAGO }],
    }),

    /**
     * **Confirmar**: anotar el cobro de verdad.
     *
     * Invalida la bandeja **y la factura**: el aviso sale de pendientes y, del
     * otro lado, esa factura acaba de bajar su saldo. Sin lo segundo, entrar a
     * la factura después de confirmar mostraría la deuda vieja.
     */
    confirmarAviso: builder.mutation<AvisoDePago, ConfirmarAvisoPayload>({
      query: ({ avisoId, datos }) => ({
        url: `/admin/pagos-informados/${avisoId}/confirmar`,
        method: 'POST',
        body: datos,
      }),
      responseSchema: avisoDePagoSchema,
      invalidatesTags: (result) => [
        { type: 'Factura', id: AVISOS_DE_PAGO },
        ...(result ? [{ type: 'Factura' as const, id: result.factura.id }] : []),
      ],
    }),

    /**
     * **Rechazar**: el pago no apareció, o no es el que dice.
     *
     * Invalida **solo la bandeja**: la factura no se tocó, así que refrescarla
     * mostraría el mismo número y sería una request al pedo.
     *
     * ⚠️ Rechazar **borra la imagen** del comprobante del lado del backend. El
     * motivo queda escrito igual, y es lo único que el cliente va a ver.
     */
    rechazarAviso: builder.mutation<AvisoDePago, RechazarAvisoPayload>({
      query: ({ avisoId, datos }) => ({
        url: `/admin/pagos-informados/${avisoId}/rechazar`,
        method: 'POST',
        body: datos,
      }),
      responseSchema: avisoDePagoSchema,
      invalidatesTags: [{ type: 'Factura', id: AVISOS_DE_PAGO }],
    }),
  }),
});

export const { useListarAvisosDePagoQuery, useConfirmarAvisoMutation, useRechazarAvisoMutation } =
  avisosDePagoApi;
