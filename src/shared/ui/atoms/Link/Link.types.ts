import type { TextVariant } from '@/shared/ui/atoms/Text';

export interface LinkProps {
  label: string;
  onPress: () => void;
  /** Nivel tipográfico. Por defecto `small`. */
  variant?: TextVariant;
  /** Atenuado: para links secundarios que no deben competir con la acción principal. */
  muted?: boolean;
  disabled?: boolean;
  testID?: string;
}
