import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import {
  NIVEL_DE_USO_LABEL,
  NivelesDeUso,
  nivelDeUso,
  porcentajeUsable,
  type NivelDeUso,
} from '../types';

export interface BarraDeUsoProps {
  /** Cuánto se usó, de 0 a 100. Se recorta sola si viene fuera de rango. */
  porcentaje: number;
  /** Qué se está midiendo, para el lector de pantalla: "créditos del store". */
  accessibilityLabel: string;
}

/** Alto de la barra. Gruesa: es el dato principal del bloque, no un adorno. */
const ALTO = 14;

/** El degradé, anclado a la escala 0–100 y no al relleno. Ver el ⚠️ de abajo. */
const PARADAS: readonly { corte: number; color: keyof ThemeColors }[] = [
  { corte: 0, color: 'statusOk' },
  { corte: 0.55, color: 'statusWait' },
  { corte: 0.8, color: 'statusSoon' },
  { corte: 1, color: 'statusLate' },
];

/**
 * El color de cada zona. **Solo el color vive acá**: dónde están los cortes y
 * qué dice cada uno es del dominio (`types.ts`), porque el día que cambie el
 * plan lo que se mueve es eso y no un dibujo.
 */
const COLOR_DEL_NIVEL: Record<NivelDeUso, keyof ThemeColors> = {
  [NivelesDeUso.HOLGADO]: 'statusOk',
  [NivelesDeUso.ATENCION]: 'statusSoon',
  [NivelesDeUso.CRITICO]: 'statusLate',
};

/**
 * **Cuánto del límite está usado**, en una barra que se llena y se pone roja.
 *
 * Existe porque el número solo no se lee: *"13,7% usado"* obliga a pensar, y una
 * barra verde corta se entiende sin leerla. Es la única cosa de este panel que
 * quien entra tiene que poder entender **sin detenerse**.
 *
 * ⚠️ **El degradé está anclado a la escala completa, no al relleno**, y es la
 * decisión que hace que la barra signifique algo. Si el verde→rojo se estirara
 * sobre el ancho del relleno, al 10% se vería una barra chiquita que va de verde
 * a rojo —o sea, roja en la punta— y diría exactamente lo contrario de lo que
 * pasa. Anclado a la escala, al 10% se ve verde y nada más, y el rojo recién
 * aparece cuando de verdad se llegó ahí. Se logra con
 * `gradientUnits="userSpaceOnUse"` sobre el ancho del riel, mientras el
 * rectángulo dibuja solo su parte.
 *
 * ⚠️ **El color no es lo único que lo dice.** Abajo va el texto —"tenés lugar de
 * sobra", "te estás quedando sin lugar"— porque un rojo y un verde son el mismo
 * gris para bastante gente, y porque el lector de pantalla no ve el degradé.
 */
function BarraDeUsoComponent({ porcentaje, accessibilityLabel }: BarraDeUsoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * El SVG necesita el ancho en píxeles, y el del riel lo decide el layout. Se
   * mide una vez y se redibuja: hasta que llega, no se dibuja el relleno.
   */
  const [ancho, setAncho] = useState(0);
  const medir = useCallback((evento: LayoutChangeEvent) => {
    setAncho(evento.nativeEvent.layout.width);
  }, []);

  // Recortado a 0–100: un backend que devuelva 103 —los créditos se pueden pasar
  // del plan— no puede pintar fuera del riel.
  const usado = porcentajeUsable(porcentaje);
  const relleno = (ancho * usado) / 100;

  const nivel = nivelDeUso(usado);
  const color = COLOR_DEL_NIVEL[nivel];
  const texto = NIVEL_DE_USO_LABEL[nivel];

  return (
    <View style={styles.bloque}>
      <View style={styles.encabezado}>
        <Text variant="small" weight="medium">
          {`${usado}% usado`}
        </Text>
        <Text variant="caption" color={color} weight="medium">
          {texto}
        </Text>
      </View>

      <View
        style={styles.riel}
        onLayout={medir}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        // Lo que lee el lector de pantalla: el degradé no le dice nada.
        accessibilityValue={{ min: 0, max: 100, now: usado, text: `${usado}%. ${texto}.` }}
      >
        {ancho > 0 && relleno > 0 ? (
          <Svg width={ancho} height={ALTO}>
            <Defs>
              <LinearGradient
                id="uso"
                /*
                  ⚠️ Anclado al riel entero (`userSpaceOnUse` de 0 a `ancho`), no
                  al rectángulo. Es lo que hace que al 10% se vea solo verde.
                */
                gradientUnits="userSpaceOnUse"
                x1={0}
                y1={0}
                x2={ancho}
                y2={0}
              >
                {PARADAS.map((parada) => (
                  <Stop
                    key={parada.color}
                    offset={parada.corte}
                    stopColor={theme.colors[parada.color]}
                  />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={relleno} height={ALTO} rx={ALTO / 2} fill="url(#uso)" />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bloque: { gap: theme.spacing.xs },

    encabezado: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    /** El riel vacío. Lo que falta por usar es lugar disponible, no un hueco. */
    riel: {
      height: ALTO,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.full,
      overflow: 'hidden',
    },
  });

export const BarraDeUso = memo(BarraDeUsoComponent);
