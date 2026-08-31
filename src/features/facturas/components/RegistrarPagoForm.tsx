import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { Button } from '@/shared/ui/atoms/Button';
import { CampoFecha } from '@/shared/ui/atoms/CampoFecha';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto, hoyPantalla } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { MAX_LARGO_NOTA_PAGO, type NuevoPagoFormValues } from '../types';

export interface RegistrarPagoFormProps {
  control: Control<NuevoPagoFormValues>;
  /** Cuánto falta cobrar. Es el valor propuesto y también el tope. */
  saldo: number;
  onEnviar: () => void;
  onCancelar: () => void;
  enviando: boolean;
  /** Error de la API, ya redactado. */
  mensajeError: string | null;
}

/**
 * El formulario de cobro, en línea dentro de la factura
 * (`docs/flujo_pagos.md` §7).
 *
 * Tres campos y ningún paso de más: **el monto viene precargado con el saldo** y
 * la fecha con hoy, así que el caso normal —"me pagó todo, hoy"— es abrir y
 * tocar el botón. Los dos se pueden cambiar: se cobra por partes y la plata pudo
 * entrar el viernes y anotarse el lunes.
 *
 * Va en línea y no en un `Modal`: en esta app los Modal se evitan porque son una
 * ventana nativa aparte que no hereda el edge-to-edge.
 */
export function RegistrarPagoForm({
  control,
  saldo,
  onEnviar,
  onCancelar,
  enviando,
  mensajeError,
}: RegistrarPagoFormProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // La fecha de un cobro puede ser de antes —se anota el lunes lo que entró el
  // viernes— pero no del futuro: la plata todavía no entró. Se calcula una vez
  // por montaje; el formulario no sobrevive a un cambio de día.
  const hoy = useMemo(() => hoyPantalla(), []);

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="monto"
        render={({ field, fieldState }) => (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              Monto
            </Text>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="0,00"
              keyboardType="decimal-pad"
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Monto del cobro, en pesos"
            />
            {/* El error no se comunica solo con el borde rojo: va el texto. */}
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                {`Falta cobrar ${formatMonto(saldo)}`}
              </Text>
            )}
          </View>
        )}
      />

      <CampoFecha
        control={control}
        name="fecha"
        label="Día del cobro"
        helperText="Si la plata entró otro día, cambialo"
        fechaMaxima={hoy}
      />

      <Controller
        control={control}
        name="nota"
        render={({ field, fieldState }) => (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              Nota (opcional)
            </Text>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="En efectivo, transferencia…"
              maxLength={MAX_LARGO_NOTA_PAGO}
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Nota del cobro"
            />
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : null}
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

      <View style={styles.acciones}>
        <View style={styles.accion}>
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={onCancelar}
            disabled={enviando}
            fullWidth
          />
        </View>
        <View style={styles.accion}>
          <Button
            label="Registrar"
            onPress={onEnviar}
            loading={enviando}
            disabled={enviando}
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    form: {
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    campo: { gap: theme.spacing.xs },

    acciones: { flexDirection: 'row', gap: theme.spacing.sm },
    /** Los dos botones se reparten el ancho: ninguno es "el chiquito". */
    accion: { flex: 1 },

    error: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },
  });
