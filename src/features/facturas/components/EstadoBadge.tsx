import { memo } from 'react';
import { EstadoBadge as Badge, type EstadoTono } from '@/shared/ui/atoms/EstadoBadge';
import { EstadosCuenta, EstadosFactura, labelDeEstado, type EstadoCualquiera } from '../types';

export interface EstadoBadgeProps {
  /** El de una factura (`pagada`) o el de una cuenta (`al_dia`). */
  estado: EstadoCualquiera;
}

/**
 * Con qué tono se pinta cada estado. La escala va de "todo bien" a "ya se
 * pasó": verde → amarillo → naranja → rojo.
 *
 * `anulada` es el único apagado: no es un punto de la escala de urgencia —una
 * factura dada de baja no hay que cobrarla ni vence—, así que se pinta neutra
 * para que no compita con las que sí hay que atender. Que se vea distinta al
 * resto es la idea.
 */
const TONO: Record<EstadoCualquiera, EstadoTono> = {
  [EstadosFactura.PENDIENTE]: 'espera',
  [EstadosFactura.PROXIMA_A_VENCER]: 'pronto',
  [EstadosFactura.VENCIDA]: 'tarde',
  /** Los dos "todo bien" comparten el verde: una factura saldada y un cliente al día. */
  [EstadosFactura.PAGADA]: 'ok',
  [EstadosCuenta.AL_DIA]: 'ok',
  [EstadosFactura.ANULADA]: 'apagado',
};

/**
 * Un estado como badge de color: sirve para el de **una factura** y para el de
 * **una cuenta**.
 *
 * Es el mismo componente para los dos porque es el mismo semáforo, y porque el
 * chip de un cliente y el de su factura más urgente tienen que coincidir: si se
 * pintaran por separado, se podrían separar.
 *
 * Lo que dibuja está en `shared/ui/atoms/EstadoBadge`, que no sabe de facturas.
 * Lo que vive acá es lo único que es del dominio: **qué estado va con qué
 * tono** y con qué palabra. Es lo que deja que la vista del cliente use el mismo
 * badge con sus propias palabras (`docs/user_cliente_flujo.md` §3).
 */
function EstadoBadgeComponent({ estado }: EstadoBadgeProps) {
  return <Badge label={labelDeEstado(estado)} tono={TONO[estado]} />;
}

export const EstadoBadge = memo(EstadoBadgeComponent);
