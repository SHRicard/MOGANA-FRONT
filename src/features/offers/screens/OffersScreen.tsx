import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tag from 'lucide-react-native/icons/tag';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { useTheme } from '@/theme';

/**
 * Placeholder: la feature todavía no está implementada. Existe para que el tab
 * tenga destino. Reemplazá el contenido cuando arranques la pantalla real.
 */
export function OffersScreen() {
  const theme = useTheme();

  return (
    // Solo el borde de arriba: el de abajo ya lo resuelve la tab bar.
    <SafeAreaView style={styles.screen} edges={['top']}>
      <EmptyState
        icon={<Tag size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
        title="Ofertas"
        description="Acá van las promociones del día. Pantalla pendiente de implementar."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // El fondo lo pinta React Navigation desde el theme (ver navigationTheme.ts).
  screen: { flex: 1 },
});
