import { memo } from 'react';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import type { TicketClientes } from '../types';

export interface LaGenteDelMesProps {
  datos: TicketClientes;
}

/**
 * La gente que se movió en el mes.
 *
 * **Registrarse no es comprar**, y esa distinción es todo el punto del bloque:
 * alguien que se registró hace un año y recién ahora recibe su primera factura
 * es **nuevo para el negocio**; el que se registró y nunca compró todavía no lo
 * es. Los dos son datos, pero contestan cosas distintas — por eso los renglones
 * dicen qué cuenta cada uno en vez del nombre del campo.
 */
function LaGenteDelMesComponent({ datos }: LaGenteDelMesProps) {
  const filas: FilaDeDatos[] = [
    {
      etiqueta: 'Se registraron',
      valor: `${datos.registrados}`,
      detalle: 'Cuentas nuevas, hayan comprado o no',
    },
    {
      etiqueta: 'Compraron por primera vez',
      valor: `${datos.nuevos}`,
      detalle: 'Su primera factura cae en el mes',
    },
    { etiqueta: 'Compraron', valor: `${datos.compraron}` },
    { etiqueta: 'Pagaron algo', valor: `${datos.pagaron}` },
  ];

  return <TarjetaFilas titulo="La gente" filas={filas} />;
}

export const LaGenteDelMes = memo(LaGenteDelMesComponent);
