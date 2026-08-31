import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Badge } from '@/shared/ui/atoms/Badge';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme } from '@/theme';
import { createStyles, TAB_ICON_SIZE } from './BottomTabBar.styles';

/**
 * Barra de tabs propia (se le pasa a `Tab.Navigator` por la prop `tabBar`).
 *
 * Por qué una propia y no la de React Navigation: la barra por defecto se
 * configura con colores sueltos (`tabBarActiveTintColor`, etc.), lo que obliga a
 * pasar valores del theme uno por uno desde el navigator. Acá el estilo sale
 * entero de `useTheme()` y sigue el modo claro/oscuro solo.
 *
 * No conoce ninguna ruta: dibuja lo que le dicen los `descriptors` (`title`,
 * `tabBarIcon`, `tabBarBadge`). Agregar un tab es tocar solo el navigator.
 */
export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    // El safe area de abajo se suma como padding y no como alto fijo: en un
    // celular con gesture bar la barra sube, en uno con botones queda al ras.
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = options.title ?? route.name;
        const color = isFocused ? theme.colors.primary : theme.colors.textMuted;
        const badgeCount =
          typeof options.tabBarBadge === 'number' ? options.tabBarBadge : undefined;

        const handlePress = () => {
          // Se emite siempre, incluso sobre el tab ya activo: es el evento que
          // escucha una screen para hacer "scroll to top" al re-tocar su tab.
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const handleLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={handlePress}
            onLongPress={handleLongPress}
            accessibilityRole="tab"
            // `selected` es lo que hace que el lector de pantalla diga cuál es
            // el tab activo. Sin esto, el color azul no se lo comunica a nadie.
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.iconSlot}>
              {options.tabBarIcon?.({ focused: isFocused, color, size: TAB_ICON_SIZE })}

              {badgeCount !== undefined ? (
                // pointerEvents none: el badge se superpone al ícono y no debe
                // comerse el toque del tab.
                <View style={styles.badgeSlot} pointerEvents="none">
                  <Badge count={badgeCount} accessibilityLabel={`${badgeCount} en ${label}`} />
                </View>
              ) : null}
            </View>

            <Text
              variant="micro"
              weight={isFocused ? 'semibold' : 'medium'}
              color={isFocused ? 'primary' : 'textMuted'}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
