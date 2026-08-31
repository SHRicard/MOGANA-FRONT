import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.sm },
  });
