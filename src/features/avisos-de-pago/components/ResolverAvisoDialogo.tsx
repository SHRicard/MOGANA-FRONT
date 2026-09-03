import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import BanknoteArrowUp from 'lucide-react-native/icons/banknote-arrow-up';
import CircleX from 'lucide-react-native/icons/circle-x';
import { CampoFecha } from '@/shared/ui/atoms/CampoFecha';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto, hoyPantalla } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  MAX_LARGO_MOTIVO,
  MAX_LARGO_NOTA_COBRO,
  MEDIO_DE_PAGO_LABEL,
  nombreDelCliente,
  type AvisoDePago,
  type ConfirmarAvisoFormValues,
  type RechazarAvisoFormValues,
} from '../types';
import type { AccionSobreElAviso } from '../hooks';

export interface ResolverAvisoDialogoProps {
  aviso: AvisoDePago | null;
  accion: AccionSobreElAviso;
  confirmarControl: Control<ConfirmarAvisoFormValues>;
  rechazarControl: Control<RechazarAvisoFormValues>;
  onConfirmar: () => void;
  onRechazar: () => void;
  onCerrar: () => void;
  resolviendo: boolean;
  /** Error de la API, **ya redactado**: va tal cual al cartel. */
  mensajeError: string | null;
}

/**
 * **Decidir sobre un aviso**: los dos finales posibles, en un diálogo.
 *
 * Van juntos y no en dos componentes porque son **la misma decisión** con dos
 * salidas: se abre desde el mismo lugar, sobre el mismo aviso, y solo uno de los
 * dos puede estar abierto a la vez. Separarlos obligaría a la pantalla a
 * coordinar dos estados de visibilidad para que no se pisen.
 *
 * **Confirmar** viene precargado con lo que dijo el cliente, así el caso normal
 * —"sí, eso entró"— es abrir y tocar el botón. Los campos están para cuando el
 * banco dice otra cosa: informó $50.000 y entraron $45.000, o dijo el viernes y
 * el movimiento es del jueves. ⚠️ Lo corregido va al **cobro**; el aviso se
 * queda con lo que dijo el cliente, así los dos números quedan escritos y la
 * diferencia se puede explicar después.
 *
 * **Rechazar** pide el motivo, y es obligatorio. No es burocracia: es lo único
 * que le explica al cliente por qué avisó que pagó y le sigue figurando la
 * deuda. Le llega tal cual, así que se escribe pensando en que lo va a leer él.
 */
/**
 * Qué proporción de la pantalla puede ocupar el cuerpo del diálogo.
 *
 * Existe por el calendario: `CampoFecha` lo despliega **en línea**, no flotando,
 * así que al abrirlo la tarjeta crece de golpe. Sin un tope y sin scroll, en un
 * teléfono corto los botones quedarían abajo del borde y no habría forma de
 * confirmar — que es justo lo que el diálogo vino a hacer.
 */
const ALTO_MAXIMO = 0.5;

export function ResolverAvisoDialogo({
  aviso,
  accion,
  confirmarControl,
  rechazarControl,
  onConfirmar,
  onRechazar,
  onCerrar,
  resolviendo,
  mensajeError,
}: ResolverAvisoDialogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height } = useWindowDimensions();

  // El cobro no pudo ser mañana. No se le pone mínimo: el movimiento pudo ser
  // antes de lo que el cliente recuerda.
  const hoy = useMemo(() => hoyPantalla(), []);

  const esConfirmar = accion === 'confirmar';

  return (
    <Dialogo
      visible={aviso !== null && accion !== null}
      onClose={onCerrar}
      // No se cierra tocando el fondo: es una decisión que escribe plata o le
      // manda un aviso a alguien, así que se sale eligiendo.
      cerrarAlTocarFondo={false}
      tono={esConfirmar ? 'exito' : 'peligro'}
      icono={
        esConfirmar ? (
          <BanknoteArrowUp size={DIALOGO_ICON_SIZE} color={theme.colors.success} />
        ) : (
          <CircleX size={DIALOGO_ICON_SIZE} color={theme.colors.error} />
        )
      }
      titulo={esConfirmar ? 'Anotar el cobro' : 'No tomar este pago'}
      descripcion={
        aviso
          ? esConfirmar
            ? `Le vas a bajar la deuda a ${nombreDelCliente(aviso)} y se le avisa en la app.`
            : `${nombreDelCliente(
                aviso,
              )} va a ver el motivo que escribas y le sigue figurando la deuda.`
          : undefined
      }
      acciones={[
        {
          label: esConfirmar ? 'Anotar el cobro' : 'No tomarlo',
          onPress: esConfirmar ? onConfirmar : onRechazar,
          variant: esConfirmar ? 'primary' : 'danger',
          loading: resolviendo,
          disabled: resolviendo,
        },
        { label: 'Cancelar', onPress: onCerrar, variant: 'secondary', disabled: resolviendo },
      ]}
    >
      {aviso ? (
        <ScrollView
          style={{ maxHeight: height * ALTO_MAXIMO }}
          contentContainerStyle={styles.cuerpo}
          // Tocar un día del calendario con el teclado abierto tiene que
          // funcionar a la primera: sin esto, el primer toque solo lo cierra.
          keyboardShouldPersistTaps="handled"
        >
          {/* Lo que dijo el cliente, siempre a la vista: es contra qué se decide. */}
          <View style={styles.informado}>
            <Text variant="caption" color="textMuted">
              {`Informó ${formatMonto(aviso.monto)} por ${MEDIO_DE_PAGO_LABEL[
                aviso.medio
              ].toLowerCase()} el ${formatFecha(aviso.fecha)}${
                aviso.referencia ? `, referencia ${aviso.referencia}` : ''
              }.`}
            </Text>
          </View>

          {esConfirmar ? (
            <>
              <Controller
                control={confirmarControl}
                name="monto"
                render={({ field, fieldState }) => (
                  <View style={styles.campo}>
                    <Text variant="small" weight="medium">
                      Cuánto entró
                    </Text>
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="0,00"
                      keyboardType="decimal-pad"
                      hasError={fieldState.error !== undefined}
                      accessibilityLabel="Monto que se anota como cobrado"
                    />
                    {fieldState.error?.message ? (
                      <Text variant="caption" color="error">
                        {fieldState.error.message}
                      </Text>
                    ) : (
                      <Text variant="caption" color="textMuted">
                        {`Lo que dice el banco. De esta factura falta ${formatMonto(
                          aviso.factura.saldo,
                        )}.`}
                      </Text>
                    )}
                  </View>
                )}
              />

              <CampoFecha
                control={confirmarControl}
                name="fecha"
                label="Cuándo entró"
                helperText="El día del movimiento en el banco."
                fechaMaxima={hoy}
              />

              <Controller
                control={confirmarControl}
                name="nota"
                render={({ field, fieldState }) => (
                  <View style={styles.campo}>
                    <Text variant="small" weight="medium">
                      Nota del cobro (opcional)
                    </Text>
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Entró por caja de ahorro…"
                      maxLength={MAX_LARGO_NOTA_COBRO}
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
            </>
          ) : (
            <Controller
              control={rechazarControl}
              name="motivo"
              render={({ field, fieldState }) => (
                <View style={styles.campo}>
                  <Text variant="small" weight="medium">
                    Por qué no se toma
                  </Text>
                  <Input
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="No figura en el banco"
                    maxLength={MAX_LARGO_MOTIVO}
                    hasError={fieldState.error !== undefined}
                    accessibilityLabel="Motivo por el que no se toma el pago"
                  />
                  {fieldState.error?.message ? (
                    <Text variant="caption" color="error">
                      {fieldState.error.message}
                    </Text>
                  ) : (
                    <Text variant="caption" color="textMuted">
                      Lo lee el cliente tal cual lo escribas. Es lo único que le explica por qué
                      sigue debiendo.
                    </Text>
                  )}
                </View>
              )}
            />
          )}

          {/*
            ⚠️ Rechazar BORRA la imagen del comprobante. Se avisa antes, no
            después: es lo único que después no se puede recuperar.
          */}
          {!esConfirmar && aviso.comprobante ? (
            <Text variant="caption" color="textMuted">
              Al no tomarlo se borra el comprobante que mandó. El motivo queda escrito igual.
            </Text>
          ) : null}

          {mensajeError ? (
            <View style={styles.error} accessible accessibilityRole="alert">
              <Text variant="small" color="error">
                {mensajeError}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </Dialogo>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /** Va en `contentContainerStyle`: el `gap` tiene que separar los hijos, no la lista. */
    cuerpo: { gap: theme.spacing.md, paddingBottom: theme.spacing.xs },
    campo: { gap: theme.spacing.xs },

    informado: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.md,
    },

    error: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
    },
  });
