import { memo } from 'react';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import type { FacturasDelCliente } from '../types';

export interface LasFacturasDelClienteProps {
  datos: FacturasDelCliente;
}

/**
 * Cuántas facturas tiene y cómo están.
 *
 * ⚠️ **Activas no es lo mismo que vencidas.** Un cliente con diez activas y cero
 * vencidas está perfecto: compró y todavía está en plazo. El que preocupa es el
 * que tiene vencidas.
 *
 * Las anuladas **solo se muestran si las hubo** y van al final: son facturas que
 * no existieron —no suman al total, ni a la deuda, ni a la tasa— y un renglón en
 * cero las haría parecer parte de la cuenta.
 */
function LasFacturasDelClienteComponent({ datos }: LasFacturasDelClienteProps) {
  const filas: FilaDeDatos[] = [
    {
      etiqueta: 'Abiertas',
      valor: `${datos.activas}`,
      detalle: 'Todavía deben algo, vencidas o no',
    },
    {
      etiqueta: 'Vencidas',
      valor: `${datos.vencidas}`,
      detalle: 'De las abiertas, las que ya se pasaron',
      tono: datos.vencidas > 0 ? 'statusLate' : undefined,
    },
    { etiqueta: 'Pagadas', valor: `${datos.pagadas}` },
    { etiqueta: 'En total', valor: `${datos.total}`, detalle: 'Abiertas más pagadas' },
  ];

  if (datos.anuladas > 0) {
    filas.push({
      etiqueta: 'Anuladas',
      valor: `${datos.anuladas}`,
      detalle: 'No cuentan para nada más',
    });
  }

  return <TarjetaFilas titulo="Sus facturas" filas={filas} />;
}

export const LasFacturasDelCliente = memo(LasFacturasDelClienteComponent);
