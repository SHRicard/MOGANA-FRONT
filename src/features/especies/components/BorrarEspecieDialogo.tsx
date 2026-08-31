import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import type { Especie } from '../types';

export interface BorrarEspecieDialogoProps {
  /** La que está por borrarse. `null` cierra el diálogo. */
  especie: Especie | null;
  onConfirmar: () => void;
  onCancelar: () => void;
  borrando: boolean;
  /** Error de la API, ya redactado. */
  mensajeError: string | null;
}

/**
 * Confirma el borrado de una especie **sin usar**.
 *
 * Aunque no esté en ninguna factura, no se puede deshacer, así que se pregunta.
 * Es la salida para la que se creó por error —un "gaseoza" que quedó de un
 * tipeo—, no una forma de limpiar el catálogo: la que ya se usó se renombra.
 */
export function BorrarEspecieDialogo({
  especie,
  onConfirmar,
  onCancelar,
  borrando,
  mensajeError,
}: BorrarEspecieDialogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Dialogo
      visible={especie !== null}
      onClose={onCancelar}
      tono="peligro"
      icono={<Trash2 size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
      titulo="Borrar la especie"
      descripcion={
        especie
          ? `"${especie.nombre}" no se usó en ninguna factura, así que se puede borrar. No se puede deshacer.`
          : undefined
      }
      acciones={[
        {
          label: 'Borrar',
          onPress: onConfirmar,
          variant: 'danger',
          loading: borrando,
          disabled: borrando,
        },
        { label: 'Cancelar', onPress: onCancelar, variant: 'secondary', disabled: borrando },
      ]}
    >
      {mensajeError && (
        <View style={styles.error} accessible accessibilityRole="alert">
          <Text variant="small" color="error">
            {mensajeError}
          </Text>
        </View>
      )}
    </Dialogo>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    error: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
    },
  });
