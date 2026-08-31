import { useCallback, useMemo, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import type { EventArg } from '@react-navigation/native';
import Bell from 'lucide-react-native/icons/bell';
import House from 'lucide-react-native/icons/house';
import MenuIcon from 'lucide-react-native/icons/menu';
import Tag from 'lucide-react-native/icons/tag';
import Users from 'lucide-react-native/icons/users';
import { selectRol } from '@/features/auth';
import { ClientesFacturadosScreen } from '@/features/facturas';
import { MenuScreen, MenuSheet } from '@/features/menu';
import { InicioScreen } from '@/features/mi';
import { NotificationsScreen, useNoLeidas } from '@/features/notifications';
import { OffersScreen } from '@/features/offers';
import { useAppSelector } from '@/store';
import { BottomTabBar, TabBarIcon, type TabIconComponent } from './components';
import { AppRoutes, getVisibleTabs, type AppRoute } from './routes';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

interface TabConfig {
  /**
   * Texto debajo del ícono. Cortos a propósito: cada tab se reparte el ancho en
   * partes iguales, y una palabra larga se corta con puntos suspensivos.
   */
  title: string;
  icon: TabIconComponent;
  component: ComponentType;
}

/**
 * Cómo se dibuja cada tab. Es un `Record<AppRoute, ...>`: una ruta nueva en el
 * router obliga a definir acá su título, ícono y pantalla.
 *
 * ⚠️ El ORDEN de la barra no sale de acá sino de `TAB_ORDER` (routes.ts), que
 * junto con `TabRoles` decide además cuáles se ven.
 */
const TAB_CONFIG: Record<AppRoute, TabConfig> = {
  [AppRoutes.HOME]: { title: 'Inicio', icon: House, component: InicioScreen },
  [AppRoutes.FACTURADOS]: {
    title: 'Clientes',
    icon: Users,
    component: ClientesFacturadosScreen,
  },
  [AppRoutes.NOTIFICATIONS]: { title: 'Avisos', icon: Bell, component: NotificationsScreen },
  [AppRoutes.MENU]: { title: 'Más', icon: MenuIcon, component: MenuScreen },

  // Fuera de la barra (ver `TAB_ORDER`). Se conserva lista para volver.
  [AppRoutes.OFFERS]: { title: 'Ofertas', icon: Tag, component: OffersScreen },
};

/**
 * Las `options` se arman una sola vez, a nivel de módulo, y no en cada render:
 * `tabBarIcon` es una función y React Navigation compara las options por
 * identidad. Recreándolas, la barra se re-renderiza en cada paso.
 */
const TAB_OPTIONS = Object.fromEntries(
  Object.entries(TAB_CONFIG).map(([name, { title, icon }]) => [
    name,
    {
      title,
      // La barra le pasa `color` (activo/inactivo) y `size`; el ícono solo decide
      // cómo se dibuja según `focused`.
      tabBarIcon: ({ focused, color, size }) => (
        <TabBarIcon icon={icon} focused={focused} color={color} size={size} />
      ),
    } satisfies BottomTabNavigationOptions,
  ]),
) as Record<AppRoute, BottomTabNavigationOptions>;

const renderTabBar = (props: BottomTabBarProps) => <BottomTabBar {...props} />;

/** Tabs de usuarios con sesión iniciada. */
export function AppNavigator() {
  // Estado de UI de un solo componente → `useState`. No es sesión ni dato de
  // servidor: no tiene por qué pasar por Redux.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const rol = useAppSelector(selectRol);

  /**
   * El globito de la campanita (`docs/notificaciones.md`). Vive acá y no en la
   * pantalla porque el número tiene que verse **sin entrar a Avisos**, que es
   * para lo que existe. Se actualiza solo: las dos formas de marcar leído
   * invalidan el mismo tag.
   */
  const noLeidas = useNoLeidas();

  /**
   * Las options se arman una sola vez a nivel de módulo (ver `TAB_OPTIONS`), y
   * acá se pisa **solo la del tab de avisos** cuando hay algo sin leer: con un
   * objeto nuevo por render, React Navigation redibujaría la barra entera todo
   * el tiempo.
   */
  const opciones = useMemo(
    () =>
      noLeidas > 0
        ? {
            ...TAB_OPTIONS,
            [AppRoutes.NOTIFICATIONS]: {
              ...TAB_OPTIONS[AppRoutes.NOTIFICATIONS],
              tabBarBadge: noLeidas,
            },
          }
        : TAB_OPTIONS,
    [noLeidas],
  );
  // Se memoiza porque `getVisibleTabs` devuelve un array nuevo: sin esto, el
  // `.map()` de abajo re-registraría las screens en cada render.
  const visibleTabs = useMemo(() => getVisibleTabs(rol), [rol]);

  const sheetTabListeners = useMemo(
    () => ({
      // `preventDefault` corta la navegación: el tab "Más" abre el panel y la
      // pantalla activa se queda donde está, debajo.
      tabPress: (event: EventArg<'tabPress', true>) => {
        event.preventDefault();
        setIsMenuOpen(true);
      },
    }),
    [],
  );

  return (
    // El panel es hermano del navigator, no hijo de una screen: así sobrevive al
    // cambio de tab y no depende de cuál esté activa.
    <View style={styles.container}>
      <Tab.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
        {visibleTabs.map((name) => (
          <Tab.Screen
            key={name}
            name={name}
            component={TAB_CONFIG[name].component}
            options={opciones[name]}
            // El tab "Más" es el único que no navega: abre el panel.
            listeners={name === AppRoutes.MENU ? sheetTabListeners : undefined}
          />
        ))}
      </Tab.Navigator>

      <MenuSheet visible={isMenuOpen} onClose={closeMenu} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
