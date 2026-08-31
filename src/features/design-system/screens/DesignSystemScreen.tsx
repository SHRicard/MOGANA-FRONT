import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import X from 'lucide-react-native/icons/x';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, useThemeMode, type Theme } from '@/theme';
import { CatalogTabs } from '../components';
import { AtomsSection, TokensSection } from '../sections';
import { CATALOG_TABS, type CatalogTab } from '../types';

/**
 * Catálogo del design system: los tokens y los atoms, que es TODO lo compartido
 * de la app.
 *
 * Para qué sirve: antes de crear un componente, mirás acá si ya está. Es lo que
 * evita que terminemos con cinco botones distintos.
 *
 * Lo que NO está acá: las composiciones de cada feature (`features/<x>/components`).
 * Son propias de su pantalla y distintas entre sí, así que no tiene sentido
 * documentarlas en un catálogo global.
 *
 * Se llega con el botón flotante de dev (solo visible con __DEV__).
 */
export function DesignSystemScreen() {
  const theme = useTheme();
  const { mode, toggleMode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<CatalogTab>('Tokens');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="small" weight="semibold" color="textMuted">
          Design System
        </Text>

        <View style={styles.headerActions}>
          <Pressable
            onPress={toggleMode}
            style={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel={`Tema ${mode}. Tocá para alternar entre claro y oscuro`}
          >
            <Text variant="body">{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel="Cerrar el catálogo"
          >
            <X size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.tabsRow}>
        <CatalogTabs tabs={CATALOG_TABS} active={activeTab} onChange={setActiveTab} />
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'Tokens' && <TokensSection />}
        {activeTab === 'Atoms' && <AtomsSection />}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: theme.spacing.lg,
      // Menos padding a la derecha: los botones de 44pt ya traen su propio aire.
      paddingRight: theme.spacing.sm,
    },
    headerActions: { flexDirection: 'row' },
    headerAction: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
    tabsRow: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.xxl,
    },
  });
