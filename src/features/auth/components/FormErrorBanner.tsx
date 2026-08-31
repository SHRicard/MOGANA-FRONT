import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import AlertCircle from 'lucide-react-native/icons/circle-alert';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

interface FormErrorBannerProps {
  message: string | null;
}

/** Muestra el error del envío (no el de un campo). Ícono + texto, no solo color. */
export function FormErrorBanner({ message }: FormErrorBannerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!message) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <AlertCircle size={18} color={theme.colors.error} />
      <Text variant="small" color="error">
        {message}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.surface,
    },
  });
