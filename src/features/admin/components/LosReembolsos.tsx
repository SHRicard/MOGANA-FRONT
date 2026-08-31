import { memo } from 'react';
import { formatMonto } from '@/shared/utils';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import type { ReembolsosDelCliente } from '../types';

export interface LosReembolsosProps {
  datos: ReembolsosDelCliente;
}

/**
 * La plata que va **para el otro lado**: cuando se anula una factura que ya
 * tenía cobros, esa plata entró pero no es tuya y hay que devolverla.
 *
 * ⚠️ Va separada de la deuda y con otro color **a propósito**: son dos cosas que
 * apuntan a lados contrarios y **no se restan una de otra**. Con `aReembolsar`
 * en más de cero hay alguien esperando que le devuelvan algo.
 *
 * La devolución en sí pasa **afuera del sistema** —efectivo, transferencia, lo
 * que sea— y en la app solo queda anotado que ya se hizo.
 */
function LosReembolsosComponent({ datos }: LosReembolsosProps) {
  const filas: FilaDeDatos[] = [
    {
      etiqueta: 'Falta devolverle',
      valor: formatMonto(datos.aReembolsar),
      detalle:
        datos.pendientes === 1
          ? '1 factura anulada con cobros'
          : `${datos.pendientes} facturas anuladas con cobros`,
      tono: datos.aReembolsar > 0 ? 'error' : undefined,
    },
    {
      etiqueta: 'Ya devuelto',
      valor: formatMonto(datos.montoDevuelto),
      detalle: datos.hechos === 1 ? '1 devolución' : `${datos.hechos} devoluciones`,
    },
  ];

  return (
    <TarjetaFilas
      titulo="Reembolsos"
      filas={filas}
      nota="Es plata que entró y no es tuya: va para el lado contrario de la deuda y no se resta de ella."
    />
  );
}

export const LosReembolsos = memo(LosReembolsosComponent);
