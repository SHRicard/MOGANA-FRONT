import { memo } from 'react';
import { formatMonto } from '@/shared/utils';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import type { TicketFacturacion } from '../types';

export interface LoQueSeEmitioProps {
  datos: TicketFacturacion;
}

/**
 * Lo que se facturó en el mes, por **fecha de emisión** y sin las anuladas.
 *
 * **Las anuladas van aparte y solo si las hubo**: no están sumadas en lo
 * facturado porque son el error del mes, no su facturación. "Se emitieron 13 y
 * se anuló 1" es un dato que el administrador quiere ver; un renglón en cero,
 * no.
 *
 * El ticket promedio y la factura más alta son **raya y no cero** cuando no se
 * emitió nada: un "$0" ahí diría que las facturas salen gratis.
 */
function LoQueSeEmitioComponent({ datos }: LoQueSeEmitioProps) {
  const filas: FilaDeDatos[] = [
    {
      etiqueta: 'Clientes que compraron',
      valor: `${datos.clientes}`,
      detalle: datos.facturas === 1 ? '1 factura emitida' : `${datos.facturas} facturas emitidas`,
    },
    {
      etiqueta: 'Ticket promedio',
      valor: datos.ticketPromedio === null ? '—' : formatMonto(datos.ticketPromedio),
    },
    {
      etiqueta: 'La factura más alta',
      valor: datos.facturaMasAlta === null ? '—' : formatMonto(datos.facturaMasAlta),
    },
  ];

  if (datos.anuladas > 0) {
    filas.push({
      etiqueta: datos.anuladas === 1 ? 'Se anuló 1 factura' : `Se anularon ${datos.anuladas}`,
      valor: formatMonto(datos.montoAnulado),
      detalle: 'No está sumado en lo facturado',
      tono: 'error',
    });
  }

  return <TarjetaFilas titulo="Lo que se emitió" filas={filas} />;
}

export const LoQueSeEmitio = memo(LoQueSeEmitioComponent);
