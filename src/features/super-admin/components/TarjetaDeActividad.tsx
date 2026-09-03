import { memo } from 'react';
import { formatFechaHora } from '@/shared/utils';
import type { ResumenDelSistema } from '../types';
import { Dato } from './Dato';
import { Tarjeta } from './Tarjeta';

export interface TarjetaDeActividadProps {
  actividad: ResumenDelSistema['actividad'];
}

/**
 * **Quién entró** (§3).
 *
 * ⚠️ Los textos dicen **"entradas"** y no "usuarios activos", y no es un detalle
 * de redacción: el número sale de `lastLoginAt`, o sea de los *logins*. Quien
 * deja la sesión abierta y usa la app todos los días sin volver a loguearse no
 * aparece acá. Llamarlo "usuarios activos" prometería otra cosa y haría que
 * alguien tome una decisión con un número que mide otra.
 */
function TarjetaDeActividadComponent({ actividad }: TarjetaDeActividadProps) {
  return (
    <Tarjeta titulo="Entradas" bajada="Se cuentan los logins, no el uso de la app">
      <Dato etiqueta="Entraron en los últimos 7 días" valor={String(actividad.activos7)} />
      <Dato etiqueta="Entraron en los últimos 30 días" valor={String(actividad.activos30)} />
      <Dato etiqueta="Nunca entraron" valor={String(actividad.nuncaEntraron)} />
      <Dato
        etiqueta="Último ingreso"
        valor={
          actividad.ultimoIngreso ? formatFechaHora(actividad.ultimoIngreso) : 'Todavía ninguno'
        }
      />
    </Tarjeta>
  );
}

export const TarjetaDeActividad = memo(TarjetaDeActividadComponent);
