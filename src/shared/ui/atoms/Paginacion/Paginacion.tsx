import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { ANCHO_MINIMO_ETIQUETAS, createStyles } from './Paginacion.styles';
import type { PaginacionProps } from './Paginacion.types';

const ICON_SIZE = 20;

/**
 * Paginación de un listado. Se arma con `pagina` y `paginas`, que es lo que
 * devuelven todos los listados del panel con la misma forma.
 *
 * Son **dos acciones y un dato**: ir para atrás, ir para adelante, y en qué
 * página estás. No hay fila de números para saltar a la página 7 — en un
 * celular la página lejana no se busca, se avanza — y a cambio los dos botones
 * son grandes, se tocan con el pulgar sin apuntar y no le meten ruido visual a
 * la lista que tienen arriba.
 *
 * **Se adapta al ancho real**: mide el espacio que le dieron y, si no alcanza
 * para las palabras, deja las dos flechas solas sin cambiar de alto. Por eso no
 * hay una versión "de celular" y otra "de tablet": es la misma, y el que decide
 * es el ancho.
 *
 * Con **una sola página se esconde**: dos botones muertos y un "1 de 1" son
 * ruido. Cuántos resultados hay lo dice el encabezado de cada pantalla, así que
 * acá no se repite.
 *
 * Sin lógica de negocio: recibe en qué página está y avisa a cuál ir. Tampoco
 * trae espaciado propio: dónde va y cuánto aire tiene alrededor lo decide la
 * pantalla, que es la que sabe si va al pie de una lista o en una barra fija.
 */
function PaginacionComponent({
  pagina,
  paginas,
  onCambiar,
  accessibilityLabel,
}: PaginacionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Cuánto ancho le dieron de verdad. Se mide en vez de mirar el de la pantalla:
  // el componente vive adentro de listas con padding, y en una tablet puede
  // estar en una columna angosta. Antes de la primera medición se asume que hay
  // lugar: es el caso de casi todas las pantallas, así que no parpadea.
  const [ancho, setAncho] = useState(0);
  const medir = useCallback((evento: LayoutChangeEvent) => {
    setAncho(evento.nativeEvent.layout.width);
  }, []);

  const conEtiqueta = ancho === 0 || ancho >= ANCHO_MINIMO_ETIQUETAS;

  const irA = useCallback(
    (destino: number) => {
      // El componente conoce los bordes, así que nadie de afuera tiene que
      // acordarse de no pedir la página 0 ni una que no existe.
      const dentro = Math.min(Math.max(destino, 1), paginas);
      if (dentro !== pagina) {
        onCambiar(dentro);
      }
    },
    [onCambiar, pagina, paginas],
  );

  const anterior = useCallback(() => irA(pagina - 1), [irA, pagina]);
  const siguiente = useCallback(() => irA(pagina + 1), [irA, pagina]);

  if (paginas <= 1) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={medir} accessibilityLabel={accessibilityLabel}>
      <Paso
        direccion="anterior"
        onPress={anterior}
        deshabilitado={pagina <= 1}
        conEtiqueta={conEtiqueta}
        styles={styles}
        theme={theme}
      />

      {/*
        Se lee de una sola vez ("Página 3 de 12"): los dos números sueltos, uno
        detrás del otro, no dicen nada. El de la página actual va destacado
        porque es el dato que se mira; el total es contexto.
      */}
      <View style={styles.contador} accessible accessibilityLabel={`Página ${pagina} de ${paginas}`}>
        <Text variant="body" weight="semibold" color="text">
          {String(pagina)}
        </Text>
        <Text variant="small" color="textMuted">
          {`de ${paginas}`}
        </Text>
      </View>

      <Paso
        direccion="siguiente"
        onPress={siguiente}
        deshabilitado={pagina >= paginas}
        conEtiqueta={conEtiqueta}
        styles={styles}
        theme={theme}
      />
    </View>
  );
}

interface PasoProps {
  direccion: 'anterior' | 'siguiente';
  onPress: () => void;
  deshabilitado: boolean;
  /** Con lugar, la flecha va acompañada de la palabra. */
  conEtiqueta: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}

/** Un paso de a una página. En los bordes se apaga en vez de desaparecer. */
function Paso({
  direccion,
  onPress,
  deshabilitado,
  conEtiqueta,
  styles,
  theme,
}: PasoProps): ReactNode {
  const esAnterior = direccion === 'anterior';
  const Icono = esAnterior ? ChevronLeft : ChevronRight;
  const etiqueta = esAnterior ? 'Anterior' : 'Siguiente';

  // La flecha va del lado al que se va: a la izquierda en "Anterior", a la
  // derecha en "Siguiente". Es lo que hace que se lean sin pensarlos.
  const flecha = (
    <Icono size={ICON_SIZE} color={deshabilitado ? theme.colors.textMuted : theme.colors.text} />
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        styles.boton,
        !conEtiqueta && styles.botonCompacto,
        deshabilitado && styles.botonApagado,
        pressed && !deshabilitado && styles.presionado,
      ]}
      accessibilityRole="button"
      accessibilityLabel={esAnterior ? 'Página anterior' : 'Página siguiente'}
      accessibilityState={{ disabled: deshabilitado }}
    >
      {esAnterior && flecha}
      {conEtiqueta && (
        <Text variant="small" weight="medium" color={deshabilitado ? 'textMuted' : 'text'} numberOfLines={1}>
          {etiqueta}
        </Text>
      )}
      {!esAnterior && flecha}
    </Pressable>
  );
}

export const Paginacion = memo(PaginacionComponent);
