import { memo } from 'react';
import { formatMonto } from '@/shared/utils';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import type { GlobalMetricas } from '../types';

export interface ResumenGlobalProps {
  datos: GlobalMetricas;
}

/**
 * Desde que existe el negocio. Tampoco lo mueve el mes elegido.
 *
 * `totalFacturado − totalCobrado` tiene que dar exactamente la plata en la
 * calle: son los dos extremos de la misma cuenta, y por eso van en la misma
 * pantalla.
 *
 * **`aReembolsar` va en color de alerta cuando hay algo**: es plata que se cobró
 * en facturas que después se anularon y que todavía no se devolvió. Va para el
 * otro lado — hay clientes esperando.
 */
function ResumenGlobalComponent({ datos }: ResumenGlobalProps) {
  const filas: FilaDeDatos[] = [
    { etiqueta: 'Facturado', valor: formatMonto(datos.totalFacturado) },
    { etiqueta: 'Cobrado', valor: formatMonto(datos.totalCobrado) },
    {
      etiqueta: 'Ticket promedio',
      // `null` mientras no se haya emitido ninguna factura: un "$ 0" ahí diría
      // que las facturas salen gratis.
      valor: datos.ticketPromedio === null ? '—' : formatMonto(datos.ticketPromedio),
    },
    {
      etiqueta: 'Facturas',
      valor: `${datos.facturas}`,
      detalle: `${datos.facturasPagadas} pagadas · ${datos.facturasVencidas} vencidas · ${datos.facturasAnuladas} anuladas`,
    },
  ];

  // Solo si hay algo que devolver. En cero no es una métrica, es ruido.
  if (datos.aReembolsar > 0) {
    filas.push({
      etiqueta: 'A reembolsar',
      valor: formatMonto(datos.aReembolsar),
      detalle: 'Cobrado en facturas anuladas. No es tuyo.',
      tono: 'error',
    });
  }

  return <TarjetaFilas titulo="Desde que abrió" filas={filas} />;
}

export const ResumenGlobal = memo(ResumenGlobalComponent);
