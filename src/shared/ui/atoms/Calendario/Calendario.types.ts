export interface CalendarioProps {
  /**
   * Día elegido, en formato de pantalla (`"17/09/2026"`). `null` o un texto a
   * medio escribir dejan el calendario sin selección, abierto en el mes en curso.
   */
  value?: string | null;
  /** Se llama con la fecha elegida, en el mismo formato. */
  onChange: (fecha: string) => void;
  /**
   * Primer día que se puede elegir. Los anteriores se dibujan apagados y no
   * responden al toque.
   */
  fechaMinima?: string;
  /**
   * Último día que se puede elegir. Los posteriores se dibujan apagados y no
   * responden al toque.
   */
  fechaMaxima?: string;
  /** Texto del lector de pantalla para toda la grilla. */
  accessibilityLabel?: string;
}
