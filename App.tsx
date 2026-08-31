import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProviders } from '@/app/providers';
import { RootNavigator } from '@/app/navigation';
import { SplashOverlay } from '@/app/splash';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppProviders>
        <RootNavigator />
        {/*
          Va DESPUÉS del navigator y en posición absoluta: tapa el primer frame
          y se funde hacia la app. Dentro de AppProviders porque lee el theme.
        */}
        <SplashOverlay />
      </AppProviders>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
