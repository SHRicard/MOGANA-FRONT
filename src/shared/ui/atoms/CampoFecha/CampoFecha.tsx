import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import CalendarIcon from 'lucide-react-native/icons/calendar';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { Calendario } from '@/shared/ui/atoms/Calendario';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFechaLargaPantalla } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';

export interface CampoFechaProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  /** Texto de ayuda debajo. Se esconde cuando hay error. */
  helperText?: string;
  /**
   * Desde y hasta qué día se puede elegir, en formato de pantalla. Los de
   * afuera del rango quedan apagados en el calendario.
   *
   * Los decide quien usa el campo porque **no son los mismos**: el vencimiento
   * de una factura va de hoy a dentro de un año, y la fecha de un cobro puede
   * ser de antes de hoy pero nunca de después.
   */
  fechaMinima?: string;
  fechaMaxima?: string;
}

const ICON_SIZE = 20;

/**
 * El campo de fecha del formulario: muestra el día elegido y despliega un
 * calendario para cambiarlo.
 *
 * **No se tipea la fecha.** Antes era un input de texto y eso pedía escribir
 * `17/09/2026` con el formato exacto; con el calendario no hay forma de elegir
 * un día que no exista ni uno fuera del rango permitido —quedan apagados—, así
 * que el error deja de ser algo que se descubre al mandar.
 *
 * El calendario se despliega **en línea** y no en un `Modal`: en esta app los
 * Modal se evitan porque son una ventana nativa aparte que no hereda el
 * edge-to-edge (mismo motivo por el que `MenuSheet` es una view absoluta).
 *
 * Nació en el formulario de facturar y subió acá cuando lo necesitó una segunda
 * feature —avisar un pago, del lado del cliente— (regla de promoción del
 * `CLAUDE.md`). Sin lógica de negocio: los topes los decide quien lo usa.
 */
export function CampoFecha<T extends FieldValues>({
  control,
  name,
  label,
  helperText,
  fechaMinima,
  fechaMaxima,
}: CampoFechaProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [abierto, setAbierto] = useState(false);
  const alternar = useCallback(() => setAbierto((actual) => !actual), []);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const valor = typeof field.value === 'string' ? field.value : '';
        const hayError = fieldState.error !== undefined;

        const elegir = (fecha: string) => {
          field.onChange(fecha);
          // Se cierra al elegir: el día ya quedó a la vista arriba, y dejarlo
          // abierto empuja el resto del formulario fuera de la pantalla.
          setAbierto(false);
          // Dispara la validación del campo, igual que salir de un input.
          field.onBlur();
        };

        return (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              {label}
            </Text>

            <Pressable
              onPress={alternar}
              style={({ pressed }) => [
                styles.control,
                hayError && styles.controlConError,
                abierto && styles.controlAbierto,
                pressed && styles.presionado,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                valor ? `${label}: ${formatFechaLargaPantalla(valor)}` : `Elegir ${label}`
              }
              accessibilityHint="Abre el calendario para elegir otro día"
              accessibilityState={{ expanded: abierto }}
            >
              <CalendarIcon size={ICON_SIZE} color={theme.colors.textMuted} />

              <View style={styles.valor}>
                <Text variant="body" weight="medium">
                  {valor || 'Elegí una fecha'}
                </Text>
                {/* El día escrito entero: un "17/09" se puede leer al revés, y
                    acá se está fijando cuándo hay que cobrar. */}
                {valor ? (
                  <Text variant="caption" color="textMuted">
                    {formatFechaLargaPantalla(valor)}
                  </Text>
                ) : null}
              </View>

              {abierto ? (
                <ChevronUp size={ICON_SIZE} color={theme.colors.textMuted} />
              ) : (
                <ChevronDown size={ICON_SIZE} color={theme.colors.textMuted} />
              )}
            </Pressable>

            {abierto && (
              <Calendario
                value={valor}
                onChange={elegir}
                fechaMinima={fechaMinima}
                fechaMaxima={fechaMaxima}
                accessibilityLabel={`Calendario para elegir ${label}`}
              />
            )}

            {/* El error no se comunica solo con el borde rojo: va también el texto. */}
            {hayError ? (
              <Text variant="caption" color="error">
                {fieldState.error?.message}
              </Text>
            ) : helperText ? (
              <Text variant="caption" color="textMuted">
                {helperText}
              </Text>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    campo: { gap: theme.spacing.xs },

    control: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    // Abierto y con error engrosan el borde además de cambiar el color: el
    // estado no se comunica solo con el tono.
    controlAbierto: { borderColor: theme.colors.primary, borderWidth: 2 },
    controlConError: { borderColor: theme.colors.error, borderWidth: 2 },
    presionado: { opacity: 0.7 },

    /** `flex: 1` para que las flechas queden pegadas a los bordes. */
    valor: { flex: 1, gap: theme.spacing.xxs },
  });
