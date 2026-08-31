import { memo } from 'react';
import { EstadosFactura, type EstadoFactura } from '@/features/facturas';
import { EstadoBadge, type EstadoTono } from '@/shared/ui/atoms/EstadoBadge';
import { ESTADO_DE_MI_FACTURA } from '../types';

export interface EstadoDeMiFacturaProps {
  estado: EstadoFactura;
}

/**
 * Con qué tono se pinta cada estado. Es **el mismo semáforo que ve el
 * administrador** —verde → amarillo → naranja → rojo— porque es el mismo dato:
 * si se pintaran por separado, se podrían separar, y los dos lados del
 * mostrador dejarían de hablar de lo mismo por teléfono (§3 del doc).
 */
const TONO: Record<EstadoFactura, EstadoTono> = {
  [EstadosFactura.PENDIENTE]: 'espera',
  [EstadosFactura.PROXIMA_A_VENCER]: 'pronto',
  [EstadosFactura.VENCIDA]: 'tarde',
  [EstadosFactura.PAGADA]: 'ok',
  /** Apagada: no hay que pagarla y no vence, así que sale de la escala. */
  [EstadosFactura.ANULADA]: 'apagado',
};

/**
 * En qué estado está una factura mía.
 *
 * Lo único que cambia contra el badge del panel es **una palabra**: acá dice
 * "Vence pronto" y allá "Por vencer". A quien tiene que pagar se le dice
 * cuándo, no en qué casillero del tablero cayó.
 *
 * ⚠️ **Un pago parcial no cambia el estado.** La factura de la que se cobró la
 * mitad y venció ayer sigue `vencida`: el estado dice si hay que pagar, y cuánto
 * lo dice el saldo.
 */
function EstadoDeMiFacturaComponent({ estado }: EstadoDeMiFacturaProps) {
  return <EstadoBadge label={ESTADO_DE_MI_FACTURA[estado]} tono={TONO[estado]} />;
}

export const EstadoDeMiFactura = memo(EstadoDeMiFacturaComponent);
