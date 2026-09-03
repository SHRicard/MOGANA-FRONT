import { memo, useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Camera from 'lucide-react-native/icons/camera';
import ImageIcon from 'lucide-react-native/icons/image';
import ImageOff from 'lucide-react-native/icons/image-off';
import { Button } from '@/shared/ui/atoms/Button';
import { Text } from '@/shared/ui/atoms/Text';
import { imagenesService, type ImagenElegida, type ImagenLocal } from '@/services/imagenes';
import { useTheme, type Theme } from '@/theme';
import { MAX_COMPROBANTE_BYTES, REGLA_DEL_COMPROBANTE } from '../types';

export interface SelectorDeComprobanteProps {
  /** La imagen elegida, o `null` si todavía no hay ninguna. */
  valor: ImagenLocal | null;
  onCambio: (imagen: ImagenLocal | null) => void;
  /** Si con el medio elegido el backend la va a exigir. */
  obligatorio: boolean;
  /** Se apaga mientras se manda el aviso: cambiar la imagen ahí no haría nada. */
  deshabilitado?: boolean;
}

const ICON_SIZE = 18;
/** Alto de la miniatura: se reconoce la captura sin comerse el formulario. */
const ALTO = 200;

/** Cuántos megas son el tope, para escribirlo sin repetir la cuenta. */
const MAX_MB = MAX_COMPROBANTE_BYTES / (1024 * 1024);

/** Qué se dice de cada final que no es "quedó elegida". */
const MENSAJE: Record<Exclude<ImagenElegida['estado'], 'elegida' | 'cancelada'>, string> = {
  sin_permiso: 'Necesitamos permiso para acceder a tus fotos. Podés dárnoslo desde los ajustes.',
  muy_pesada: `Esa imagen pesa más de ${MAX_MB} MB. Probá con una captura de pantalla.`,
  // Dice qué SÍ sirve, no solo qué falló: quien eligió un GIF o un archivo raro
  // necesita saber con qué reemplazarlo, y "formato no válido" no se lo dice.
  formato_no_valido: 'Eso no es una foto que podamos guardar. Mandá una captura o una foto (JPG, PNG, WebP o HEIC).',
  error: 'No pudimos abrir la imagen. Probá de nuevo o elegí otra.',
};

/**
 * **Adjuntar la captura del pago** (`docs/README_FRONT_COMPROBANTES.md` §4).
 *
 * Es la otra forma de conseguir el comprobante: la de adentro de la app, para
 * quien entra por su factura en vez de compartir desde la billetera. Termina en
 * el mismo `POST` con `multipart/form-data`.
 *
 * Tres cosas que el doc marca y acá se cumplen:
 *
 * 1. **El campo cambia de obligatorio a opcional según el medio.** Se dice
 *    arriba, en el título, y no como un error que aparece al mandar.
 * 2. **La miniatura siempre a la vista antes de mandar.** Se compartió la
 *    captura equivocada más veces de las que uno cree, y verla cuesta cero.
 * 3. **El tope de 8 MB se corta acá.** Un `413` no se arregla desde el
 *    formulario: hay que elegir otra imagen, así que hay que decirlo al elegir.
 *
 * ⚠️ El error de "falta el comprobante" **no se dibuja acá**: quien apaga el
 * botón de enviar es el formulario, y duplicar el cartel haría que la misma
 * regla se cuente dos veces en la misma pantalla.
 */
function SelectorDeComprobanteComponent({
  valor,
  onCambio,
  obligatorio,
  deshabilitado = false,
}: SelectorDeComprobanteProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /** Lo que salió mal en el último intento de elegir, o `null`. */
  const [problema, setProblema] = useState<string | null>(null);
  /** El archivo se borró entre que se eligió y se dibujó. Raro, pero pasa. */
  const [falloLaVista, setFalloLaVista] = useState(false);
  /** El picker está abierto: sin esto se abren dos galerías con dos toques. */
  const [abriendo, setAbriendo] = useState(false);

  const elegir = useCallback(
    async (desdeCamara: boolean) => {
      if (abriendo) {
        return;
      }
      setAbriendo(true);
      setProblema(null);

      const resultado = await imagenesService.elegir({
        desdeCamara,
        ...REGLA_DEL_COMPROBANTE,
      });
      setAbriendo(false);

      // Cerrar el picker sin elegir fue a propósito: no se dice nada.
      if (resultado.estado === 'cancelada') {
        return;
      }
      if (resultado.estado !== 'elegida') {
        setProblema(MENSAJE[resultado.estado]);
        return;
      }

      setFalloLaVista(false);
      onCambio(resultado.imagen);
    },
    [abriendo, onCambio],
  );

  const desdeGaleria = useCallback(() => {
    elegir(false).catch(() => setProblema(MENSAJE.error));
  }, [elegir]);

  const desdeCamara = useCallback(() => {
    elegir(true).catch(() => setProblema(MENSAJE.error));
  }, [elegir]);

  const quitar = useCallback(() => {
    setProblema(null);
    setFalloLaVista(false);
    onCambio(null);
  }, [onCambio]);

  return (
    <View style={styles.campo}>
      <Text variant="small" weight="medium">
        {obligatorio ? 'Comprobante del pago' : 'Comprobante del pago (opcional)'}
      </Text>

      {valor ? (
        <>
          <View style={styles.marco}>
            {falloLaVista ? (
              <View style={styles.roto} accessible accessibilityRole="alert">
                <ImageOff size={ICON_SIZE} color={theme.colors.textMuted} />
                <Text variant="small" color="textMuted" align="center">
                  No pudimos mostrar la imagen. Elegila de nuevo.
                </Text>
              </View>
            ) : (
              /*
                `contain` y no `cover`: es un comprobante, y recortarle los
                bordes puede tapar justo el número de operación que se quiere
                chequear antes de mandar.
              */
              <Image
                source={{ uri: valor.archivo }}
                style={styles.imagen}
                resizeMode="contain"
                onError={() => setFalloLaVista(true)}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Comprobante adjunto: ${valor.nombre}`}
              />
            )}
          </View>

          <View style={styles.acciones}>
            <View style={styles.accion}>
              <Button
                label="Cambiar"
                variant="secondary"
                size="sm"
                onPress={desdeGaleria}
                disabled={deshabilitado || abriendo}
                fullWidth
              />
            </View>
            <View style={styles.accion}>
              <Button
                label="Quitar"
                variant="ghost"
                size="sm"
                onPress={quitar}
                disabled={deshabilitado}
                fullWidth
              />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.acciones}>
          {/* La galería primero: la captura del pago ya está en el teléfono. */}
          <View style={styles.accion}>
            <Button
              label="Elegir de la galería"
              variant="secondary"
              size="sm"
              leftIcon={<ImageIcon size={ICON_SIZE} color={theme.colors.primary} />}
              onPress={desdeGaleria}
              disabled={deshabilitado || abriendo}
              fullWidth
            />
          </View>
          {/* La cámara es para el ticket de papel del depósito o del efectivo. */}
          <View style={styles.accion}>
            <Button
              label="Sacar una foto"
              variant="secondary"
              size="sm"
              leftIcon={<Camera size={ICON_SIZE} color={theme.colors.primary} />}
              onPress={desdeCamara}
              disabled={deshabilitado || abriendo}
              fullWidth
            />
          </View>
        </View>
      )}

      {problema ? (
        <Text variant="caption" color="error" accessibilityRole="alert">
          {problema}
        </Text>
      ) : (
        <Text variant="caption" color="textMuted">
          {obligatorio
            ? `Una imagen de hasta ${MAX_MB} MB. Es lo que nos deja confirmar tu pago.`
            : `Si tenés un ticket o una captura, sumala. Hasta ${MAX_MB} MB.`}
        </Text>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    campo: { gap: theme.spacing.xs },

    marco: {
      height: ALTO,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    imagen: { width: '100%', height: '100%' },
    roto: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },

    acciones: { flexDirection: 'row', gap: theme.spacing.sm },
    /** Los dos se reparten el ancho: ninguno es "el chiquito". */
    accion: { flex: 1 },
  });

export const SelectorDeComprobante = memo(SelectorDeComprobanteComponent);
