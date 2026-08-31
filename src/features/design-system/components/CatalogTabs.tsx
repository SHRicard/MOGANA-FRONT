import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import type { CatalogTab } from '../types';

interface CatalogTabsProps {
  tabs: readonly CatalogTab[];
  active: CatalogTab;
  onChange: (tab: CatalogTab) => void;
}

/**
 * Segmented control compacto. Se ajusta al contenido (`alignSelf: flex-start`)
 * en vez de ocupar una fila entera: en una pantalla de catálogo el espacio
 * vertical es para los componentes, no para el navegador.
 */
export function CatalogTabs({ tabs, active, onChange }: CatalogTabsProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.segment, isActive && styles.segmentActive]}
            // El control es bajo (28pt) para no comer alto, pero el área
            // táctil real llega a los 44pt del mínimo accesible.
            hitSlop={{ top: theme.spacing.sm, bottom: theme.spacing.sm }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              variant="caption"
              weight={isActive ? 'semibold' : 'medium'}
              color={isActive ? 'onPrimary' : 'textMuted'}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignSelf: 'flex-start', // se achica al contenido
      padding: theme.spacing.xxs,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceVariant,
    },
    segment: {
      height: 28,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.full,
    },
    segmentActive: { backgroundColor: theme.colors.primary },
  });
