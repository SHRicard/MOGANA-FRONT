import type { ReactNode } from 'react';
import type { ButtonVariant } from '@/shared/ui/atoms/Button';

/**
 * De qué habla el diálogo. Solo decide el color del círculo del ícono: el resto
 * de la tarjeta se ve igual siempre, para que la app no tenga cuatro diálogos
 * distintos.
 */
export type DialogoTono = 'exito' | 'info' | 'peligro';

/** Un botón del pie. Es la misma forma que las props del atom `Button`. */
export interface DialogoAccion {
  label: string;
  onPress: () => void;
  /** Por defecto `primary` en la primera acción y `secondary` en el resto. */
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** Lo que se ve, sea o no un diálogo de bloqueo. */
interface DialogoBase {
  visible: boolean;
  titulo: string;
  /** Una línea explicando qué pasó o qué se va a hacer. */
  descripcion?: string;
  /** Por defecto `info`. */
  tono?: DialogoTono;
  /**
   * El ícono de arriba, ya armado (como en `EmptyState`): quien lo usa elige el
   * dibujo y su color. El tamaño sale de `DIALOGO_ICON_SIZE`.
   */
  icono?: ReactNode;
  /** Contenido libre entre la descripción y los botones: un resumen, una lista. */
  children?: ReactNode;
  /** Los botones del pie, en orden. Dos como mucho: más es un menú, no un diálogo. */
  acciones?: readonly DialogoAccion[];
}

/**
 * El caso normal: **siempre hay una forma de salir sin elegir**, el toque en el
 * fondo y el "atrás" de Android. Por eso `onClose` es obligatorio.
 */
export interface DialogoConSalida extends DialogoBase {
  bloqueante?: false;
  onClose: () => void;
  /**
   * Si tocar el fondo cierra. `false` para una confirmación que no se puede
   * saltear sin decidir; el "atrás" de Android sigue funcionando igual.
   */
  cerrarAlTocarFondo?: boolean;
}

/**
 * El caso de **bloqueo**: no se cierra solo. Ni el fondo ni el "atrás" tienen
 * efecto —el "atrás" se consume igual, así que tampoco navega hacia atrás con
 * el diálogo encima— y por eso no lleva `onClose`.
 *
 * ⚠️ Es la excepción, no una variante más: sirve cuando la app **no puede
 * seguir** hasta que la persona resuelva algo (completar su perfil). Sus
 * `acciones` son la única salida, así que **una de ellas tiene que resolver o
 * dejar salir** —guardar, o cerrar sesión—: un bloqueo sin salida no es un
 * diálogo, es una app trabada.
 */
export interface DialogoBloqueante extends DialogoBase {
  bloqueante: true;
  /** No va: en un bloqueo no hay "cerrar sin elegir". */
  onClose?: never;
  /** No va: el fondo nunca cierra un bloqueo. */
  cerrarAlTocarFondo?: never;
}

export type DialogoProps = DialogoConSalida | DialogoBloqueante;
