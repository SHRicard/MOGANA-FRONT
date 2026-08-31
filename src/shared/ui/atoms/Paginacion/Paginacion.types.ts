export interface PaginacionProps {
  /** Página actual, desde 1. */
  pagina: number;
  /** Total de páginas. Con `<= 1` el componente no dibuja nada. */
  paginas: number;
  /**
   * A qué página ir. Es **un solo callback**: el componente ya sabe cuál es la
   * anterior, la siguiente y la que se tocó, así que quien lo usa solo tiene que
   * saber ir a un número.
   */
  onCambiar: (pagina: number) => void;
  /**
   * Qué se está paginando, para el lector de pantalla. Ej: "Páginas del listado
   * de clientes". Sin esto lee solo los números sueltos.
   */
  accessibilityLabel?: string;
}
