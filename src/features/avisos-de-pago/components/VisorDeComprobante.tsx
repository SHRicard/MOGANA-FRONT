import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImageOff from 'lucide-react-native/icons/image-off';
import X from 'lucide-react-native/icons/x';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

export interface VisorDeComprobanteProps {
  /** El link firmado, o `null` para no mostrar nada. */
  url: string | null;
  onCerrar: () => void;
}

const ICON_SIZE = 24;
const ICON_SIZE_GRANDE = 40;
/** Alto del área táctil del botón de cerrar. */
const CERRAR_SIZE = 44;

/**
 * **El comprobante a pantalla completa**, para poder leerlo.
 *
 * Existe porque la miniatura de la tarjeta no alcanza: lo que hay que leer de un
 * comprobante es el número de operación, el alias y el monto, y eso en 160
 * píxeles de alto no se ve. Confirmar un cobro sin poder leerlo es confirmar a
 * ciegas.
 *
 * ⚠️ **NO usa el `Modal` de React Native**, por lo mismo que `Dialogo`: un Modal
 * es una ventana nativa aparte que no hereda el edge-to-edge, así que Android le
 * pinta su propia barra de navegación. Es una view absoluta, así que **hay que
 * montarlo como hermano del contenido de la pantalla** —no adentro de un
 * `FlatList`— para que tape todo.
 *
 * Fondo negro y no del theme: es un visor de imagen, y lo que importa es que se
 * vea el papel. Un fondo claro alrededor de una captura blanca borra los bordes.
 */
export function VisorDeComprobante({ url, onCerrar }: VisorDeComprobanteProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  // Cada imagen nueva arranca su propio estado de carga: sin esto, abrir un
  // segundo comprobante después de uno que falló muestra el cartel de error.
  useEffect(() => {
    setCargando(true);
    setFallo(false);
  }, [url]);

  /**
   * El "atrás" de Android cierra el visor en vez de navegar.
   *
   * Sin esto, quien abre una imagen y aprieta atrás se va de la bandeja entera,
   * que es lo último que quiere: estaba mirando un comprobante para decidir.
   */
  useEffect(() => {
    if (!url) {
      return;
    }
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      onCerrar();
      return true;
    });
    return () => suscripcion.remove();
  }, [url, onCerrar]);

  const alCargar = useCallback(() => setCargando(false), []);
  const alFallar = useCallback(() => {
    setCargando(false);
    setFallo(true);
  }, []);

  if (!url) {
    return null;
  }

  return (
    <View style={styles.fondo} accessibilityViewIsModal>
      {/* Tocar el fondo cierra: es el gesto esperado de cualquier visor. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} accessible={false} />

      {fallo ? (
        <View style={styles.centrado} accessible accessibilityRole="alert">
          <ImageOff size={ICON_SIZE_GRANDE} color={theme.colors.onPrimary} />
          <Text variant="body" color="onPrimary" align="center">
            No pudimos abrir el comprobante.
          </Text>
          <Text variant="small" color="onPrimary" align="center">
            El link se vence al rato. Cerrá, tirá para abajo y volvé a entrar.
          </Text>
        </View>
      ) : (
        <>
          <Image
            source={{ uri: url }}
            style={styles.imagen}
            // `contain`: es un documento, y recortarle los bordes puede tapar
            // justo el número de operación que se está buscando.
            resizeMode="contain"
            onLoadEnd={alCargar}
            onError={alFallar}
            accessible
            accessibilityRole="image"
            accessibilityLabel="Comprobante en pantalla completa"
          />
          {cargando ? (
            <View style={styles.centrado} pointerEvents="none">
              <ActivityIndicator size="large" color={theme.colors.onPrimary} />
            </View>
          ) : null}
        </>
      )}

      <Pressable
        onPress={onCerrar}
        style={[styles.cerrar, { top: insets.top + theme.spacing.sm }]}
        accessibilityRole="button"
        accessibilityLabel="Cerrar el comprobante"
      >
        <X size={ICON_SIZE} color={theme.colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fondo: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.scrim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imagen: { width: '100%', height: '100%' },
    centrado: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.xl,
    },
    cerrar: {
      position: 'absolute',
      right: theme.spacing.md,
      width: CERRAR_SIZE,
      height: CERRAR_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.overlay,
    },
  });
