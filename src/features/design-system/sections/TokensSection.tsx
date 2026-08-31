import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import { ShowcaseItem, ShowcaseSection } from '../components';

/**
 * Los tokens semánticos del theme activo. Se listan recorriendo `theme.colors`,
 * así que un token nuevo aparece acá solo, sin tocar esta pantalla.
 */
export function TokensSection() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const colorEntries = Object.entries(theme.colors) as [keyof ThemeColors, string][];

  return (
    <>
      <ShowcaseSection
        title="Colores"
        description="Tokens semánticos. Son los ÚNICOS que pueden usar los componentes: nunca un primitivo (blue500) ni un hex suelto."
        importPath="const theme = useTheme() → theme.colors.primary"
      >
        <ShowcaseItem label={`${colorEntries.length} tokens en el tema activo`}>
          <View style={styles.swatchGrid}>
            {colorEntries.map(([name, value]) => (
              <View key={name} style={styles.swatch}>
                <View style={[styles.swatchColor, { backgroundColor: value }]} />
                <Text variant="caption" weight="medium">
                  {name}
                </Text>
                <Text variant="caption" color="textMuted">
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Espaciados"
        description="Escala base 4. Usar siempre estos valores, nunca números mágicos."
        importPath="theme.spacing.md"
      >
        <ShowcaseItem label="spacing">
          {Object.entries(theme.spacing).map(([name, value]) => (
            <View key={name} style={styles.scaleRow}>
              <View style={styles.scaleLabel}>
                <Text variant="caption" weight="medium">
                  {name}
                </Text>
                <Text variant="caption" color="textMuted">
                  {value}
                </Text>
              </View>
              <View style={[styles.scaleBar, { width: Math.max(value, 1) }]} />
            </View>
          ))}
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Radios"
        description="Radios de borde disponibles."
        importPath="theme.radius.md"
      >
        <ShowcaseItem label="radius" row>
          {Object.entries(theme.radius).map(([name, value]) => (
            <View key={name} style={styles.radiusItem}>
              <View style={[styles.radiusBox, { borderRadius: value }]} />
              <Text variant="caption" color="textMuted">
                {name}
              </Text>
            </View>
          ))}
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Tipografía"
        description="Cada nivel fija tamaño e interlineado. Se consumen vía el atom Text."
        importPath="theme.typography.body / theme.lineHeight.body"
      >
        <ShowcaseItem label="Escala">
          {Object.entries(theme.typography).map(([name, value]) => (
            <View key={name} style={styles.typeRow}>
              <Text variant="caption" color="textMuted">
                {name} · {value}px
              </Text>
              <Text
                variant={name as keyof Theme['typography']}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Ag
              </Text>
            </View>
          ))}
        </ShowcaseItem>
      </ShowcaseSection>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    swatchGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    swatch: { width: 88, gap: theme.spacing.xxs },
    swatchColor: {
      width: '100%',
      height: 48,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    scaleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    scaleLabel: { width: 56, flexDirection: 'row', justifyContent: 'space-between' },
    scaleBar: {
      height: 12,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.primary,
    },

    radiusItem: { alignItems: 'center', gap: theme.spacing.xxs },
    radiusBox: {
      width: 48,
      height: 48,
      backgroundColor: theme.colors.primaryMuted,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },

    typeRow: { gap: theme.spacing.xxs },
  });
