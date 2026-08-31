import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import Ban from 'lucide-react-native/icons/ban';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { MAX_LARGO_MOTIVO_SIN_FIADO, type BloquearFiadoFormValues } from '../types';

export interface BloquearFiadoDialogoProps {
  visible: boolean;
  /** A quién se le corta, para que el cartel diga de quién habla. */
  nombre: string;
  control: Control<BloquearFiadoFormValues>;
  onConfirmar: () => void;
  onCancelar: () => void;
  bloqueando: boolean;
  /** Error de la API, ya redactado. */
  mensajeError: string | null;
}

/**
 * Pide el motivo antes de cortarle el fiado a un cliente
 * (`docs/bloquear_fiado.md`).
 *
 * El motivo es obligatorio y no es un trámite: es **lo que va a leer el que
 * atienda** cuando esta persona vuelva al mostrador. Un "no se le fía" sin razón
 * es una traba que nadie sabe si sigue valiendo, y termina en que alguien la
 * ignora o la deja para siempre.
 *
 * El cartel aclara que **no traba nada**: se le va a poder facturar igual. La
 * decisión de cobrarle en el momento la toma la persona que atiende.
 *
 * El fondo no cierra: con un campo abierto, tocar al costado para bajar el
 * teclado tiraría abajo lo escrito.
 */
export function BloquearFiadoDialogo({
  visible,
  nombre,
  control,
  onConfirmar,
  onCancelar,
  bloqueando,
  mensajeError,
}: BloquearFiadoDialogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Dialogo
      visible={visible}
      onClose={onCancelar}
      tono="peligro"
      icono={<Ban size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
      titulo="Cortarle el fiado"
      descripcion={`${nombre} va a quedar marcado para que quien atienda sepa que no se le fía. No traba nada: se le puede facturar igual, así que la decisión de cobrarle en el momento sigue siendo de quien atiende.`}
      cerrarAlTocarFondo={false}
      acciones={[
        {
          label: 'Cortarle el fiado',
          onPress: onConfirmar,
          variant: 'danger',
          loading: bloqueando,
          disabled: bloqueando,
        },
        { label: 'Cancelar', onPress: onCancelar, variant: 'secondary', disabled: bloqueando },
      ]}
    >
      <Controller
        control={control}
        name="motivo"
        render={({ field, fieldState }) => (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              Motivo
            </Text>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="Debe desde julio y no atiende el teléfono"
              maxLength={MAX_LARGO_MOTIVO_SIN_FIADO}
              multiline
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Motivo por el que se le corta el fiado"
            />
            {/* El error no se comunica solo con el borde rojo: va el texto. */}
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                Lo va a leer quien atienda cuando el cliente vuelva.
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
      borderRadius: theme.radius.lg,
    },
  });
