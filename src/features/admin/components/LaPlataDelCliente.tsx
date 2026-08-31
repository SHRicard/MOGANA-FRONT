import { memo } from 'react';
import { formatMonto } from '@/shared/utils';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import { textoVencimientoMasViejo, type PlataDelCliente } from '../types';

export interface LaPlataDelClienteProps {
  datos: PlataDelCliente;
}

/**
 * Cuánto mueve y cuánto debe.
 *
 * La deuda va partida en dos porque son cosas distintas: **lo vencido es lo que
 * hay que ir a cobrar** y lo por vencer es plata en camino. Pintar toda la deuda
 * de rojo haría que un cliente que compró ayer se vea como un moroso.
 */
function LaPlataDelClienteComponent({ datos }: LaPlataDelClienteProps) {
  const cuandoVence = textoVencimientoMasViejo(datos.diasDelMasViejo);

  const filas: FilaDeDatos[] = [
    { etiqueta: 'Facturado', valor: formatMonto(datos.facturado) },
    { etiqueta: 'Cobrado', valor: formatMonto(datos.cobrado) },
    {
      etiqueta: 'Debe hoy',
      valor: formatMonto(datos.deuda),
      detalle: cuandoVence ?? undefined,
    },
    {
      etiqueta: 'Vencido',
      valor: formatMonto(datos.vencido),
      // Rojo solo si hay algo pasado de fecha: es lo que pide una llamada.
      tono: datos.vencido > 0 ? 'statusLate' : undefined,
    },
    { etiqueta: 'Por vencer', valor: formatMonto(datos.porVencer) },
    {
      etiqueta: 'Ticket promedio',
      // `null` sin facturas: un "$0" diría que compra y no gasta nada.
      valor: datos.ticketPromedio === null ? '—' : formatMonto(datos.ticketPromedio),
      detalle: 'Lo que gasta por compra',
    },
  ];

  return <TarjetaFilas titulo="Su plata" filas={filas} />;
}

export const LaPlataDelCliente = memo(LaPlataDelClienteComponent);
