import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import Tag from 'lucide-react-native/icons/tag';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { MAX_LARGO_ESPECIE, type EspecieFormValues } from '../types';

export interface EditorDeEspecieDialogoProps {
  visible: boolean;
  /** `true` cuando se está renombrando una que ya existe. */
  esRenombre: boolean;
  control: Control<EspecieFormValues>;
  /**
   * Ese nombre ya está en el catálogo. Se avisa, pero **no se traba**: quien
   * decide si hay choque es la base, y entre que se abrió el diálogo y se
   * guarda otra persona pudo haberla creado o borrado.
   */
  repetida: boolean;
  onGuardar: () => void;
  onCancelar: () => void;
  guardando: boolean;
  /** Error de la API, ya redactado. El `409` explica el choque de nombres. */
  mensajeError: string | null;
}

/**
 * Crear una especie o renombrarla: **el mismo formulario**, porque los dos
 * llevan exactamente lo mismo.
 *
 * ⚠️ El renombre avisa lo que casi nadie espera: **cambia también en las
 * facturas viejas**. Es a propósito —la especie es una clasificación, no lo que
 * se cobró— y por eso hay que decirlo antes, no descubrirlo después mirando una
 * factura de marzo.
 *
 * El fondo no cierra: con un campo abierto, tocar al costado para bajar el
 * teclado tiraría abajo lo escrito.
 */
export function EditorDeEspecieDialogo({
  visible,
  esRenombre,
  control,
  repetida,
  onGuardar,
  onCancelar,
  guardando,
  mensajeError,
}: EditorDeEspecieDialogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Dialogo
      visible={visible}
      onClose={onCancelar}
      icono={<Tag size={DIALOGO_ICON_SIZE} color={theme.colors.primary} />}
      titulo={esRenombre ? 'Renombrar la especie' : 'Nueva especie'}
      descripcion={
        esRenombre
          ? 'El nombre cambia también en las facturas ya emitidas: la especie clasifica, no es lo que se cobró. El producto y el precio de cada renglón quedan como estaban.'
          : 'Con qué etiqueta se agrupa lo que vendés. "12 Coca de 500ml" es el producto; "Gaseosa" es la especie.'
      }
      cerrarAlTocarFondo={false}
      acciones={[
        {
          label: esRenombre ? 'Guardar' : 'Crear',
          onPress: onGuardar,
          loading: guardando,
          disabled: guardando,
        },
        { label: 'Cancelar', onPress: onCancelar, variant: 'secondary', disabled: guardando },
      ]}
    >
      <Controller
        control={control}
        name="nombre"
        render={({ field, fieldState }) => (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              Nombre
            </Text>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="Gaseosa"
              maxLength={MAX_LARGO_ESPECIE}
              autoCapitalize="sentences"
              autoCorrect={false}
              hasError={fieldState.error !== undefined || repetida}
              accessibilityLabel="Nombre de la especie"
            />

            {/* El error no se comunica solo con el borde rojo: va el texto. */}
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : repetida ? (
              <Text variant="caption" color="error">
                Ya hay una especie que se escribe así. Mayúsculas y tildes no la hacen distinta.
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                "Gaseosa" y "gaseosas" son dos especies distintas: los plurales no se unen solos.
              </Text>
            )}
          </View>
        )}
      />

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
    campo: { gap: theme.spacing.xs },

    error: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
    },
  });
