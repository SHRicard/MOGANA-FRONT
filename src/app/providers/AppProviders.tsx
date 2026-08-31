import type { ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from '@/store';
import { ThemeProvider } from '@/theme';

/**
 * Todos los providers globales de la app, en un solo lugar.
 * Orden: Redux (estado) → SafeArea (layout) → Theme (estilos).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  );
}
