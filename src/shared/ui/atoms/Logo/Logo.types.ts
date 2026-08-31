export type LogoSize = 'sm' | 'md' | 'lg';

export interface LogoProps {
  /** Talle predefinido. Ignorado si pasás `width`. */
  size?: LogoSize;
  /** Ancho exacto en pt, para casos puntuales. El alto se calcula solo. */
  width?: number;
}
