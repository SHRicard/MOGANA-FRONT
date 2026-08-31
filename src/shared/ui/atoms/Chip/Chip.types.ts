/**
 * Tono del chip cuando NO está seleccionado.
 *
 * No tiene tonos de estado: un estado que hay que ver de un vistazo se dibuja
 * como badge de color pleno, no como un chip apenas teñido (ver
 * `EstadoBadge` y los tokens `status*` del theme).
 */
export type ChipTone = 'neutral' | 'brand' | 'warning' | 'danger';

export interface ChipProps {
  label: string;
  /**
   * `brand` para lo que identifica, `warning` para un dato que FALTA y alguien
   * puede completar (el DNI de un cliente), `danger` para una advertencia sobre
   * el cliente mismo (que no se le fía), `neutral` para el resto.
   *
   * La diferencia entre los dos últimos importa: ámbar es "falta algo", rojo es
   * "cuidado con esta persona". Se pueden dar juntos en la misma fila.
   */
  tone?: ChipTone;
  /**
   * Con `onPress` el chip es un filtro tocable. Sin él es informativo: solo
   * etiqueta un dato de la fila.
   */
  onPress?: () => void;
  /** Filtro activo. Solo tiene sentido junto con `onPress`. */
  selected?: boolean;
  /** Texto del lector de pantalla. Por defecto usa `label`. */
  accessibilityLabel?: string;
}
