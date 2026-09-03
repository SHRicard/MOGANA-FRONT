import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';

export interface RenglonDeLaBaja {
  /** Qué. Es lo que se lee primero. */
  dato: string;
  /** Por qué queda. Solo lo trae `seRetiene`. */
  motivo?: string;
}

export interface ListaDeLaBajaProps {
  titulo: string;
  renglones: readonly RenglonDeLaBaja[];
  /** El color del punto de cada renglón. Lo elige quien la usa. */
  color: keyof ThemeColors;
}

/** Lado del punto. Chico: acompaña al texto, no compite con él. */
const PUNTO = 6;

/**
 * Una de las dos listas del aviso de baja (`docs/README_FRONT_BAJA_DE_CUENTA.md`
 * §3): **qué se borra** y **qué queda guardado**.
 *
 * Son la misma forma con dos significados opuestos, y por eso es un componente
 * y no dos: lo único que cambia es el color del punto y si cada renglón trae su
 * motivo debajo.
 *
 * ⚠️ Los textos **vienen escritos del servidor** y se muestran tal cual: son los
 * que se declararon en la política de privacidad, no copy de esta pantalla.
 *
 * Con la lista vacía no dibuja nada: un título con nada debajo se lee como algo
 * que no cargó.
 */
function ListaDeLaBajaComponent({ titulo, renglones, color }: ListaDeLaBajaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (renglones.length === 0) {
    return null;
  }

  return (
    <View style={styles.bloque}>
      <Text variant="small" weight="semibold">
        {titulo}
      </Text>

      {renglones.map((renglon) => (
        // El renglón se lee junto: el dato y su motivo son una sola cosa, no
        // dos textos sueltos que el lector de pantalla no relaciona.
        <View key={renglon.dato} style={styles.renglon} accessible>
          <View style={[styles.punto, { backgroundColor: theme.colors[color] }]} />
          <View style={styles.textos}>
            <Text variant="small">{renglon.dato}</Text>
            {renglon.motivo ? (
              <Text variant="caption" color="textMuted">
                {renglon.motivo}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bloque: { gap: theme.spacing.xs },

    renglon: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
    /**
     * `marginTop` para que el punto quede a la altura de la primera línea del
     * texto y no centrado contra un renglón de tres líneas.
     */
    punto: {
      width: PUNTO,
      height: PUNTO,
      marginTop: theme.spacing.xs,
      borderRadius: theme.radius.full,
    },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al punto. */
    textos: { flex: 1, gap: theme.spacing.xxs },
  });

export const ListaDeLaBaja = memo(ListaDeLaBajaComponent);
