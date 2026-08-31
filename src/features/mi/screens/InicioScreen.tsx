import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import FileText from 'lucide-react-native/icons/file-text';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import { selectCurrentUser } from '@/features/auth';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { useAppSelector } from '@/store';
import { useTheme, type Theme } from '@/theme';
import { MiFacturaItem, ResumenDeMiCuenta } from '../components';
import { useMiInicio } from '../hooks';
import type { MiFacturaDeLaLista } from '../types';

/**
 * **Inicio: cuánto debo** (`docs/user_cliente_flujo.md` §4).
 *
 * La portada de la app para quien tiene una cuenta: arriba el resumen —cuánto
 * debe, cuánto se pasó de fecha y qué vence primero— y abajo las últimas
 * facturas, las suficientes para reconocer la compra sin convertir la portada en
 * el listado.
 *
 * **Sirve para cualquier rol.** Un administrador que entre ve su propia cuenta,
 * que normalmente está vacía: `/mi` no tiene ningún id de persona en la URL, y
 * filtrar por rol daría un `403` que no protege nada.
 *
 * ⚠️ Los dos vacíos **no son el mismo** y confundirlos hace creer que se
 * perdieron las facturas: *"Estás al día"* es haber pagado todo, *"Todavía no
 * tenés facturas"* es que nunca hubo ninguna (§15).
 *
 * Toda la lógica vive en `useMiInicio` — acá solo se arma la UI.
 */
export function InicioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const usuario = useAppSelector(selectCurrentUser);
  const inicio = useMiInicio();
  const refresco = useRefrescar(inicio.refrescar);

  const verTodas = useCallback(() => {
    navigation.navigate(RootRoutes.MIS_FACTURAS);
  }, [navigation]);

  const verFactura = useCallback(
    (factura: MiFacturaDeLaLista) => {
      // El renglón es liviano —no trae productos ni pagos—, así que el detalle
      // se pide recién acá. Además es la pantalla donde está el comprobante y
      // el botón de avisar que pagué.
      navigation.navigate(RootRoutes.MI_FACTURA, { facturaId: factura.id });
    },
    [navigation],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        // Solo el inset de arriba: el de abajo lo absorbe la tab bar, que ya
        // ocupa esa franja. Sumarlo acá dejaría un hueco de más.
        { paddingTop: insets.top + theme.spacing.lg },
      ]}
      refreshControl={refresco.control}
    >
      <Text variant="heading" weight="bold" accessibilityRole="header">
        {usuario ? `Hola, ${usuario.name}` : 'Hola'}
      </Text>

      {inicio.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer tu cuenta"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={inicio.mensajeError}
          action={<Button label="Reintentar" onPress={inicio.reintentar} />}
        />
      ) : inicio.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : inicio.sinHistoria ? (
        /*
          Nunca se le facturó nada. No es lo mismo que estar al día, y por eso no
          se muestra el resumen en cero: una tabla de ceros no dice "todavía no
          te compramos nada", dice "algo salió mal".
        */
        <EmptyState
          icon={<FileText size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Todavía no tenés facturas"
          description="Cuando te emitamos la primera, la vas a ver acá con su vencimiento y cuánto queda por pagar."
        />
      ) : (
        <>
          {inicio.cuenta && <ResumenDeMiCuenta cuenta={inicio.cuenta} />}

          <View style={styles.tituloLista}>
            <Text variant="body" weight="semibold">
              Tus facturas
            </Text>
            <Link label="Ver todas" variant="caption" onPress={verTodas} />
          </View>

          <View style={styles.lista}>
            {inicio.ultimas.map((factura) => (
              <MiFacturaItem key={factura.id} factura={factura} onPress={verFactura} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },

    tituloLista: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    /** Aire entre facturas: cada una ya es una tarjeta con borde. */
    lista: { gap: theme.spacing.sm },

    centrado: { paddingVertical: theme.spacing.xl, alignItems: 'center' },
  });
