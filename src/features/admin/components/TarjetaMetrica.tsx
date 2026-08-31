import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';

export interface TarjetaMetricaProps {
  /** Qué se está midiendo. Corto: es la etiqueta de arriba. */
  etiqueta: string;
  /** El número, ya formateado. La tarjeta no formatea nada. */
  valor: string;
  /** Una línea de contexto debajo: "5 cobros", "8 de 14 clientes". */
  detalle?: string;
  /** Color del número. Por defecto el del texto — el color se reserva para avisar. */
  tono?: keyof ThemeColors;
  /**
   * Un renglón más abajo de todo: el delta contra el mes anterior, por ejemplo.
   *
   * ⚠️ Va **decorativo** para el lector de pantalla, porque la tarjeta se lee
   * como una sola frase. Lo que el pie dice en palabras viaja en `pieTexto`, al
   * lado: una flecha verde no se puede leer en voz alta.
   */
  pie?: ReactNode;
  /** Lo que dice el `pie`, en palabras. Se suma al final de la frase. */
  pieTexto?: string;
}

/**
 * Un número suelto con su etiqueta. Es la pieza que se repite en la fila del
 * medio de las métricas, y la que hace que las tres tarjetas midan igual.
 *
 * Sin lógica: recibe el número **ya formateado**. Quién decide si eso es plata,
 * un porcentaje o una cantidad es la pantalla.
 */
function TarjetaMetricaComponent({
  etiqueta,
  valor,
  detalle,
  tono,
  pie,
  pieTexto,
}: TarjetaMetricaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.tarjeta}
      // La tarjeta es UNA unidad para el lector: "Entró en agosto, $59.622, 5
      // cobros" de corrido, y no tres textos sueltos.
      accessible
      accessibilityLabel={`${etiqueta}: ${valor}.${detalle ? ` ${detalle}.` : ''}${
        pieTexto ? ` ${pieTexto}.` : ''
      }`}
    >
      <Text variant="caption" color="textMuted" numberOfLines={2}>
        {etiqueta}
      </Text>
      <Text variant="subtitle" weight="bold" color={tono} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      {detalle !== undefined && (
        <Text variant="micro" color="textMuted" numberOfLines={1}>
          {detalle}
        </Text>
      )}
      {pie}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tarjeta: {
      // Las tres de la fila se reparten el ancho en partes iguales, y el `flex`
      // hace que la más alta marque el alto de las otras dos.
      flex: 1,
      gap: theme.spacing.xxs,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
  });

export const TarjetaMetrica = memo(TarjetaMetricaComponent);
