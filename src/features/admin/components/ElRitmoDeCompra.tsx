import { memo } from 'react';
import { formatFecha } from '@/shared/utils';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import { formatDias, formatPromedio, type ComprasDelCliente } from '../types';

export interface ElRitmoDeCompraProps {
  datos: ComprasDelCliente;
}

/**
 * Cada cuánto vuelve.
 *
 * ⚠️ **Los días sin comprar se leen contra cada cuánto compra, nunca solos.** Uno
 * que compra cada 30 días y hace 40 que no aparece recién se está demorando;
 * uno que compra cada 5 y hace 40 que no aparece **ya se fue**. Ese contraste es
 * toda la información, así que los dos números van pegados en el mismo renglón.
 *
 * La app no decide cuál de los dos casos es: muestra los dos números juntos y la
 * conclusión la saca quien conoce a su cliente.
 */
function ElRitmoDeCompraComponent({ datos }: ElRitmoDeCompraProps) {
  const filas: FilaDeDatos[] = [
    {
      etiqueta: 'Hace que no compra',
      valor: formatDias(datos.diasSinComprar),
      detalle:
        datos.diasEntreCompras === null
          ? 'Compró una sola vez'
          : `Compra cada ${formatDias(datos.diasEntreCompras)}`,
    },
    {
      etiqueta: 'Compras por mes',
      // `null` con menos de 30 días de cliente: tres compras en cuatro días no
      // son "22 por mes".
      valor: formatPromedio(datos.comprasPorMes),
    },
    {
      etiqueta: 'Primera compra',
      valor: datos.primeraCompra === null ? '—' : formatFecha(datos.primeraCompra),
      detalle:
        datos.antiguedadDias === null ? undefined : `Hace ${formatDias(datos.antiguedadDias)}`,
    },
    {
      etiqueta: 'Última compra',
      valor: datos.ultimaCompra === null ? '—' : formatFecha(datos.ultimaCompra),
    },
  ];

  return <TarjetaFilas titulo="Cada cuánto vuelve" filas={filas} />;
}

export const ElRitmoDeCompra = memo(ElRitmoDeCompraComponent);
