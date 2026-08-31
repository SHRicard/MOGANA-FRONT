import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import FileX from 'lucide-react-native/icons/file-x';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  AvisosSinResolver,
  EstadoDeMiFactura,
  MiPagoItem,
  RenglonDeMiFactura,
} from '../components';
import { useMiFactura } from '../hooks';
import { cuandoVence } from '../types';

type MiFacturaRoute = RouteProp<RootStackParamList, typeof RootRoutes.MI_FACTURA>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * **Una factura mía** (`docs/user_cliente_flujo.md` §6): qué me llevé, cuánto
 * pagué y cuánto falta.
 *
 * Los renglones vienen **en el orden en que se cargaron** y los pagos **del más
 * viejo al más nuevo**: se leen como un extracto.
 *
 * ⚠️ **Una anulada tiene siempre `saldo: 0`**: dejó de ser una deuda el día que
 * se dio de baja. Si tenía pagos, esa plata aparece como **a favor** —"te
 * devolvemos"—, nunca restando de la deuda. **El motivo de la baja no viene, y
 * no es un olvido**: es una nota escrita para adentro (§13).
 *
 * 🚧 Falta el botón de **descargar el PDF** (§7): pedirlo con el header
 * `Authorization` y abrirlo con el visor del sistema necesita una librería de
 * archivos (`react-native-blob-util` o equivalente) que este proyecto todavía no
 * tiene. Un `Linking.openURL` sobre esa URL **no sirve**: va sin token y la API
 * contesta `401`.
 *
 * Toda la lógica vive en `useMiFactura` — acá solo se arma la UI.
 */
export function MiFacturaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<MiFacturaRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const detalle = useMiFactura(params.facturaId);
  const refresco = useRefrescar(detalle.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const avisar = useCallback(() => {
    if (!detalle.factura) {
      return;
    }
    navigation.navigate(RootRoutes.INFORMAR_PAGO, {
      facturaId: detalle.factura.id,
      numero: detalle.factura.numero,
    });
  }, [navigation, detalle.factura]);

  const factura = detalle.factura;

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
            {factura ? `Factura #${factura.numero}` : 'Factura'}
          </Text>
          {factura && (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {`Emitida el ${formatFecha(factura.fechaEmision)}`}
            </Text>
          )}
        </View>

        <View style={styles.headerAction}>
          {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
          {detalle.isFetching && !detalle.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando la factura"
            />
          )}
        </View>
      </View>

      {detalle.noEncontrada ? (
        <EmptyState
          icon={<FileX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No encontramos esa factura"
          // Un 404 acá también significa que la factura es de otra persona, y se
          // contesta igual a propósito: un 403 confirmaría que existe.
          description="No existe o no es tuya."
          action={<Button label="Volver" variant="secondary" onPress={volver} />}
        />
      ) : detalle.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer la factura"
          description={detalle.mensajeError}
          action={<Button label="Reintentar" onPress={detalle.reintentar} />}
        />
      ) : detalle.isLoading || !factura ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={refresco.control}>
          {/* Vencimiento y estado. En una anulada no va: no hay que pagarla y no
              vence, así que la fecha no significa nada. */}
          <View style={styles.tarjeta}>
            <View style={styles.linea}>
              <View style={styles.headerTexts}>
                <Text variant="small" weight="medium">
                  {detalle.estaAnulada
                    ? 'Esta factura fue dada de baja'
                    : `Vence el ${formatFecha(factura.fechaFin)}`}
                </Text>
                {!detalle.estaAnulada && (
                  <Text
                    variant="caption"
                    color={factura.diasParaVencer < 0 ? 'error' : 'textMuted'}
                  >
                    {cuandoVence(factura.diasParaVencer)}
                  </Text>
                )}
              </View>
              <EstadoDeMiFactura estado={factura.estado} />
            </View>

            {/*
              Lo único que una anulada todavía puede pedir. Va en verde: es plata
              que se mueve para el otro lado que la deuda, así que no se resta de
              ella nunca.
            */}
            {detalle.textoAnulada && (
              <View style={styles.aFavor} accessible accessibilityRole="alert">
                <Text variant="small" weight="semibold" color="success">
                  {detalle.textoAnulada}
                </Text>
              </View>
            )}
          </View>

          {/* Qué me llevé. */}
          <View style={styles.tarjeta}>
            <Text variant="small" weight="semibold">
              Qué te llevaste
            </Text>

            <View style={styles.renglones}>
              {detalle.items.map((item) => (
                <RenglonDeMiFactura key={item.id} item={item} />
              ))}
            </View>

            <View style={styles.total}>
              <Text variant="small" weight="medium">
                Total
              </Text>
              <Text variant="body" weight="bold">
                {formatMonto(factura.total)}
              </Text>
            </View>
          </View>

          {/* Los pagos anotados, y lo que falta. */}
          <View style={styles.tarjeta}>
            <Text variant="small" weight="semibold">
              Pagos anotados
            </Text>

            {detalle.pagos.length === 0 ? (
              <Text variant="caption" color="textMuted">
                Todavía no anotamos ningún pago de esta factura.
              </Text>
            ) : (
              <View style={styles.renglones}>
                {detalle.pagos.map((pago) => (
                  <MiPagoItem key={pago.id} pago={pago} />
                ))}
              </View>
            )}

            {/* En una anulada el saldo es cero porque dejó de contar, y un
                "Pagada" ahí se leería como que se cobró. */}
            {!detalle.estaAnulada && (
              <View style={styles.total}>
                <Text variant="small" weight="medium">
                  {factura.saldo > 0 ? 'Te falta pagar' : 'Está pagada'}
                </Text>
                <Text variant="body" weight="bold" color={factura.saldo > 0 ? 'text' : 'textMuted'}>
                  {formatMonto(factura.saldo)}
                </Text>
              </View>
            )}

            {factura.pagadaEn !== null && (
              <Text variant="caption" color="textMuted">
                {`La terminaste de pagar el ${formatFecha(factura.pagadaEn)}`}
              </Text>
            )}
          </View>

          {/*
            Los avisos de esta factura que todavía nadie resolvió: explican por
            qué la deuda no bajó y evitan avisar dos veces lo mismo.
          */}
          <AvisosSinResolver avisos={detalle.avisosSinResolver} />

          {/* La observación de la venta, la misma que está impresa en el papel. */}
          {factura.notas ? (
            <View style={styles.tarjeta}>
              <Text variant="small" weight="semibold">
                Nota de la venta
              </Text>
              <Text variant="small" color="textMuted">
                {factura.notas}
              </Text>
            </View>
          ) : null}

          {/*
            ⚠️ Dice "Avisar que pagué", no "Pagar": acá no se paga nada. No se
            muestra en una anulada, en una saldada ni con todo el saldo ya
            informado — son las tres reglas que el backend contestaría con un
            `400`, y no mostrar el botón es mejor que mostrarlo y fallar.
          */}
          {detalle.sePuedeAvisar && <Button label="Avisar que pagué" onPress={avisar} fullWidth />}
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
    /** `flex: 1` para que el título se corte antes de empujar lo que sigue. */
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
    linea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    aFavor: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.successMuted,
      borderRadius: theme.radius.md,
    },

    renglones: { gap: theme.spacing.xxs },

    /** El total, separado por una línea: es la conclusión de lo de arriba. */
    total: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
