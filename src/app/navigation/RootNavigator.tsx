import { useCallback, useMemo, useState } from 'react';
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
import { AvisosDePagoScreen } from '@/features/avisos-de-pago';
import {
  BandejaDeMensajesScreen,
  HiloDelClienteScreen,
  MisMensajesScreen,
} from '@/features/mensajes';
import {
  ComprobantesDelStoreScreen,
  StoreDeComprobantesScreen,
} from '@/features/store-comprobantes';
import { CuentaClienteScreen, FacturaScreen, NuevaFacturaScreen } from '@/features/facturas';
import {
  ElegirFacturaScreen,
  InformarPagoScreen,
  MiFacturaScreen,
  MisAvisosScreen,
  MisComprasScreen,
  MisFacturasScreen,
  useComprobantesCompartidos,
} from '@/features/mi';
import { EliminarCuentaScreen, MiCuentaScreen, PerfilBloqueadoScreen } from '@/features/perfil';
import {
  AuditoriaScreen,
  CuentaDelSistemaScreen,
  PanelSuperAdminScreen,
  SistemaScreen,
} from '@/features/super-admin';
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

  /**
   * Si el contenedor ya puede recibir un `navigate`.
   *
   * Es estado y no un `navigationRef.isReady()` suelto porque hace falta que sea
   * **reactivo**: el comprobante compartido puede estar esperando desde antes de
   * que el contenedor se monte, y sin un cambio de estado que vuelva a correr el
   * efecto nadie lo iría a buscar de nuevo.
   */
  const [navegacionLista, setNavegacionLista] = useState(false);
  const alEstarLista = useCallback(() => setNavegacionLista(true), []);

  /**
   * La entrada por la **hoja de compartir** de Android
   * (`docs/compartir_comprobante.md`).
   *
   * Va acá arriba, y no adentro de una pantalla, por dos motivos que el doc
   * marca como obligatorios: la imagen puede llegar con la app **cerrada**
   * (§2.2), y puede llegar **sin sesión** (§5.1). Este es el único punto que
   * está montado en los dos casos.
   *
   * Solo abre la pantalla con sesión y con el perfil completo. Mientras falte
   * alguna de las dos, abajo ya se está mostrando el login o el cartel del DNI
   * y el comprobante espera guardado — que es exactamente lo que piden §5.1 y
   * §5.2.
   */
  useComprobantesCompartidos(navigationRef, navegacionLista && isAuthenticated && !bloqueado);

  const openDesignSystem = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(RootRoutes.DESIGN_SYSTEM);
    }
  }, [navigationRef]);

  return (
    <View style={styles.root}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={alEstarLista}>
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
            <>
              <Stack.Screen name={RootRoutes.PERFIL_BLOQUEADO} component={PerfilBloqueadoScreen} />

              {/*
                La única excepción a "esta pantalla es TODA la app", y la pide la
                política de Google Play: el camino para borrar la cuenta tiene
                que estar disponible igual (`README_FRONT_BAJA_DE_CUENTA.md` §2).

                Es justo la persona que más chances tiene de querer irse —se
                registró, nunca cargó el DNI y no puede hacer nada más— y los dos
                endpoints de la baja le responden con la cuenta bloqueada. No
                abre ninguna otra puerta: es una pantalla sola contra sus dos
                endpoints, y termina en el login.
              */}
              <Stack.Screen name={RootRoutes.ELIMINAR_CUENTA} component={EliminarCuentaScreen} />
            </>
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
                **El panel del sistema** (`docs/README_FRONT_SUPER_ADMIN.md`):
                lo único que ve el super admin y no ve el administrador. Van las
                cuatro juntas y en este orden porque así se recorren: panel →
                tablero, y panel → historial → ficha de una cuenta.

                ⚠️ El listado de todas las cuentas NO está acá: es
                `RootRoutes.USUARIOS`, el mismo del apartado del administrador
                —con el rol en cada fila y el filtro por rol prendido—, porque es
                la misma tabla con una columna más.

                ⚠️ Registrarlas para cualquier sesión iniciada es lo mismo que
                se hace con el resto: esconder una pantalla por rol es UI, no
                seguridad. La API contesta `403` a los cinco endpoints si el rol
                no alcanza, y cada pantalla lo muestra en su propio cartel.
              */}
              <Stack.Screen
                name={RootRoutes.PANEL_SUPER_ADMIN}
                component={PanelSuperAdminScreen}
              />
              <Stack.Screen name={RootRoutes.SISTEMA} component={SistemaScreen} />
              <Stack.Screen name={RootRoutes.AUDITORIA} component={AuditoriaScreen} />
              <Stack.Screen
                name={RootRoutes.CUENTA_DEL_SISTEMA}
                component={CuentaDelSistemaScreen}
              />

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
                La bandeja de avisos de pago
                (`MORGANA-BACK/docs/flujo_comprobantes.md`). Es el otro lado de
                `INFORMAR_PAGO` y de `ELEGIR_FACTURA`: por ahí el cliente avisa
                que pagó y adjunta la captura, y acá alguien la mira contra el
                resumen del banco y decide.

                Va con las del panel porque desde ahí se entra —"hay algo que
                resolver"— aunque confirmar termine anotando un cobro en una
                factura. La API la tiene detrás del rol de administración.
              */}
              <Stack.Screen name={RootRoutes.AVISOS_DE_PAGO} component={AvisosDePagoScreen} />

              {/*
                El panel del store (`MORGANA-BACK/docs/flujo_comprobantes.md`
                §5): cuánto ocupan las capturas que subieron los clientes y qué
                se puede liberar. La lista cuelga del panel, no del menú: se
                entra a mirar el total y de ahí se baja al detalle.

                ⚠️ Desde acá se borran archivos y no se puede deshacer.
              */}
              <Stack.Screen
                name={RootRoutes.STORE_COMPROBANTES}
                component={StoreDeComprobantesScreen}
              />
              <Stack.Screen
                name={RootRoutes.COMPROBANTES_DEL_STORE}
                component={ComprobantesDelStoreScreen}
              />

              {/*
                La bandeja de mensajes y el hilo de cada cliente
                (`/admin/mensajes`).

                ⚠️ La bandeja es **compartida**: leer un hilo lo deja leído para
                todos los administradores, igual que la de avisos de pago.
              */}
              <Stack.Screen
                name={RootRoutes.BANDEJA_MENSAJES}
                component={BandejaDeMensajesScreen}
              />
              <Stack.Screen
                name={RootRoutes.HILO_DEL_CLIENTE}
                component={HiloDelClienteScreen}
              />

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

              {/*
                La entrada por la hoja de compartir de Android
                (`docs/compartir_comprobante.md`). Va con las de "lo mío" porque
                termina en el mismo `POST` que `INFORMAR_PAGO`, pero es otra
                pantalla: por aquella se entra desde una factura y solo falta el
                monto; por esta se entra con la imagen y **sin nada más**.

                Como modal: el cliente viene de su billetera y de acá vuelve a
                donde estaba, no se mete en un stack del que después hay que
                salir apretando "atrás" varias veces.
              */}
              <Stack.Screen
                name={RootRoutes.ELEGIR_FACTURA}
                component={ElegirFacturaScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen name={RootRoutes.MIS_AVISOS} component={MisAvisosScreen} />
              <Stack.Screen name={RootRoutes.MIS_COMPRAS} component={MisComprasScreen} />

              {/*
                Mi hilo con el local (`/mi/mensajes`). Va con las pantallas de
                "lo mío" y no con las del panel: es la misma conversación que el
                administrador ve del otro lado, pero desde acá no hay a quién
                elegir — el hilo es la persona.
              */}
              <Stack.Screen name={RootRoutes.MIS_MENSAJES} component={MisMensajesScreen} />

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
                Eliminar mi cuenta. Se abre desde Mi cuenta, al final y separado
                del resto, que es donde Google Play pide que esté
                (`docs/README_FRONT_BAJA_DE_CUENTA.md` §6). La ve cualquier rol:
                las cuentas de administración se comen un `409` al confirmar y la
                pantalla lo explica, pero el camino tiene que existir igual.
              */}
              <Stack.Screen name={RootRoutes.ELIMINAR_CUENTA} component={EliminarCuentaScreen} />

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
