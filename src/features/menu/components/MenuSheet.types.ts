export interface MenuSheetProps {
  /**
   * Lo controla quien lo monta (el navigator). El componente NO guarda si está
   * abierto: solo anima hacia el estado que le piden y avisa cuando se cierra.
   */
  visible: boolean;
  /** Se dispara al tocar el fondo o al usar el botón "atrás" de Android. */
  onClose: () => void;
}
