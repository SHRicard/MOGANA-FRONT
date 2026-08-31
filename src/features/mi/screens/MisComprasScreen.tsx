import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ShoppingBasket from 'lucide-react-native/icons/shopping-basket';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { ComoVengoComprando, EspecieQueComproItem } from '../components';
import { useMisCompras } from '../hooks';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * **Qué compro** (`docs/user_cliente_flujo.md` §10): la única métrica que el
 * cliente ve de sí mismo.
 *
 * Va **sin nada de cómo paga**: la tasa de cumplimiento, las demoras y el fiado
 * son el juicio que el negocio hace sobre él, y se quedan del lado del panel
 * (§13). Acá se contesta otra cosa: qué se lleva, cuánto, y si está llevando más
 * o menos que antes.
 *
 * ⚠️ **La lista trae también lo que dejó de llevar**, en cero y con el chip
 * "hace tiempo que no lo llevás". Filtrarlo por `reciente.cantidad === 0` sería
 * quedarse justo sin la mitad de para qué sirve la pantalla.
 *
 * Toda la lógica vive en `useMisCompras` — acá solo se arma la UI.
 */
export function MisComprasScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const compras = useMisCompras();
  const refresco = useRefrescar(compras.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={volver}
          style={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={ICON_SIZE} color={theme.colors.text} />
        </Pressable>

        <View style={styles.headerTexts}>
          <Text variant="title" weight="semibold" accessibilityRole="header" numberOfLines={1}>
            Qué comprás
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Lo que te llevás, de lo que más a lo que menos
          </Text>
        </View>

        <View style={styles.headerAction}>
          {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
          {compras.isFetching && !compras.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando tus compras"
            />
          )}
        </View>
      </View>

      {compras.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer tus compras"
          description={compras.mensajeError}
          action={<Button label="Reintentar" onPress={compras.reintentar} />}
        />
      ) : compras.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : compras.sinHistoria ? (
        /*
          Nunca compró nada: un texto, no una tabla de ceros. Con todo en `null`
          y sin especies, cada fila diría `0` y ninguna significaría nada.
        */
        <EmptyState
          icon={<ShoppingBasket size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Todavía no compraste nada"
          description="Cuando te llevés algo, acá vas a ver qué comprás más seguido y cuánto."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={refresco.control}>
          {compras.historial && (
            <ComoVengoComprando historial={compras.historial} facturado={compras.facturado} />
          )}

          <View style={styles.tarjeta}>
            <View style={styles.encabezado}>
              <Text variant="small" weight="semibold">
                Qué te llevás
              </Text>
              <Text variant="caption" color="textMuted">
                {`Desde siempre, y cómo viene en los últimos ${compras.ventanaDias} días`}
              </Text>
            </View>

            <View style={styles.lista}>
              {compras.especies.map((especie, indice) => (
                <View key={especie.especieId} style={indice > 0 ? styles.filaConBorde : undefined}>
                  <EspecieQueComproItem especie={especie} ventanaDias={compras.ventanaDias} />
                </View>
              ))}
            </View>

            <Text variant="micro" color="textMuted">
              Lo que dejaste de llevar aparece igual, en cero: así se ve de un vistazo qué cambió.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerAction: {
      width: HEADER_ACTION_SIZE,
      height: HEADER_ACTION_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
    /** `flex: 1` para que el título se corte antes de empujar el indicador. */
    headerTexts: { flex: 1 },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
    },

    tarjeta: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    encabezado: { gap: theme.spacing.xxs },
    lista: { gap: 0 },
    /** Línea entre especies, menos arriba de la primera. */
    filaConBorde: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
