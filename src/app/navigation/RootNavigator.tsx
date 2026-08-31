import { useCallback, useMemo } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DevToolsFab } from '@/app/dev';
import {
  FichaClienteScreen,
  MetricasClientesScreen,
  MetricasScreen,
  PanelAdminScreen,
  ProductosScreen,
  TendenciaScreen,
  TicketMesScreen,
  TicketsScreen,
} from '@/features/admin';
import { ConfiguracionScreen } from '@/features/configuracion';
import { DesignSystemScreen } from '@/features/design-system';
import { EspeciesScreen } from '@/features/especies';
import {
  selectEstaBloqueado,
  selectIsAuthenticated,
  useSyncSession,
  VerificarCorreoScreen,
} from '@/features/auth';
import { CuentaClienteScreen, FacturaScreen, NuevaFacturaScreen } from '@/features/facturas';
import {
  InformarPagoScreen,
  MiFacturaScreen,
  MisAvisosScreen,
  MisComprasScreen,
  MisFacturasScreen,
} from '@/features/mi';
import { MiCuentaScreen, PerfilBloqueadoScreen } from '@/features/perfil';
import { ClienteScreen, UsuariosScreen } from '@/features/usuarios';
import { useAppSelector } from '@/store';
import { useTheme, useThemeMode } from '@/theme';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';
import { buildNavigationTheme } from './navigationTheme';
import { RootRoutes } from './routes';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  /**
   * El portero (`docs/flujo_login.md`). Se pregunta **antes que el rol**: el
   * bloqueo no distingue entre cliente y administrador, y la API le contesta
   * `403` a los dos por igual mientras falte el DNI.
   */
  const bloqueado = useAppSelector(selectEstaBloqueado);
  const navigationTheme = useMemo(() => buildNavigationTheme(theme, mode), [theme, mode]);

  // Refresca el usuario y su rol contra `/users/me`. Va acá porque es el punto que
  // se monta una sola vez por sesión, antes de que ningún tab decida si se ve.
  useSyncSession();

  // Ref en vez de useNavigation: el FAB vive FUERA del NavigationContainer
  // (tiene que dibujarse por encima de todo, incluidos los modales).
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  const openDesignSystem = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(RootRoutes.DESIGN_SYSTEM);
    }
  }, [navigationRef]);

  return (
    <View style={styles.root}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <StatusBar
          barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/*
            Switch por estado de sesión, no por navegación imperativa: al hacer
            login o logout el stack se reemplaza solo. Nadie llama a navigate()
            para eso, así que no queda forma de volver "atrás" a una pantalla de
            auth ya pasada.
          */}
          {isAuthenticated && bloqueado ? (
            /*
              Perfil incompleto: esta pantalla es TODA la app. No se registra
              ninguna otra ruta, así que no hay adónde navegar por debajo ni
              request que se escape — que es justo lo que pide el doc. Cuando el
              DNI queda cargado, el `estado` de la sesión cambia y el stack se
              reemplaza solo, sin que nadie llame a `navigate()`.
            */
            <Stack.Screen name={RootRoutes.PERFIL_BLOQUEADO} component={PerfilBloqueadoScreen} />
          ) : isAuthenticated ? (
            // Fragment porque son varias screens hermanas y el ternario devuelve
            // una sola cosa. El navigator acepta `Screen`, `Group` y `Fragment`.
            <>
              <Stack.Screen name={RootRoutes.APP} component={AppNavigator} />

              {/*
                Apartado Administrador. Se abre desde el panel "Más" (que es
                hermano de los tabs, no una screen de tab), así que su lugar es
                el stack raíz. Solo existe con sesión: al cerrarla, la ruta se
                va del stack junto con los tabs.
              */}
              <Stack.Screen name={RootRoutes.USUARIOS} component={UsuariosScreen} />

              {/*
                El panel de administración y su primera sección. Van juntas y en
                este orden: el "atrás" de las métricas devuelve al panel, no al
                menú desde el que se entró.
              */}
              <Stack.Screen name={RootRoutes.PANEL_ADMIN} component={PanelAdminScreen} />
              <Stack.Screen name={RootRoutes.METRICAS} component={MetricasScreen} />
              <Stack.Screen
                name={RootRoutes.METRICAS_CLIENTES}
                component={MetricasClientesScreen}
              />
              {/*
                Listado → ficha del cliente. La ficha se lee para decidir, y
                desde ahí se sigue a la cuenta corriente o a la ficha de la
                persona, que es donde están las acciones.
              */}
              <Stack.Screen name={RootRoutes.FICHA_CLIENTE} component={FichaClienteScreen} />

              {/*
                El apartado de tickets: índice de meses → ticket de uno
                (`docs/flujo_metricas.md` §5). Va como pantalla aparte de las
                métricas y no como una sección adentro, porque la deuda que
                muestra es OTRA: la del cierre del mes y no la de hoy.
              */}
              {/*
                Las dos pantallas de mercadería: qué se llevan mes a mes, y qué
                manda en todo el período (`docs/flujo_metricas.md` §5 y §6).
                Cuelgan del panel, como el resto de las métricas.
              */}
              <Stack.Screen name={RootRoutes.TENDENCIA} component={TendenciaScreen} />
              <Stack.Screen name={RootRoutes.PRODUCTOS} component={ProductosScreen} />

              <Stack.Screen name={RootRoutes.TICKETS} component={TicketsScreen} />
              <Stack.Screen name={RootRoutes.TICKET_MES} component={TicketMesScreen} />

              {/*
                El catálogo de especies (`docs/flujo_especies.md`). Va con las
                del panel porque desde ahí se entra: es mantenimiento, no algo
                que se toque todos los días — la especie que falta se crea
                adentro de la factura.
              */}
              <Stack.Screen name={RootRoutes.ESPECIES} component={EspeciesScreen} />

              {/*
                **Lo mío**: la vista del cliente sobre su propia cuenta
                (`docs/user_cliente_flujo.md`). El recorrido natural es inicio →
                factura → avisar que pagué, y por eso van las tres seguidas: el
                "atrás" devuelve al paso anterior.

                Las otras dos cuelgan del panel "Más". Ninguna pide rol: la API
                no acepta un id de persona, así que un administrador que entre
                ve la suya, normalmente vacía.
              */}
              <Stack.Screen name={RootRoutes.MIS_FACTURAS} component={MisFacturasScreen} />
              <Stack.Screen name={RootRoutes.MI_FACTURA} component={MiFacturaScreen} />
              <Stack.Screen name={RootRoutes.INFORMAR_PAGO} component={InformarPagoScreen} />
              <Stack.Screen name={RootRoutes.MIS_AVISOS} component={MisAvisosScreen} />
              <Stack.Screen name={RootRoutes.MIS_COMPRAS} component={MisComprasScreen} />

              {/*
                La cuenta propia. También se abre desde el panel "Más", pero la
                ve cualquier rol: cada uno edita la suya, y la API no acepta un
                id (`docs/flujo_mi_cuenta.md`).
              */}
              <Stack.Screen name={RootRoutes.MI_CUENTA} component={MiCuentaScreen} />

              {/*
                Ajustes de la app. Igual que Mi cuenta: se abre desde "Más" y la
                ve cualquier rol. No pide nada a la API — lo que se elige acá
                queda guardado en el teléfono.
              */}
              <Stack.Screen name={RootRoutes.CONFIGURACION} component={ConfiguracionScreen} />

              {/*
                Escribir el código del correo. Va acá y no en el stack público
                porque el endpoint **pide sesión**: el body es solo el código y
                la cuenta sale del token (`docs/flujo_login.md`).
              */}
              <Stack.Screen name={RootRoutes.VERIFICAR_CORREO} component={VerificarCorreoScreen} />

              {/*
                Listado → ficha → facturar: tres hermanas del mismo stack. Cada
                "atrás" devuelve al paso anterior con lo que había puesto —el
                listado con su búsqueda, la ficha con su cliente—, que es lo que
                no se puede hacer si las acciones viven adentro de la lista.
              */}
              <Stack.Screen name={RootRoutes.CLIENTE} component={ClienteScreen} />
              <Stack.Screen name={RootRoutes.NUEVA_FACTURA} component={NuevaFacturaScreen} />

              {/*
                El flujo de cobranza: tablero → cuenta del cliente → factura. La
                cuenta dice de qué está hecha la deuda y la factura es donde se
                anota el cobro; el "atrás" devuelve a la cuenta con su página.
              */}
              <Stack.Screen name={RootRoutes.CUENTA} component={CuentaClienteScreen} />
              <Stack.Screen name={RootRoutes.FACTURA} component={FacturaScreen} />
            </>
          ) : (
            <Stack.Screen name={RootRoutes.AUTH} component={AuthNavigator} />
          )}

          {/* Herramienta de desarrollo: la ruta ni existe en un build de release. */}
          {__DEV__ && (
            <Stack.Screen
              name={RootRoutes.DESIGN_SYSTEM}
              component={DesignSystemScreen}
              options={{ presentation: 'modal' }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {__DEV__ && <DevToolsFab onPress={openDesignSystem} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
