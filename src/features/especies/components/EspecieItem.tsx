import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Pencil from 'lucide-react-native/icons/pencil';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { sePuedeBorrar, textoUsos, type Especie } from '../types';

const ICON_SIZE = 18;
/** Área táctil de cada acción. */
const ACCION = 44;

export interface EspecieItemProps {
  especie: Especie;
  onRenombrar: (especie: Especie) => void;
  onBorrar: (especie: Especie) => void;
}

/**
 * Un renglón del catálogo: el nombre y **en cuántos renglones de factura se
 * usó**.
 *
 * Los usos no son un adorno: son lo que dice si la especie sirve o quedó de un
 * experimento, y lo que decide si se puede borrar.
 *
 * ⚠️ **El tacho solo aparece con `usos: 0`.** Borrar una especie en uso dejaría
 * renglones sin clasificar y facturas que ya no se pueden explicar. El backend
 * lo rechaza igual con un `409`, pero el dato ya viene en el listado, así que es
 * mejor que no se pueda tocar: un botón que siempre falla es peor que no
 * tenerlo. Si el nombre está mal, se renombra.
 */
function EspecieItemComponent({ especie, onRenombrar, onBorrar }: EspecieItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renombrar = useCallback(() => onRenombrar(especie), [onRenombrar, especie]);
  const borrar = useCallback(() => onBorrar(especie), [onBorrar, especie]);

  const enUso = !sePuedeBorrar(especie);

  return (
    <View style={styles.fila}>
      <View style={styles.textos}>
        <Text variant="body" numberOfLines={2}>
          {especie.nombre}
        </Text>
        <Text variant="micro" color="textMuted">
          {textoUsos(especie.usos)}
        </Text>
      </View>

      <Pressable
        onPress={renombrar}
        style={({ pressed }) => [styles.accion, pressed && styles.presionada]}
        accessibilityRole="button"
        accessibilityLabel={`Renombrar ${especie.nombre}`}
        // El renombre corrige el nombre en TODAS las facturas donde se usó: vale
        // la pena decirlo antes de tocar, no solo adentro del diálogo.
        accessibilityHint="Cambia el nombre también en las facturas ya emitidas"
      >
        <Pencil size={ICON_SIZE} color={theme.colors.text} />
      </Pressable>

      {/* En uso no se dibuja: es una acción que no existe para esta especie. */}
      {!enUso && (
        <Pressable
          onPress={borrar}
          style={({ pressed }) => [styles.accion, pressed && styles.presionada]}
          accessibilityRole="button"
          accessibilityLabel={`Borrar ${especie.nombre}`}
        >
          <Trash2 size={ICON_SIZE} color={theme.colors.error} />
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    /** `flex: 1` para que las acciones queden pegadas al borde derecho. */
    textos: { flex: 1, gap: theme.spacing.xxs, paddingVertical: theme.spacing.xs },

    accion: {
      width: ACCION,
      height: ACCION,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presionada: { opacity: 0.6 },
  });

export const EspecieItem = memo(EspecieItemComponent);
