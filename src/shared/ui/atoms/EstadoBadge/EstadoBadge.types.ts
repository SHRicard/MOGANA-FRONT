/**
 * Los cinco tonos del semáforo, de "todo bien" a "ya se pasó", más el apagado.
 *
 * No son estados del dominio: son **colores con nombre**. Quién es `tarde` —una
 * factura vencida, una cuenta con algo vencido— lo decide la feature que usa el
 * badge, que es la única que sabe de facturas.
 */
export type EstadoTono = 'ok' | 'espera' | 'pronto' | 'tarde' | 'apagado';

export interface EstadoBadgeProps {
  /** El texto, ya escrito para mostrar: "Vencida", "Al día", "Vence pronto". */
  label: string;
  tono: EstadoTono;
}
