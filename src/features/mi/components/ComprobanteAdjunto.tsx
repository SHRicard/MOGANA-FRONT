import { memo, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import ImageOff from 'lucide-react-native/icons/image-off';
import { Text } from '@/shared/ui/atoms/Text';
import type { ComprobanteCompartido } from '@/services/share';
import { useTheme, type Theme } from '@/theme';

export interface ComprobanteAdjuntoProps {
  comprobante: ComprobanteCompartido;
}

const ICON_SIZE = 24;
/** Alto de la miniatura: se reconoce la captura sin comerse la pantalla. */
const ALTO = 180;

/**
 * La captura que llegó por la hoja de compartir
 * (`docs/compartir_comprobante.md` §3).
 *
 * **Va arriba de todo, antes que cualquier campo.** El cliente viene de otra app
 * y lo primero que necesita es ver que se compartió lo que quería; recién
 * después tiene sentido pedirle que complete datos. Con la miniatura abajo, se
 * llena el formulario a ciegas.
 *
 * Se dibuja desde el archivo local que copió el módulo nativo, no desde el
 * `content://` original: ese URI puede haber dejado de servir hace rato.
 *
 * `contain` y no `cover`: es un comprobante, y recortarle los bordes puede
 * tapar justo el número de operación que se quiere chequear antes de mandar.
 */
function ComprobanteAdjuntoComponent({ comprobante }: ComprobanteAdjuntoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [fallo, setFallo] = useState(false);

  return (
    <View style={styles.marco}>
      {fallo ? (
        /*
          El archivo ya no está: se pudo limpiar por vencimiento, o el sistema
          liberó la caché. Se dice, en vez de dejar un rectángulo gris: lo que
          sigue es volver a compartir desde la billetera, no reintentar acá.
        */
        <View style={styles.roto} accessible accessibilityRole="alert">
          <ImageOff size={ICON_SIZE} color={theme.colors.textMuted} />
          <Text variant="small" color="textMuted" align="center">
            No pudimos mostrar la imagen. Volvé a compartirla desde tu billetera.
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: comprobante.archivo }}
          style={styles.imagen}
          resizeMode="contain"
          onError={() => setFallo(true)}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Comprobante compartido: ${comprobante.nombre}`}
        />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
  });

export const ComprobanteAdjunto = memo(ComprobanteAdjuntoComponent);
