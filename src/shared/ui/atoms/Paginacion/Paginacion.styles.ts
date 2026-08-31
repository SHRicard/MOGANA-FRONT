import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/**
 * Alto de los dos botones. Es el mínimo táctil accesible (44) y acá se cumple
 * con el tamaño real, sin `hitSlop`: lo que se toca es el botón entero, que es
 * justamente la gracia de este modelo de paginado.
 */
export const ALTO_BOTON = 44;

/** Lado del botón cuando se queda sin espacio para la etiqueta: cuadrado. */
export const ANCHO_BOTON_COMPACTO = ALTO_BOTON;

/**
 * Ancho a partir del cual los botones muestran la palabra además de la flecha.
 *
 * Es una estimación, no una medición: "‹ Anterior" y "Siguiente ›" con su
 * relleno miden alrededor de 105 cada uno, y el contador del medio unos 55.
 * Redondeado para arriba da esto. Debajo de este ancho las palabras se caen y
 * quedan las dos flechas solas, que entran en cualquier pantalla.
 *
 * No se mide el texto de verdad porque el ancho depende de la tipografía del
 * sistema y del tamaño de fuente del usuario: el número acá está elegido con
 * aire de sobra para que en un celular de 360dp —el más angosto que se usa—
 * todavía entren las palabras.
 */
export const ANCHO_MINIMO_ETIQUETAS = 300;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /**
     * Los dos botones a los bordes y el contador en el medio. Sin fondo ni
     * borde propios: el paginado no es una caja, son dos acciones y un dato.
     */
    container: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    boton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      height: ALTO_BOTON,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    /** Sin etiqueta el botón es cuadrado, para que el círculo quede parejo. */
    botonCompacto: { width: ANCHO_BOTON_COMPACTO, paddingHorizontal: 0 },
    /**
     * En el borde del listado el botón no desaparece: se apaga. Si se fuera,
     * el que queda saltaría de lugar justo cuando se lo está por tocar.
     */
    botonApagado: { opacity: 0.4 },
    /** Feedback del toque: el tono suave de marca, el mismo de toda la app. */
    presionado: { backgroundColor: theme.colors.primaryMuted, borderColor: theme.colors.primary },

    /**
     * "3 de 12". Se lleva el espacio que sobra entre los botones y va centrado,
     * así los dos quedan siempre a la misma distancia de los bordes.
     */
    contador: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: theme.spacing.xxs,
    },
  });
