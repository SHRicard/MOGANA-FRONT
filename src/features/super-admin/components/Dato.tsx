import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

export interface DatoProps {
  etiqueta: string;
  valor: ReactNode;
  /** Una línea abajo, para lo que el número no dice solo. */
  nota?: string;
}

/**
 * Una fila etiqueta/valor. Es la unidad con la que se leen el tablero y la
 * ficha del sistema, que son casi todo datos sueltos.
 *
 * El par se lee **junto** para el lector de pantalla —"Último ingreso, 13/08/2026
 * 19:15"— y no como dos textos que no se relacionan.
 */
function DatoComponent({ etiqueta, valor, nota }: DatoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.fila} accessible>
      <View style={styles.etiqueta}>
        <Text variant="small" color="textMuted">
          {etiqueta}
        </Text>
        {nota ? (
          <Text variant="caption" color="textMuted">
            {nota}
          </Text>
        ) : null}
      </View>
      <View style={styles.valor}>
        <Text variant="small" align="right" numberOfLines={2}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    /** `flex: 1` en los dos: la etiqueta con nota puede ser más larga que el valor. */
    etiqueta: { flex: 1, gap: theme.spacing.xxs },
    valor: { flex: 1 },
  });

export const Dato = memo(DatoComponent);
