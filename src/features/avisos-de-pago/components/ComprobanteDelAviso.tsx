import { memo, useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import FileX from 'lucide-react-native/icons/file-x';
import ImageOff from 'lucide-react-native/icons/image-off';
import Maximize2 from 'lucide-react-native/icons/maximize-2';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { hayImagen, textoDelBorrado, type Comprobante } from '../types';

export interface ComprobanteDelAvisoProps {
  /** `null` si el cliente avisó sin adjuntar nada (efectivo, o un aviso viejo). */
  comprobante: Comprobante | null | undefined;
  /** Abrir la imagen en grande. Sin esto la miniatura no es clickeable. */
  onAmpliar?: (url: string) => void;
}

const ICON_SIZE = 18;
/** Alto de la miniatura en la tarjeta: se reconoce sin dominar el renglón. */
const ALTO = 160;

/**
 * **La captura que mandó el cliente**, en la bandeja del panel.
 *
 * ⚠️ **Miralo antes de confirmar.** Es lo que evita tener que ir a buscar el
 * movimiento en el resumen del banco a ojo, y es la razón por la que esta
 * pantalla existe.
 *
 * Distingue **tres situaciones que no son la misma** y que la pantalla tiene que
 * saber separar:
 *
 * | | Qué pasó | Qué muestra |
 * |---|---|---|
 * | `null` | nunca hubo: pagó en efectivo, o el aviso es anterior a esta función | nada |
 * | `estado: 'disponible'` | la imagen está | la miniatura, clickeable |
 * | `estado: 'borrado'` | hubo y ya no está | por qué se borró |
 *
 * La tercera importa más de lo que parece: un comprobante borrado **no es lo
 * mismo que un aviso sin comprobante**, y quien mira el archivo tiene que poder
 * distinguirlos.
 *
 * ⚠️ **El link se vence en una hora.** Se dibuja del que vino en esta respuesta
 * y no se guarda en ningún lado. Si la pantalla estuvo abierta mucho rato el
 * link ya venció, y lo que lo arregla es **volver a pedir la lista** —el gesto
 * de tirar para abajo—, no reintentar la imagen.
 */
function ComprobanteDelAvisoComponent({ comprobante, onAmpliar }: ComprobanteDelAvisoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [vencida, setVencida] = useState(false);

  const grande = comprobante?.url ?? null;
  const miniatura = comprobante?.miniatura ?? comprobante?.url ?? null;

  const ampliar = useCallback(() => {
    if (grande && onAmpliar) {
      onAmpliar(grande);
    }
  }, [grande, onAmpliar]);

  // Nunca hubo comprobante. Se dice, en vez de no mostrar nada: quien decide
  // tiene que saber que acá no hay nada que mirar y no que se olvidó de cargar.
  if (!comprobante) {
    return (
      <View style={styles.vacio}>
        <FileX size={ICON_SIZE} color={theme.colors.textMuted} />
        <Text variant="caption" color="textMuted">
          Avisó sin adjuntar comprobante.
        </Text>
      </View>
    );
  }

  // Hubo y ya no está. El motivo importa: "se borró al rechazarlo" y "lo borró
  // el negocio" no se leen igual.
  if (!hayImagen(comprobante)) {
    return (
      <View style={styles.vacio}>
        <FileX size={ICON_SIZE} color={theme.colors.textMuted} />
        <Text variant="caption" color="textMuted">
          {textoDelBorrado(comprobante)}
        </Text>
      </View>
    );
  }

  if (vencida) {
    return (
      <View style={styles.vacio} accessible accessibilityRole="alert">
        <ImageOff size={ICON_SIZE} color={theme.colors.textMuted} />
        <Text variant="caption" color="textMuted">
          El link del comprobante se venció. Tirá para abajo para volver a verlo.
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={ampliar}
      disabled={!grande || !onAmpliar}
      style={({ pressed }) => [styles.marco, pressed && styles.presionado]}
      accessibilityRole="imagebutton"
      accessibilityLabel="Ver el comprobante en grande"
    >
      {/*
        `cover` acá y `contain` en el visor: en la tarjeta lo que hace falta es
        reconocer que hay algo y que se lee, y una imagen "entera" y chiquita
        adentro de un marco ancho se ve peor. Para leerlo está el toque.
      */}
      <Image
        source={{ uri: miniatura ?? undefined }}
        style={styles.imagen}
        resizeMode="cover"
        onError={() => setVencida(true)}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Comprobante que mandó el cliente"
      />
      {onAmpliar && grande ? (
        <View style={styles.lupa}>
          <Maximize2 size={ICON_SIZE} color={theme.colors.onPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    marco: {
      height: ALTO,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    presionado: { opacity: 0.85 },
    imagen: { width: '100%', height: '100%' },

    /** Un botón flotante chico: dice que se puede tocar sin tapar el papel. */
    lupa: {
      position: 'absolute',
      right: theme.spacing.sm,
      bottom: theme.spacing.sm,
      padding: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.full,
    },

    vacio: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.md,
    },
  });

export const ComprobanteDelAviso = memo(ComprobanteDelAvisoComponent);
