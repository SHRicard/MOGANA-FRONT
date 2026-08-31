import { memo } from 'react';
import { EstadoBadge, type EstadoTono } from '@/shared/ui/atoms/EstadoBadge';
import {
  aEstadoDeCuenta,
  ESTADO_DE_CUENTA_LABEL,
  EstadosDeCuenta,
  type EstadoDeCuenta,
} from '../types';

export interface EstadoDeCuentaBadgeProps {
  /** El estado crudo de la API: `al_dia`, `pendiente`, `proxima_a_vencer`, `vencida`. */
  estado: string;
}

/**
 * Con qué tono se pinta cada estado. La escala va de "todo bien" a "ya se
 * pasó": verde → amarillo → naranja → rojo.
 *
 * Son los mismos tonos que usa el badge del tablero de facturación —es el mismo
 * semáforo en toda la app— y por eso el color vive en el theme y el dibujo en
 * `shared/ui/atoms/EstadoBadge`, no acá.
 */
const TONO: Record<EstadoDeCuenta, EstadoTono> = {
  [EstadosDeCuenta.AL_DIA]: 'ok',
  [EstadosDeCuenta.PENDIENTE]: 'espera',
  [EstadosDeCuenta.PROXIMA_A_VENCER]: 'pronto',
  [EstadosDeCuenta.VENCIDA]: 'tarde',
};

/**
 * Cómo está la **cuenta corriente** del cliente, como badge de color pleno.
 *
 * ⚠️ No es el estado de su cuenta de la app: ese dice si puede operar en el
 * teléfono y no tiene nada que ver con si debe plata.
 *
 * El texto va igual que el color —"Vencida", no solo rojo—: quien no distingue
 * rojo de naranja lo tiene que poder leer, y el lector de pantalla también. Un
 * estado que esta versión no conoce **no se dibuja**: es mejor no decir nada que
 * inventar un color.
 */
function EstadoDeCuentaBadgeComponent({ estado }: EstadoDeCuentaBadgeProps) {
  const conocido = aEstadoDeCuenta(estado);
  if (conocido === null) {
    return null;
  }

  return <EstadoBadge label={ESTADO_DE_CUENTA_LABEL[conocido]} tono={TONO[conocido]} />;
}

export const EstadoDeCuentaBadge = memo(EstadoDeCuentaBadgeComponent);
