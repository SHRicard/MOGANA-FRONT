import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';

export interface FilaDeDatos {
  /** Qué se está midiendo. Es también la clave de la fila. */
  etiqueta: string;
  /** El valor, **ya formateado**: la tarjeta no formatea nada. */
  valor: string;
  /** Una línea de contexto debajo de la etiqueta. */
  detalle?: string;
  /** Color de la fila. Por defecto ninguno: el color se reserva para avisar. */
  tono?: keyof ThemeColors;
}

export interface TarjetaFilasProps {
  titulo: string;
  /** El período o la fecha de corte, cuando el título solo no alcanza. */
  subtitulo?: string;
  filas: readonly FilaDeDatos[];
  /** Una aclaración al pie, para lo que un número no puede decir solo. */
  nota?: string;
}

/**
 * Una tarjeta de renglones "etiqueta → valor". Es la forma que se repite en todo
 * el panel: el resumen global, lo que se emitió en el mes, lo que entró.
 *
 * Los importes quedan alineados a la derecha porque la etiqueta se lleva el
 * `flex`: así una columna de plata se puede comparar de un vistazo.
 *
 * Sin lógica: recibe los valores **ya formateados**. Quién decide si eso es
 * plata, un porcentaje o una cantidad es quien la usa.
 */
function TarjetaFilasComponent({ titulo, subtitulo, filas, nota }: TarjetaFilasProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text variant="small" weight="semibold">
          {titulo}
        </Text>
        {subtitulo !== undefined && (
          <Text variant="caption" color="textMuted">
            {subtitulo}
          </Text>
        )}
      </View>

      {filas.map((fila) => (
        <Fila key={fila.etiqueta} {...fila} styles={styles} />
      ))}

      {nota !== undefined && (
        <Text variant="micro" color="textMuted">
          {nota}
        </Text>
      )}
    </View>
  );
}

function Fila({ etiqueta, valor, detalle, tono, styles }: FilaDeDatos & { styles: Estilos }) {
  return (
    // Una unidad para el lector de pantalla: la etiqueta y su número juntos.
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={`${etiqueta}: ${valor}.${detalle ? ` ${detalle}` : ''}`}
    >
      <View style={styles.etiqueta}>
        <Text variant="caption" color={tono ?? 'textMuted'} weight={tono ? 'medium' : 'regular'}>
          {etiqueta}
        </Text>
        {detalle !== undefined && (
          <Text variant="micro" color="textMuted">
            {detalle}
          </Text>
        )}
      </View>
      <Text variant="body" weight="semibold" color={tono}>
        {valor}
      </Text>
    </View>
  );
}

type Estilos = ReturnType<typeof createStyles>;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    /** `flex: 1` para que todos los valores queden alineados a la derecha. */
    etiqueta: { flex: 1 },
  });

export const TarjetaFilas = memo(TarjetaFilasComponent);
