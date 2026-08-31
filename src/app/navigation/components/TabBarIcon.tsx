import { memo, type ComponentType } from 'react';
import { useTheme } from '@/theme';

/**
 * Forma mínima que cumple cualquier ícono de lucide. Tipamos lo que usamos en
 * vez de importar el tipo de la librería: la tab bar no tiene por qué atarse a
 * un paquete de íconos puntual.
 */
export type TabIconComponent = ComponentType<{
  size?: number;
  color?: string;
  fill?: string;
}>;

interface TabBarIconProps {
  icon: TabIconComponent;
  focused: boolean;
  color: string;
  size: number;
}

/**
 * Ícono de un tab. El tab activo se dibuja "duotono": trazo en el color de
 * marca sobre un relleno suave.
 *
 * Por qué duotono y no relleno pleno: lucide no tiene variantes *filled*, y
 * rellenar con el mismo color del trazo aplasta el dibujo hasta dejarlo una
 * mancha (la puerta de la casita, el badajo de la campana). Con `primaryMuted`
 * de fondo el ícono se lee sólido y conserva el detalle, en claro y en oscuro.
 */
function TabBarIconComponent({ icon: Icon, focused, color, size }: TabBarIconProps) {
  const theme = useTheme();

  return (
    <Icon size={size} color={color} fill={focused ? theme.colors.primaryMuted : 'transparent'} />
  );
}

export const TabBarIcon = memo(TabBarIconComponent);
