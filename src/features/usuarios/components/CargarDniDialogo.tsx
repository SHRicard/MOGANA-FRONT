import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import IdCard from 'lucide-react-native/icons/id-card';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { MAX_LARGO_DNI_TIPEADO } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { MAX_LARGO_MOTIVO_DNI, type CargarDniFormValues } from '../types';

export interface CargarDniDialogoProps {
  visible: boolean;
  /** A quién, para que el cartel diga de quién habla. */
  nombre: string;
  /** `true` cuando ya tiene uno cargado: cambia el texto de "cargar" a "corregir". */
  corrige: boolean;
  control: Control<CargarDniFormValues>;
  onConfirmar: () => void;
  onCancelar: () => void;
  guardando: boolean;
  /** Error de la API, ya redactado. */
  mensajeError: string | null;
}

/**
 * Cargarle o corregirle el documento a un cliente (`docs/flujo_login.md`).
 *
 * Es la contraparte de mostrador del cartel que ve la persona en su teléfono: el
 * cliente puede cargarlo solo una vez, así que **corregir un DNI mal tipeado
 * solo se puede desde acá**.
 *
 * El motivo es obligatorio y queda guardado con quién lo hizo y cuándo: cambiar
 * el documento con el que se identifica a alguien tiene que dejar rastro.
 *
 * El fondo no cierra: con dos campos escritos, tocar al costado para bajar el
 * teclado tiraría abajo lo cargado.
 */
export function CargarDniDialogo({
  visible,
  nombre,
  corrige,
  control,
  onConfirmar,
  onCancelar,
  guardando,
  mensajeError,
}: CargarDniDialogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Dialogo
      visible={visible}
      onClose={onCancelar}
      tono="info"
      icono={<IdCard size={DIALOGO_ICON_SIZE} color={theme.colors.primary} />}
      titulo={corrige ? 'Corregir el DNI' : 'Cargar el DNI'}
      descripcion={
        corrige
          ? `Con esto se reemplaza el documento de ${nombre}. Queda guardado quién lo cambió y por qué.`
          : `${nombre} va a poder usar la app apenas quede cargado. Revisá el documento con la persona enfrente.`
      }
      cerrarAlTocarFondo={false}
      acciones={[
        {
          label: 'Guardar',
          onPress: onConfirmar,
          loading: guardando,
          disabled: guardando,
        },
        { label: 'Cancelar', onPress: onCancelar, variant: 'secondary', disabled: guardando },
      ]}
    >
      <Controller
        control={control}
        name="dni"
        render={({ field, fieldState }) => (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              DNI
            </Text>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="38.180.903"
              // Teclado numérico: el documento son dígitos y nada más. Los
              // puntos que igual se puedan tipear los saca el schema.
              keyboardType="number-pad"
              autoComplete="off"
              textContentType="none"
              maxLength={MAX_LARGO_DNI_TIPEADO}
              editable={!guardando}
              hasError={fieldState.error !== undefined}
              accessibilityLabel={`Documento de ${nombre}`}
            />
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                Solo los números, con o sin puntos.
              </Text>
            )}
          </View>
        )}
      />

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
              placeholder="Lo cargó mal, faltaba un dígito"
              maxLength={MAX_LARGO_MOTIVO_DNI}
              multiline
              editable={!guardando}
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Motivo del cambio de documento"
            />
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                Queda guardado con tu nombre y la fecha.
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
    campo: { gap: theme.spacing.xs, marginBottom: theme.spacing.md },

    error: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },
  });
