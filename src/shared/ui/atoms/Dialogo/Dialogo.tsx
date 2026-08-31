import { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/shared/ui/atoms/Button';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type ThemeColors } from '@/theme';
import { createStyles } from './Dialogo.styles';
import type { DialogoProps, DialogoTono } from './Dialogo.types';

/**
 * Tamaño del ícono que va en el círculo. Se exporta para que quien arme el
 * diálogo no invente un número: todos se ven igual de grandes.
 */
export const DIALOGO_ICON_SIZE = 28;

/** Entrada: `out` desacelera al final — la tarjeta llega y se asienta. */
const ABRIR = { duration: 220, easing: Easing.out(Easing.cubic) };
/** Salida más corta: cerrar tiene que sentirse inmediato. */
const CERRAR = { duration: 150, easing: Easing.in(Easing.cubic) };

/** Desde qué escala entra. Apenas: un salto grande se lee como un rebote. */
const ESCALA_INICIAL = 0.94;

/** Cuánto sube al entrar, en píxeles. */
const DESPLAZAMIENTO = 12;

/** El fondo del círculo del ícono según el tono. */
const FONDO_TONO: Record<DialogoTono, keyof ThemeColors> = {
  exito: 'successMuted',
  info: 'primaryMuted',
  peligro: 'errorMuted',
};

/**
 * Diálogo centrado: un ícono, un título, una explicación y hasta dos botones.
 *
 * Es lo que reemplaza al `Alert.alert` del sistema, que se ve distinto en cada
 * teléfono, no conoce el theme —en modo oscuro aparece un cuadro blanco— y no
 * deja poner nada adentro más que texto plano. Acá el contenido es libre: se le
 * puede pasar el resumen de lo que se acaba de crear.
 *
 * ⚠️ **NO usa el `Modal` de React Native**, y no es un olvido: un Modal es una
 * ventana nativa aparte que no hereda el edge-to-edge de la app, así que Android
 * le pinta su propia barra de navegación (el mismo motivo por el que `MenuSheet`
 * y el calendario son views absolutas). Esto es una view absoluta que cubre a su
 * padre, así que **hay que montarlo como hermano del contenido de la pantalla**
 * —no adentro de un `ScrollView`— para que tape todo.
 *
 * Con `bloqueante` no se cierra solo: ni el fondo ni el "atrás" tienen efecto, y
 * la única salida son sus botones. Es para cuando la app no puede seguir hasta
 * que la persona resuelva algo — ver `DialogoBloqueante`.
 *
 * Sin lógica de negocio: recibe si está visible y qué botones tiene, y avisa
 * cuándo se lo quiso cerrar.
 */
export function Dialogo(props: DialogoProps) {
  const { visible, titulo, descripcion, tono = 'info', icono, children, acciones } = props;

  // El bloqueo saca las dos salidas de una: no hay `onClose` al que llamar y el
  // fondo deja de cerrar. Se lee del `props` sin desestructurar porque es lo que
  // discrimina la unión — desestructurado, TypeScript pierde el estrechamiento.
  const bloqueante = props.bloqueante === true;
  const onClose = props.bloqueante === true ? undefined : props.onClose;
  const cerrarAlTocarFondo = props.bloqueante === true ? false : props.cerrarAlTocarFondo ?? true;

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Red de seguridad de la regla que dice `DialogoBloqueante`: si el bloqueo no
  // ofrece ningún botón, la app queda trabada y no hay forma de darse cuenta
  // mirando el código de la pantalla. Solo en desarrollo.
  useEffect(() => {
    if (__DEV__ && bloqueante && (acciones === undefined || acciones.length === 0)) {
      console.warn(
        '[Dialogo] Un diálogo bloqueante sin acciones no tiene salida: la app queda trabada.',
      );
    }
  }, [bloqueante, acciones]);

  /**
   * Se mantiene montado durante la animación de cierre: si se desmontara con
   * `visible`, la tarjeta desaparecería de golpe en vez de irse.
   */
  const [montado, setMontado] = useState(visible);

  /** 0 = cerrado (transparente y apenas más chico), 1 = abierto. */
  const progreso = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Primero montar y recién en la pasada siguiente animar: arrancar antes
      // de que la tarjeta exista se come los primeros frames.
      if (!montado) {
        setMontado(true);
        return;
      }

      progreso.value = withTiming(1, ABRIR);
      return;
    }

    if (!montado) {
      return;
    }

    progreso.value = withTiming(0, CERRAR, (terminó) => {
      if (terminó) {
        runOnJS(setMontado)(false);
      }
    });
  }, [visible, montado, progreso]);

  // El "atrás" de Android. Lo hacía el Modal solo; sin él, el "atrás" navegaría
  // hacia atrás con el diálogo abierto encima.
  useEffect(() => {
    if (!visible) {
      return;
    }

    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      // En un diálogo bloqueante no hay `onClose`: el evento se consume igual y
      // no pasa nada, que es justo lo que se espera de un bloqueo.
      onClose?.();
      // true = el evento se consumió acá y no sigue hacia el navigator.
      return true;
    });

    return () => suscripcion.remove();
  }, [visible, onClose]);

  const estiloFondo = useAnimatedStyle(() => ({ opacity: progreso.value }));

  const estiloTarjeta = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [
      { scale: ESCALA_INICIAL + (1 - ESCALA_INICIAL) * progreso.value },
      { translateY: DESPLAZAMIENTO * (1 - progreso.value) },
    ],
  }));

  if (!montado) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      {/* El fondo oscurecido. Es lo que come los toques de la pantalla de atrás,
          esté o no habilitado el cierre — y en un bloqueo es lo único que impide
          seguir usando la app. */}
      <Pressable
        onPress={cerrarAlTocarFondo ? onClose : undefined}
        style={StyleSheet.absoluteFill}
        accessibilityRole={cerrarAlTocarFondo ? 'button' : undefined}
        accessibilityLabel={cerrarAlTocarFondo ? 'Cerrar' : undefined}
        // Sin cierre por fondo no es un control: no tiene que aparecer en el
        // recorrido del lector de pantalla.
        accessible={cerrarAlTocarFondo}
      >
        <Animated.View style={[styles.backdrop, estiloFondo]} />
      </Pressable>

      {/*
        Un diálogo puede tener un campo adentro (el motivo de una anulación). En
        iOS el teclado taparía los botones; en Android lo resuelve el
        `adjustResize` del manifiesto.
      */}
      <KeyboardAvoidingView
        style={styles.centro}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[styles.tarjeta, estiloTarjeta]}
          // Para el lector de pantalla, lo de atrás deja de existir mientras esto
          // está abierto.
          accessibilityViewIsModal
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {icono ? (
            // Decorativo: lo que pasó lo dice el título, no el dibujo.
            <View
              style={[styles.circulo, { backgroundColor: theme.colors[FONDO_TONO[tono]] }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {icono}
            </View>
          ) : null}

          <Text variant="title" weight="semibold" align="center">
            {titulo}
          </Text>

          {descripcion ? (
            <Text variant="small" color="textMuted" align="center">
              {descripcion}
            </Text>
          ) : null}

          {children ? <View style={styles.cuerpo}>{children}</View> : null}

          {acciones && acciones.length > 0 ? (
            <View style={styles.acciones}>
              {acciones.map((accion, indice) => (
                <Button
                  key={accion.label}
                  label={accion.label}
                  onPress={accion.onPress}
                  // La primera es la acción principal; las demás la acompañan.
                  variant={accion.variant ?? (indice === 0 ? 'primary' : 'secondary')}
                  loading={accion.loading}
                  disabled={accion.disabled}
                  accessibilityLabel={accion.accessibilityLabel}
                  fullWidth
                />
              ))}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
