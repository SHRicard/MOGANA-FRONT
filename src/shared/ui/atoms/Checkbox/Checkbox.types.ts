/**
 * Estado de la casilla.
 *
 * `indeterminado` no es un tercer valor del dato: es lo que muestra una casilla
 * de "todos" cuando hay **algunos** tildados abajo. Sin él, un "seleccionar
 * todo" vacío y uno a medias se ven igual.
 */
export type CheckboxEstado = boolean | 'indeterminado';

export interface CheckboxProps {
  /** `true`, `false` o `'indeterminado'` para el "algunos". */
  checked: CheckboxEstado;
  /** Se llama con lo que pasa a valer: desde `'indeterminado'` pasa a `true`. */
  onChange: (checked: boolean) => void;
  /**
   * El texto al lado. Opcional: en una lista la casilla suele ir sola y quien
   * la describe es la fila.
   */
  label?: string;
  disabled?: boolean;
  /**
   * Qué se está tildando, para el lector de pantalla. **Obligatorio sin
   * `label`**: una casilla sola no dice nada, y "casilla, no marcada" en una
   * lista de veinte filas es inútil.
   */
  accessibilityLabel?: string;
  testID?: string;
}
