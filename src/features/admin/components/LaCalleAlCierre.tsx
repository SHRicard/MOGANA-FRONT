import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { PlataEnLaCalle } from './PlataEnLaCalle';
import { Variacion } from './Variacion';
import {
  DireccionesVariacion,
  direccionVariacion,
  FormatosVariacion,
  magnitudVariacion,
  type AlCierre,
  type DireccionVariacion,
} from '../types';

export interface LaCalleAlCierreProps {
  datos: AlCierre;
  /** El mes todavía no terminó, así que el corte es **hoy** y no el día 31. */
  enCurso: boolean;
}

/** Cómo se lee el movimiento de la deuda según para dónde fue. */
const TITULO_VARIACION: Record<DireccionVariacion, string> = {
  [DireccionesVariacion.SUBE]: 'La deuda creció en el mes',
  [DireccionesVariacion.BAJA]: 'La deuda bajó en el mes',
  [DireccionesVariacion.IGUAL]: 'La deuda quedó igual',
  [DireccionesVariacion.SIN_DATO]: 'La deuda en el mes',
};

/**
 * Cómo cerró la calle: **la deuda que quedaba el último día del mes**,
 * reconstruida con los cobros anotados hasta esa fecha.
 *
 * ⚠️ Es lo contrario que el tablero, y es la razón de ser del ticket. Una factura
 * de junio que se cobró en septiembre figura impaga en el ticket de julio,
 * porque en julio lo estaba. Por eso **la fecha del corte va escrita en el
 * bloque**: es lo único que evita que se lea como la deuda de hoy.
 *
 * En el mes en curso el corte es **hoy** y no el 31: proyectar la deuda al
 * último día estando a 21 mostraría como vencidas facturas que todavía están en
 * fecha.
 *
 * La variación del mes va como **delta con flecha, nunca como un total**: es
 * cuánto creció la deuda (`facturado − cobrado`), y bajar es lo que uno quiere
 * ver — de ahí que el verde sea el de abajo.
 */
function LaCalleAlCierreComponent({ datos, enCurso }: LaCalleAlCierreProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const corte = `al ${formatFecha(datos.al)}`;
  const titulo = TITULO_VARIACION[direccionVariacion(datos.variacionEnElMes)];

  // La flecha no se puede leer en voz alta, así que el renglón se lee entero:
  // "La deuda creció en el mes: $344.957".
  const variacionEnPalabras =
    datos.variacionEnElMes === 0
      ? `${titulo}.`
      : `${titulo}: ${magnitudVariacion(datos.variacionEnElMes, FormatosVariacion.MONTO)}.`;

  return (
    <View style={styles.bloque}>
      {/* En el mes en curso el corte es hoy, así que ahí la deuda sí es la de
          ahora y el vencimiento más viejo se cuenta en presente. */}
      <PlataEnLaCalle datos={datos} corte={corte} historico={!enCurso} />

      <View style={styles.tarjeta}>
        <View style={styles.encabezado}>
          <Text variant="small" weight="semibold">
            Cómo cerró el mes
          </Text>
          {/* El corte se repite acá a propósito: es el dato que cambia el
              significado de todos los números de la tarjeta. */}
          <Text variant="caption" color="textMuted">
            {enCurso ? `Hasta hoy, ${formatFecha(datos.al)}` : `Al ${formatFecha(datos.al)}`}
          </Text>
        </View>

        <View style={styles.fila} accessible accessibilityLabel={variacionEnPalabras}>
          <View style={styles.etiqueta}>
            <Text variant="caption" color="textMuted">
              {titulo}
            </Text>
            <Text variant="micro" color="textMuted">
              Lo facturado menos lo cobrado
            </Text>
          </View>
          <Variacion
            valor={datos.variacionEnElMes}
            formato={FormatosVariacion.MONTO}
            mejorSi={DireccionesVariacion.BAJA}
          />
        </View>

        <View
          style={styles.fila}
          accessible
          accessibilityLabel={`Debían ${datos.clientesConDeuda} clientes, de los cuales ${datos.morosos} ya estaban vencidos.`}
        >
          <View style={styles.etiqueta}>
            <Text variant="caption" color="textMuted">
              Clientes con deuda
            </Text>
            <Text variant="micro" color="textMuted">
              A esa fecha
            </Text>
          </View>
          <Text variant="body" weight="semibold">
            {`${datos.clientesConDeuda}`}
          </Text>
        </View>

        <View
          style={styles.fila}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.etiqueta}>
            <Text variant="caption" color={datos.morosos > 0 ? 'statusLate' : 'textMuted'}>
              De esos, ya vencidos
            </Text>
          </View>
          <Text
            variant="body"
            weight="semibold"
            color={datos.morosos > 0 ? 'statusLate' : undefined}
          >
            {`${datos.morosos}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bloque: { gap: theme.spacing.sm },

    tarjeta: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    encabezado: { gap: theme.spacing.xxs },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    /** `flex: 1` para que los valores queden alineados a la derecha. */
    etiqueta: { flex: 1 },
  });

export const LaCalleAlCierre = memo(LaCalleAlCierreComponent);
