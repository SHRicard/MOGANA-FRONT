import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import Ban from 'lucide-react-native/icons/ban';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { formatMonto } from '@/shared/utils';
import { MAX_LARGO_MOTIVO_ANULACION, type AnularFacturaFormValues } from '../types';

export interface AnularFacturaDialogoProps {
  visible: boolean;
  /** El número de la factura, para que el cartel diga cuál se está anulando. */
  numero: number;
  /**
   * Cuánto se le cobró ya. Si es más que cero, el cartel lo dice: esa plata
   * pasa a ser una devolución que se arregla **por fuera del sistema**, y hay
   * que enterarse antes de confirmar, no después.
   */
  pagado: number;
  control: Control<AnularFacturaFormValues>;
  onConfirmar: () => void;
  onCancelar: () => void;
  anulando: boolean;
  /** Error de la API, ya redactado. */
  mensajeError: string | null;
}

/**
 * La confirmación para dar de baja una factura: dice qué implica y pide el
 * motivo (`docs/flujo_pagos.md` §9).
 *
 * Pide confirmación porque **no se puede deshacer**: una factura anulada queda
 * anulada, y si hacía falta se emite otra. El motivo es obligatorio y no es un
 * trámite — es lo único que explica, seis meses después, por qué falta ese
 * número en la numeración.
 *
 * ⚠️ **Se puede anular una factura ya cobrada.** Cuando entró plata, el cartel lo
 * dice con todas las letras antes de confirmar: esos cobros se quedan anotados
 * pero dejan de contar, y lo cobrado pasa a ser una devolución que se hace por
 * fuera del sistema.
 *
 * El fondo no cierra: con un campo abierto, tocar al costado para bajar el
 * teclado tiraría abajo lo escrito. Se sale por "Cancelar" o por el "atrás".
 */
export function AnularFacturaDialogo({
  visible,
  numero,
  pagado,
  control,
  onConfirmar,
  onCancelar,
  anulando,
  mensajeError,
}: AnularFacturaDialogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Dialogo
      visible={visible}
      onClose={onCancelar}
      tono="peligro"
      icono={<Ban size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
      titulo={`Anular la factura #${numero}`}
      descripcion={
        pagado > 0
          ? `Ya se cobraron ${formatMonto(
              pagado,
            )}. Si la anulás, dejan de contar y el reembolso lo arreglás por fuera del sistema. No se puede deshacer.`
          : 'Deja de contar para la deuda del cliente y no se puede deshacer. La factura no se borra: queda con su número y su detalle, marcada como anulada.'
      }
      cerrarAlTocarFondo={false}
      acciones={[
        {
          label: 'Anular la factura',
          onPress: onConfirmar,
          // Rojo también acá: la confirmación de algo que no se deshace no se
          // puede ver igual que un "Aceptar" cualquiera.
          variant: 'danger',
          loading: anulando,
          disabled: anulando,
        },
        {
          label: 'Cancelar',
          onPress: onCancelar,
          variant: 'secondary',
          disabled: anulando,
        },
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
              placeholder="Precio mal tipeado: un cero de más"
              maxLength={MAX_LARGO_MOTIVO_ANULACION}
              multiline
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Motivo de la anulación"
            />
            {/* El error no se comunica solo con el borde rojo: va el texto. */}
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                Queda guardado en la factura: es lo que explica el número que falta.
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
