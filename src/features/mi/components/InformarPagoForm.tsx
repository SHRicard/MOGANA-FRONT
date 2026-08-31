import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { Button } from '@/shared/ui/atoms/Button';
import { CampoFecha } from '@/shared/ui/atoms/CampoFecha';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto, hoyPantalla } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { MAX_LARGO_NOTA_AVISO, MAX_LARGO_REFERENCIA, type InformarPagoFormValues } from '../types';
import { SelectorDeMedio } from './SelectorDeMedio';

export interface InformarPagoFormProps {
  control: Control<InformarPagoFormValues>;
  /** `saldo − lo ya informado`: el valor propuesto y también el tope. */
  maximo: number;
  /** El día de la factura, en formato de API. Antes de eso no existía. */
  fechaEmision: string;
  onEnviar: () => void;
  onCancelar: () => void;
  enviando: boolean;
  /** Error de la API, **ya redactado**: va tal cual al cartel. */
  mensajeError: string | null;
}

const ICON_SIZE = 16;

/**
 * El formulario de **avisar que pagué** (`docs/user_cliente_flujo.md` §8).
 *
 * ⚠️ Lo primero, porque cambia el diseño entero de la pantalla: **esto no
 * descuenta nada**. Por eso el botón dice "Avisar que pagué" y no "Pagar", el
 * aviso de arriba lo explica antes de que alguien lo mande, y no hay ningún
 * spinner de "procesando pago" — no hay pago que procesar.
 *
 * **El monto arranca en el máximo y la fecha en hoy**, así que el caso normal
 * —"pagué todo, hoy"— es abrir y tocar el botón.
 *
 * **La fecha es la del movimiento, no la del aviso**: la transferencia pudo
 * salir el viernes y el aviso llegar el lunes. Si se guardara la del aviso, una
 * factura pagada en fecha figuraría pagada tarde. Por eso el calendario va de la
 * emisión de la factura hasta hoy, y los días de afuera quedan apagados.
 *
 * **La referencia es opcional pero se pide.** Es lo único que le permite al
 * negocio encontrar el movimiento; sin ella, confirmar el aviso obliga a revisar
 * el resumen del banco a ojo. Por eso el placeholder trae un ejemplo real en vez
 * de un asterisco.
 */
export function InformarPagoForm({
  control,
  maximo,
  fechaEmision,
  onEnviar,
  onCancelar,
  enviando,
  mensajeError,
}: InformarPagoFormProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // El pago no pudo ser mañana. Se calcula una vez por montaje: el formulario no
  // sobrevive a un cambio de día.
  const hoy = useMemo(() => hoyPantalla(), []);
  // El calendario habla en día/mes/año y la factura llega en `AAAA-MM-DD`.
  const emision = useMemo(() => formatFecha(fechaEmision), [fechaEmision]);

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="monto"
        render={({ field, fieldState }) => (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              Cuánto pagaste
            </Text>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="0,00"
              keyboardType="decimal-pad"
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Monto que pagaste, en pesos"
            />
            {/* El error no se comunica solo con el borde rojo: va el texto. */}
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                {`Podés informar hasta ${formatMonto(maximo)}`}
              </Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="medio"
        render={({ field }) => <SelectorDeMedio value={field.value} onChange={field.onChange} />}
      />

      <CampoFecha
        control={control}
        name="fecha"
        label="Cuándo lo pagaste"
        helperText={`El día del movimiento, no el de hoy. Desde el ${emision}.`}
        fechaMinima={emision}
        fechaMaxima={hoy}
      />

      <Controller
        control={control}
        name="referencia"
        render={({ field, fieldState }) => (
          <View style={styles.campo}>
            <Text variant="small" weight="medium">
              Número de operación
            </Text>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="ej. OP-88213345"
              maxLength={MAX_LARGO_REFERENCIA}
              autoCapitalize="characters"
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Número de operación o comprobante"
            />
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                Es lo que nos deja encontrar tu pago. Si no lo tenés, mandalo igual.
              </Text>
            )}
          </View>
        )}
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
              placeholder="Pagué la mitad ahora…"
              maxLength={MAX_LARGO_NOTA_AVISO}
              hasError={fieldState.error !== undefined}
              accessibilityLabel="Nota del aviso"
            />
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      {/*
        Va ANTES del botón, no después de mandar: es lo que evita que alguien
        crea que apretando acá salda la cuenta.
      */}
      <View style={styles.advertencia} accessible accessibilityRole="alert">
        <TriangleAlert size={ICON_SIZE} color={theme.colors.onWarningMuted} />
        <View style={styles.advertenciaTexto}>
          <Text variant="caption" color="onWarningMuted">
            Avisar no descuenta la deuda. La confirmamos contra el banco y te avisamos.
          </Text>
        </View>
      </View>

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
          {/* "Avisar que pagué", nunca "Pagar": acá no se paga nada. */}
          <Button
            label="Avisar que pagué"
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
    form: { gap: theme.spacing.md },
    campo: { gap: theme.spacing.xs },

    advertencia: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.lg,
    },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al ícono. */
    advertenciaTexto: { flex: 1 },

    acciones: { flexDirection: 'row', gap: theme.spacing.sm },
    /** Los dos botones se reparten el ancho: ninguno es "el chiquito". */
    accion: { flex: 1 },

    error: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },
  });
