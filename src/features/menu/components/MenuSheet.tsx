import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import LogOut from 'lucide-react-native/icons/log-out';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { RootRoute } from '@/app/navigation/routes';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme } from '@/theme';
import { useCerrarSesion, useMenuHeader, useMenuItems } from '../hooks';
import { MenuAcciones, type MenuAccion } from '../menuItems';
import { createStyles, MENU_ICON_SIZE } from './MenuSheet.styles';
import type { MenuSheetProps } from './MenuSheet.types';

/**
 * Panel del tab "Más": sube desde abajo por el eje Y y ocupa la pantalla
 * completa (menos la franja de arriba, que deja ver el fondo oscurecido).
 *
 * ⚠️ NO usa `Modal`: un Modal es una ventana nativa aparte que no hereda el
 * edge-to-edge de la app, así que Android le pinta su propia navigation bar
 * (se veía la barra de abajo del sistema en blanco al abrir el panel). Acá es
 * una view absoluta hermana del navigator: comparte la ventana de la app, y las
 * barras del sistema se quedan con el color que ya tenían.
 *
 * Las filas **con `route`** son tocables: cierran el panel y navegan. Las que
 * tienen **`accion`** también, pero no van a ninguna parte: hacen algo acá
 * mismo. Las que todavía no tienen pantalla se pintan como texto, sin fingir que
 * llevan a algún lado (ver `MENU_ITEMS`).
 */

/** Entrada: `out` desacelera al final — el panel llega y se asienta. */
const OPEN_TIMING = { duration: 280, easing: Easing.out(Easing.cubic) };
/** Salida más corta: cerrar tiene que sentirse inmediato, no una despedida. */
const CLOSE_TIMING = { duration: 200, easing: Easing.in(Easing.cubic) };

export function MenuSheet({ visible, onClose }: MenuSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // El panel es hermano del navegador de tabs, así que esto es la navegación del
  // stack RAÍZ: puede abrir las pantallas que viven fuera de los tabs.
  const navigation = useNavigation();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // El panel no sabe de roles ni de quién está logueado: pinta lo que le dan
  // los hooks.
  const items = useMenuItems();
  const header = useMenuHeader();

  /**
   * Cerrar sesión se confirma antes: es la única fila del panel que **no se
   * deshace con un "atrás"** —hay que volver a entrar— y está pegada a
   * "Términos y condiciones", así que un toque de más no puede costar la sesión.
   */
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const salida = useCerrarSesion();

  const cerrarConfirmacion = useCallback(() => setConfirmandoSalida(false), []);

  /**
   * Se mantiene montado durante la animación de cierre: si se desmontara con
   * `visible`, el panel desaparecería de golpe sin llegar a bajar.
   */
  const [isMounted, setIsMounted] = useState(visible);

  /** 0 = cerrado (abajo, fondo transparente), 1 = abierto. */
  const progress = useSharedValue(0);
  /**
   * Recorrido de la subida = el alto real del panel, medido en el layout.
   * Arranca en el alto de la pantalla (siempre >= al del panel) para que el
   * primer frame, antes de esa medición, ya esté fuera de vista.
   */
  const sheetHeight = useSharedValue(windowHeight);

  useEffect(() => {
    if (visible) {
      // Primero montar, y recién en la pasada siguiente animar: arrancar la
      // subida antes de que el panel exista se come los primeros frames.
      if (!isMounted) {
        setIsMounted(true);
        return;
      }

      progress.value = withTiming(1, OPEN_TIMING);
      return;
    }

    if (!isMounted) {
      return;
    }

    progress.value = withTiming(0, CLOSE_TIMING, (finished) => {
      if (finished) {
        runOnJS(setIsMounted)(false);
      }
    });
  }, [visible, isMounted, progress]);

  // Botón "atrás" de Android. Lo hacía el Modal solo; sin él hay que atarlo a
  // mano, o el "atrás" saldría de la app con el panel abierto encima.
  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      // true = el evento se consumió acá y no sigue hacia el navigator.
      return true;
    });

    return () => subscription.remove();
  }, [visible, onClose]);

  /**
   * Abre una fila: primero cierra el panel (si no, queda tapando la pantalla
   * nueva) y después navega.
   *
   * Se despacha `CommonActions.navigate` en vez de `navigation.navigate(route)`
   * porque el nombre de la ruta es un **dato** que viene del catálogo: con la
   * firma tipada de `navigate`, un nombre de tipo unión no compila. Ninguna fila
   * del menú lleva params, así que alcanza con el nombre.
   */
  const abrirRuta = useCallback(
    (route: RootRoute) => {
      onClose();
      navigation.dispatch(CommonActions.navigate(route));
    },
    [navigation, onClose],
  );

  /**
   * Lo que hace una fila que no navega. El `switch` sobre la unión obliga a
   * decidir qué pasa con cada acción nueva del catálogo: agregar una a
   * `MenuAcciones` y olvidarse de esto no compila.
   *
   * El panel **no se cierra** al abrir la confirmación: si se cerrara, el
   * diálogo quedaría flotando sobre la pantalla anterior y "Cancelar" te dejaría
   * en otro lado del que estabas.
   */
  const ejecutarAccion = useCallback((accion: MenuAccion) => {
    switch (accion) {
      case MenuAcciones.LOGOUT:
        setConfirmandoSalida(true);
        return;
    }
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      sheetHeight.value = event.nativeEvent.layout.height;
    },
    [sheetHeight],
  );

  // Las dos animaciones salen del mismo valor: el fondo no puede quedar oscuro
  // con el panel ya abajo, ni al revés.
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight.value }],
  }));

  if (!isMounted) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar el menú"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          // El panel arranca debajo de la status bar y termina al ras de abajo:
          // la franja de arriba es la que deja ver que la app sigue ahí detrás.
          { top: insets.top + theme.spacing.md, paddingBottom: insets.bottom + theme.spacing.md },
        ]}
        onLayout={handleLayout}
        // Lo que está detrás del panel no existe para el lector de pantalla.
        accessibilityViewIsModal
      >
        {/* Decorativo: el cierre lo comunica el botón del fondo, no esta barrita. */}
        <View style={styles.handle} />

        <View style={styles.header}>
          {/* Un nombre largo se corta acá y no empuja el resto del panel. */}
          <Text variant="title" weight="semibold" accessibilityRole="header" numberOfLines={1}>
            {header.title}
          </Text>
          <Text variant="small" color="textMuted" numberOfLines={1}>
            {header.subtitle}
          </Text>
        </View>

        {items.map(({ id, label, description, icon: Icon, route, accion }, index) => {
          const esUltima = index === items.length - 1;
          // Con ruta navega, con acción hace algo acá. Sin ninguna de las dos, la
          // pantalla no existe todavía y la fila es solo texto.
          const tocable = route !== undefined || accion !== undefined;

          const contenido = (
            <>
              <View style={styles.itemIcon}>
                {/* Todos en el color de marca: el menú se lee como una sola
                    familia, y el color no le inventa jerarquías a las opciones. */}
                <Icon size={MENU_ICON_SIZE} color={theme.colors.primary} />
              </View>

              <View style={styles.itemText}>
                <Text variant="body" color="text">
                  {label}
                </Text>
                {/* Apoyo, no contenido: más chico y apagado para que el label
                    siga siendo lo primero que se lee. */}
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {description}
                </Text>
              </View>

              {/* Solo en las filas tocables: la flecha es la promesa de que
                  tocar hace algo. Va también en "Cerrar sesión", que no navega
                  pero responde — sin ella se leería igual que las que todavía no
                  hacen nada. */}
              {tocable && <ChevronRight size={MENU_ICON_SIZE} color={theme.colors.textMuted} />}
            </>
          );

          // Sin destino ni acción se pinta como texto: un Pressable que no hace
          // nada es peor que una fila que no invita a tocarla.
          if (!tocable) {
            return (
              <View
                key={id}
                style={[styles.item, esUltima && styles.lastItem]}
                // La fila es UNA unidad para el lector de pantalla: lee "Mi
                // cuenta, información de tu usuario" de corrido, y no dos
                // elementos sueltos.
                accessible
              >
                {contenido}
              </View>
            );
          }

          return (
            <Pressable
              key={id}
              onPress={() => (route ? abrirRuta(route) : accion && ejecutarAccion(accion))}
              style={({ pressed }) => [
                styles.item,
                esUltima && styles.lastItem,
                pressed && styles.itemPressed,
              ]}
              accessible
              accessibilityRole="button"
              // El texto de apoyo entra en el label: suelto, el lector lo leería
              // como un segundo elemento sin relación con el botón.
              accessibilityLabel={`${label}. ${description}`}
            >
              {contenido}
            </Pressable>
          );
        })}
      </Animated.View>

      {/*
        Hermano del panel y dentro del overlay, que cubre la pantalla entera: así
        el diálogo queda por encima del panel y del fondo oscurecido. Adentro de
        la hoja, la animación de subida se lo llevaría puesta.
      */}
      <Dialogo
        visible={confirmandoSalida}
        onClose={cerrarConfirmacion}
        tono="peligro"
        icono={<LogOut size={DIALOGO_ICON_SIZE} color={theme.colors.error} />}
        titulo="¿Cerrar sesión?"
        descripcion="Vas a salir de la cuenta en este dispositivo. Podés volver a entrar cuando quieras, con el mismo correo o con Google."
        // Con el cierre en curso, tocar el fondo dejaría el panel a medio salir.
        cerrarAlTocarFondo={!salida.cerrando}
        acciones={[
          {
            label: 'Cerrar sesión',
            onPress: salida.cerrar,
            variant: 'danger',
            loading: salida.cerrando,
            disabled: salida.cerrando,
          },
          {
            label: 'Cancelar',
            onPress: cerrarConfirmacion,
            variant: 'secondary',
            disabled: salida.cerrando,
          },
        ]}
      />
    </View>
  );
}
