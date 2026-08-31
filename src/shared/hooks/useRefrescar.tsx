import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Cuánto se ve el spinner como mínimo, aunque la respuesta llegue antes.
 *
 * Sin esto, con buena conexión la rueda aparece y desaparece en el mismo cuadro:
 * se soltó el dedo y no pasó nada visible, así que la sensación es que el gesto
 * no funcionó y se vuelve a tirar. Medio segundo alcanza para que se lea como
 * "fue a buscar y volvió" sin que se sienta lento.
 */
const MINIMO_VISIBLE_MS = 500;

export interface Refresco {
  /**
   * `true` mientras dura el gesto. Sirve para apagar OTROS indicadores de carga
   * de la pantalla: la rueda de arriba ya está diciendo lo mismo, y dos spinners
   * a la vez se leen como que algo se colgó.
   */
  refrescando: boolean;
  /** Va tal cual en la prop `refreshControl` de un `ScrollView` o `FlatList`. */
  control: ReactElement<RefreshControlProps>;
}

/**
 * "Tirar para abajo para actualizar": el gesto de arrastrar desde arriba y
 * soltar, que vuelve a pedirle los datos a la API.
 *
 * Se le pasa **la función que trae los datos de nuevo** —el `refrescar` que
 * expone el hook de cada pantalla— y devuelve el control ya armado con los
 * colores del theme.
 *
 * ```tsx
 * const refresco = useRefrescar(tablero.refrescar);
 * <FlatList refreshControl={refresco.control} ... />
 * ```
 *
 * **La función tiene que devolver la promesa** de la request: es lo que hace que
 * la rueda se quede girando hasta que los datos llegan. Si devolviera antes, el
 * gesto se cortaría mientras la pantalla todavía muestra lo viejo.
 *
 * Devuelve un elemento y no un componente a propósito: `refreshControl` no
 * acepta cualquier cosa —React Native le inyecta props al montarlo— así que
 * envolverlo en un componente propio lo rompe.
 */
export function useRefrescar(refrescar: () => Promise<unknown> | void): Refresco {
  const theme = useTheme();
  const [refrescando, setRefrescando] = useState(false);

  // Se puede salir de la pantalla con el refresh en vuelo (tirar y volver
  // atrás). Sin esto, la respuesta llega y toca el estado de algo desmontado.
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const onRefrescar = useCallback(async () => {
    setRefrescando(true);
    const empezo = Date.now();

    try {
      await refrescar();
    } finally {
      // El error no se maneja acá: lo que falla es la query, y el cartel de
      // error de la pantalla ya sale del mismo hook. Lo único que hay que hacer
      // igual es bajar la rueda, y para eso está el `finally`.
      const falta = MINIMO_VISIBLE_MS - (Date.now() - empezo);
      if (falta > 0) {
        await new Promise<void>((listo) => {
          setTimeout(listo, falta);
        });
      }
      if (montado.current) {
        setRefrescando(false);
      }
    }
  }, [refrescar]);

  const control = useMemo(
    () => (
      <RefreshControl
        refreshing={refrescando}
        onRefresh={onRefrescar}
        // iOS pinta una rueda de un solo color...
        tintColor={theme.colors.primary}
        // ...y Android un círculo que va rotando por los colores de la lista.
        colors={[theme.colors.primary]}
        progressBackgroundColor={theme.colors.surface}
      />
    ),
    [refrescando, onRefrescar, theme],
  );

  return { refrescando, control };
}
