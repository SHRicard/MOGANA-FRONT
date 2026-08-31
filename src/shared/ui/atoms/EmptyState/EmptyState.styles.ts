import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    icon: { marginBottom: theme.spacing.sm },
    action: { marginTop: theme.spacing.md },
  });
