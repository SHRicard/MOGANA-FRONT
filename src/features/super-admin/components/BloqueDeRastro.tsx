import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { hayRastro, quienLoHizo, type Rastro } from '../types';

export interface BloqueDeRastroProps {
  titulo: string;
  rastro: Rastro;
  /**
   * Qué decir cuando hay fecha y no hay motivo. Pasa de verdad en el fiado: al
   * devolverlo, el backend borra el motivo que había, y está bien — *"se lo
   * devolvieron"* no necesita explicación, cortarlo sí.
   */
  sinMotivo?: string;
}

/**
 * **Quién le tocó qué a esta cuenta y por qué** (§5).
 *
 * ⚠️ **Con los cuatro campos en `null` no se dibuja nada.** No es un dato que
 * falta: es una cuenta a la que nunca le pasó eso. Cuatro guiones en cuatro
 * filas se leen como un error de carga.
 *
 * ⚠️ **`por` puede ser `null` con `porId` cargado**: es un id que ya no resuelve
 * a ninguna cuenta. Ahí va el id crudo y la aclaración — *"lo hizo alguien que
 * ya no está"* es información; un guion no.
 */
function BloqueDeRastroComponent({ titulo, rastro, sinMotivo }: BloqueDeRastroProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!hayRastro(rastro)) {
    return null;
  }

  const autor = quienLoHizo(rastro);

  return (
    <View style={styles.bloque} accessible>
      <Text variant="small" weight="semibold">
        {titulo}
      </Text>

      {rastro.en ? (
        <Text variant="small" color="textMuted">
          {formatFechaHora(rastro.en)}
        </Text>
      ) : null}

      {autor ? (
        <Text variant="small" color="textMuted">
          {autor.yaNoEsta ? `Lo hizo una cuenta que ya no está: ${autor.nombre}` : autor.nombre}
        </Text>
      ) : null}

      {rastro.motivo ? (
        <Text variant="small">{rastro.motivo}</Text>
      ) : sinMotivo ? (
        <Text variant="caption" color="textMuted">
          {sinMotivo}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bloque: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.lg,
    },
  });

export const BloqueDeRastro = memo(BloqueDeRastroComponent);
