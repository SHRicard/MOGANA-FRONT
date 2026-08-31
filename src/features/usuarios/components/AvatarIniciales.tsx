import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

export interface AvatarInicialesProps {
  /** Nombre o, si la cuenta no tiene, el email. De ahí salen las iniciales. */
  nombre: string;
  /** `md` en una fila de lista; `lg` cuando encabeza una ficha. */
  size?: 'md' | 'lg';
}

const AVATAR_SIZE = { md: 44, lg: 72 } as const;

/**
 * Iniciales de la persona en un círculo. No hay fotos de perfil en el sistema,
 * así que esto es lo que le da un ancla visual a cada fila: sin algo a la
 * izquierda, una lista de nombres parecidos es un bloque de texto gris.
 */
function AvatarInicialesComponent({ nombre, size = 'md' }: AvatarInicialesProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const iniciales = useMemo(() => obtenerIniciales(nombre), [nombre]);

  return (
    // Decorativo: el nombre está al lado, en texto. Se esconde del lector de
    // pantalla para que no lea "R R" antes de cada fila.
    <View
      style={[styles.avatar, size === 'lg' && styles.grande]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant={size === 'lg' ? 'title' : 'small'} weight="semibold" color="primary">
        {iniciales}
      </Text>
    </View>
  );
}

/**
 * `"Ricardo Ramirez"` → `"RR"`, `"Usuario 8"` → `"U8"`, `"ana@mail.com"` → `"AN"`.
 *
 * Se toman las dos primeras palabras. Con un email —o sea, una cuenta sin
 * nombre— no hay palabras que combinar, así que van las dos primeras letras.
 */
function obtenerIniciales(nombre: string): string {
  const limpio = nombre.trim();
  if (!limpio) {
    return '?';
  }

  if (limpio.includes('@')) {
    return limpio.slice(0, 2).toUpperCase();
  }

  const palabras = limpio.split(/\s+/).slice(0, 2);
  return palabras
    .map((palabra) => palabra.charAt(0))
    .join('')
    .toUpperCase();
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    avatar: {
      width: AVATAR_SIZE.md,
      height: AVATAR_SIZE.md,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryMuted,
    },
    grande: { width: AVATAR_SIZE.lg, height: AVATAR_SIZE.lg },
  });

export const AvatarIniciales = memo(AvatarInicialesComponent);
