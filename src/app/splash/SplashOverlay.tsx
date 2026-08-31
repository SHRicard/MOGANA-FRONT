import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { Logo } from '@/shared/ui/atoms/Logo';
import { useTheme } from '@/theme';

/**
 * Continuación en JS de la splash nativa.
 *
 * El arranque tiene un hueco: el sistema muestra la splash nativa, después crea
 * la ventana de la app, y recién ahí React pinta el primer frame. Ese tramo del
 * medio no lo controla JS. Del lado nativo ya está tapado (en Android el
 * `windowBackground` sigue siendo el logo), pero cuando React finalmente pinta,
 * el logo desaparecía de golpe y aparecía el login: un corte seco.
 *
 * Este overlay arranca visible sobre el primer frame de React, con el logo en la
 * MISMA posición y tamaño que la splash nativa, y se desvanece. Visualmente es
 * una sola pantalla que se funde hacia la app.
 *
 * ❌ No es una pantalla de carga: no espera datos ni bloquea nada. El estado de
 * sesión se lee sincrónico de MMKV, así que el login ya está montado debajo
 * desde el primer frame.
 */

/** Duración del fundido. Corto a propósito: no es una animación de marca. */
const FADE_DURATION_MS = 220;

/**
 * Ancho del logo, igualado al de la splash nativa de cada plataforma para que no
 * pegue un salto de tamaño en el cruce.
 * - Android: 170dp — el máximo que entra en el círculo con el que Android 12+
 *   enmascara el ícono de su splash (ver drawable/splash_logo.xml).
 * - iOS: 280pt — el LaunchScreen.storyboard no tiene esa restricción.
 */
const LOGO_WIDTH = Platform.select({ android: 170, default: 280 });

export function SplashOverlay() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Un frame de margen: garantiza que lo de abajo ya se pintó antes de fundir.
    const frame = requestAnimationFrame(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsHidden(true);
        }
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [opacity]);

  // Se desmonta al terminar: no queda una view de pantalla completa colgada.
  if (isHidden) {
    return null;
  }

  return (
    <Animated.View
      // Nunca intercepta toques: si algo fallara y no llegara a desmontarse,
      // la app seguiría siendo usable igual.
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: theme.colors.splashBackground, opacity },
      ]}
    >
      <Logo width={LOGO_WIDTH} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
