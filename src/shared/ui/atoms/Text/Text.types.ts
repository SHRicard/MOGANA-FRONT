import type { ReactNode } from 'react';
import type { TextProps as RNTextProps, TextStyle } from 'react-native';
import type { ThemeColors } from '@/theme';

/** Nivel tipográfico. Fija fontSize + lineHeight desde los tokens. */
export type TextVariant =
  | 'display'
  | 'heading'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'small'
  | 'caption'
  | 'micro';

/** Solo se aceptan tokens semánticos de color: nunca un string suelto. */
export type TextColor = keyof ThemeColors;

export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  children: ReactNode;
  variant?: TextVariant;
  color?: TextColor;
  weight?: TextWeight;
  align?: TextStyle['textAlign'];
}
