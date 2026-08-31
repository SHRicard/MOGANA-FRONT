import { memo } from 'react';
import { formatMonto } from '@/shared/utils';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import type { TicketCobranza } from '../types';

export interface LoQueEntroProps {
  datos: TicketCobranza;
}

/**
 * La plata que entró en el mes, contada por **fecha del cobro**: un pago de
 * julio contra una factura de marzo entró en julio.
 *
 * **La misma plata va partida de dos maneras**, y cada partición suma lo mismo:
 *
 *  - de este mes / de meses anteriores → ¿estoy cobrando al día o viviendo de
 *    recuperar lo viejo?
 *  - en término / fuera de término → de lo que entró, ¿cuánto llegó tarde?
 *
 * Por eso los cuatro números juntos suman el doble de lo cobrado, y por eso la
 * nota del pie está: sin ella parece una cuenta que no cierra.
 *
 * **Lo cobrado en facturas anuladas no está en `cobrado`** y solo se muestra si
 * hubo: entró de verdad, pero hay que devolverlo.
 */
function LoQueEntroComponent({ datos }: LoQueEntroProps) {
  const filas: FilaDeDatos[] = [
    { etiqueta: 'De este mes', valor: formatMonto(datos.deEsteMes) },
    { etiqueta: 'De meses anteriores', valor: formatMonto(datos.deMesesAnteriores) },
    { etiqueta: 'En término', valor: formatMonto(datos.enTermino) },
    {
      etiqueta: 'Fuera de término',
      valor: formatMonto(datos.fueraDeTermino),
      // Rojo solo si llegó algo tarde: en cero no hay nada que mirar.
      tono: datos.fueraDeTermino > 0 ? 'statusLate' : undefined,
    },
    {
      etiqueta: 'Cobro promedio',
      // `null` sin cobros: el promedio de cero pagos no existe.
      valor: datos.cobroPromedio === null ? '—' : formatMonto(datos.cobroPromedio),
      detalle:
        datos.cobros === 1
          ? '1 cobro'
          : `${datos.cobros} cobros de ${datos.clientes} ${
              datos.clientes === 1 ? 'cliente' : 'clientes'
            }`,
    },
  ];

  if (datos.cobradoEnAnuladas > 0) {
    filas.push({
      etiqueta: 'Cobrado en facturas anuladas',
      valor: formatMonto(datos.cobradoEnAnuladas),
      detalle: 'Hay que devolverlo: no es tuyo',
      tono: 'error',
    });
  }

  return (
    <TarjetaFilas
      titulo="De lo que entró"
      filas={filas}
      nota={
        datos.cobrado > 0
          ? 'Son dos maneras de partir la misma plata, así que cada par suma lo cobrado.'
          : undefined
      }
    />
  );
}

export const LoQueEntro = memo(LoQueEntroComponent);
