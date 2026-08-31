import { useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Palette from 'lucide-react-native/icons/palette';
import { useTheme, type Theme } from '@/theme';

const SIZE = 52;
const MARGIN = 16;

interface DevToolsFabProps {
  onPress: () => void;
}

/**
 * Botón flotante de herramientas de desarrollo.
 *
 * ⚠️ Solo se renderiza con `__DEV__`: en un build de release devuelve null y
 * nunca llega al usuario final.
 *
 * Es arrastrable a propósito: al estar fijo sobre toda la app, taparía los
 * botones de abajo de las pantallas (el "Ingresar" del login, por ejemplo).
 * Se mueve con un drag y se activa con un tap.
 */
export function DevToolsFab({ onPress }: DevToolsFabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Posición de reposo: abajo a la derecha. El drag se mueve desde ahí, así que
  // los desplazamientos válidos son negativos (hacia arriba y hacia la izquierda).
  const minX = -(width - SIZE - MARGIN * 2);
  const minY = -(height - SIZE - MARGIN - insets.bottom - insets.top);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Clamp: que no se pueda arrastrar fuera de la pantalla y quedar inalcanzable.
      translateX.value = Math.min(0, Math.max(minX, startX.value + event.translationX));
      translateY.value = Math.min(0, Math.max(minY, startY.value + event.translationY));
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  if (!__DEV__) {
    return null;
  }

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.container, { bottom: insets.bottom + MARGIN }, animatedStyle]}>
        <Pressable
          onPress={onPress}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Abrir el catálogo del design system"
          accessibilityHint="Herramienta de desarrollo. Mantené presionado y arrastrá para moverlo."
        >
          <Palette size={24} color={theme.colors.onPrimary} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      right: MARGIN,
      width: SIZE,
      height: SIZE,
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      // Sombra para que se despegue del contenido de abajo.
      elevation: 6,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
  });
