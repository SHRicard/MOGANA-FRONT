import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import UserCog from 'lucide-react-native/icons/user-cog';
import type { Rol } from '@/features/auth';
import { ROL_LABEL, rolLabel } from '@/features/usuarios';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import {
  consecuenciaDelCambio,
  CUANDO_PEGA_EL_CAMBIO,
  MAX_LARGO_MOTIVO_DE_ROL,
  type CambiarRolFormValues,
} from '../types';

export interface CambiarRolDialogoProps {
  /** El rol destino, o `null` con el diálogo cerrado. */
  rol: Rol | null;
  /** El rol que tiene hoy, para redactar el "pasa de X a Y". */
  rolActual: string;
  /** A quién, para que el cartel diga de quién habla. */
  nombre: string;
  control: Control<CambiarRolFormValues>;
  onConfirmar: () => void;
  onCancelar: () => void;
  cambiando: boolean;
  /** Error de la API, **ya redactado**. No se reescribe. */
  mensajeError: string | null;
}

/**
 * El paso intermedio antes de moverle el rol a alguien (§6).
 *
 * ⚠️ Esta acción **no se puede deshacer con un botón** —se deshace haciendo el
 * cambio al revés, que deja otro renglón en la auditoría— y le da o le quita a
 * alguien el acceso a la facturación de todo el negocio. Por eso hay un paso
 * intermedio y no un toque directo desde la lista.
 *
 * El **motivo es obligatorio del lado del servidor**, así que se pide acá y no
 * después del error: mandar el cambio para que la API conteste *"Contá en una
 * línea por qué se le cambia el rol"* es un viaje para nada.
 *
 * El fondo no cierra: con un campo abierto, tocar al costado para bajar el
 * teclado tiraría abajo lo escrito.
 */
export function CambiarRolDialogo({
  rol,
  rolActual,
  nombre,
  control,
  onConfirmar,
  onCancelar,
  cambiando,
  mensajeError,
}: CambiarRolDialogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Dialogo
      visible={rol !== null}
      onClose={onCancelar}
      tono="peligro"
      icono={<UserCog size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
      titulo={
        rol
          ? `${nombre} pasa de ${rolLabel(rolActual).toLowerCase()} a ${ROL_LABEL[
              rol
            ].toLowerCase()}`
          : 'Cambiar el rol'
      }
      descripcion={rol ? consecuenciaDelCambio(rolActual, rol) : undefined}
      cerrarAlTocarFondo={false}
      acciones={[
        {
          label: 'Cambiar el rol',
          onPress: onConfirmar,
          variant: 'danger',
          loading: cambiando,
          // Mandar dos veces el mismo cambio no ensucia el historial —el
          // segundo es un no-op del backend—, pero el botón se apaga igual: un
          // doble toque no tiene por qué salir a la red dos veces.
          disabled: cambiando,
        },
        { label: 'Cancelar', onPress: onCancelar, variant: 'secondary', disabled: cambiando },
      ]}
    >
      <Controller
        control={control}
        name="motivo"
        render={({ field, fieldState }) => (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              ¿Por qué?
            </Text>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="Dejó el negocio en agosto"
              maxLength={MAX_LARGO_MOTIVO_DE_ROL}
              multiline
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Motivo del cambio de rol"
            />
            {/* El error no se comunica solo con el borde rojo: va el texto. */}
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                Obligatorio. Queda registrado en el historial con tu nombre.
              </Text>
            )}
          </View>
        )}
      />

      {/* Lo que más sorprende del cambio: no espera al próximo login. */}
      <View style={styles.cuandoPega}>
        <Text variant="caption" color="textMuted">
          {CUANDO_PEGA_EL_CAMBIO}
        </Text>
      </View>

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

    cuandoPega: { marginTop: theme.spacing.sm },

    error: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },
  });
