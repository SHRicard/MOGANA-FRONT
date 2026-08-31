import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Lock from 'lucide-react-native/icons/lock';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto, nombreDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  GraficoEvolucion,
  PlataEnLaCalle,
  ResumenGlobal,
  SelectorDeMes,
  TarjetaMetrica,
  TasasDeCumplimiento,
} from '../components';
import { useMetricas } from '../hooks';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * Métricas: **"¿cómo va el negocio?"** de un vistazo
 * (`docs/flujo_metricas.md`). Es lo primero que ve el administrador cuando entra
 * al panel.
 *
 * La pantalla está partida en **dos bloques que no se mezclan**, y esa división
 * es lo más importante del diseño:
 *
 *  - **Hoy** — la plata en la calle, los morosos y el cumplimiento. No los mueve
 *    el selector de mes.
 *  - **El mes** — lo que se facturó y se cobró en el período elegido, más el
 *    gráfico.
 *
 * Sin esa separación, elegir marzo y ver la deuda arriba se lee como "esto es lo
 * que se debía en marzo", y no es: es lo que se debe **ahora**.
 *
 * Sin lógica de negocio: todo sale de `useMetricas`.
 */
export function MetricasScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const metricas = useMetricas();
  const refresco = useRefrescar(metricas.refrescar);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const hayDatos = metricas.enLaCalle !== undefined;

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
          <Text variant="title" weight="semibold" accessibilityRole="header">
            Métricas
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Tu negocio hoy
          </Text>
        </View>

        {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
        <View style={styles.headerAction}>
          {metricas.isFetching && !metricas.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando las métricas"
            />
          )}
        </View>
      </View>

      {metricas.sinPermiso ? (
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esta sección no es para tu cuenta"
          description={
            metricas.mensajeError ?? 'Las métricas del negocio las ven solo los administradores.'
          }
        />
      ) : metricas.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer las métricas"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={metricas.mensajeError}
          action={<Button label="Reintentar" onPress={metricas.reintentar} />}
        />
      ) : metricas.isLoading || !hayDatos ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.spacing.xl },
          ]}
          refreshControl={refresco.control}
        >
          {/* ── Bloque 1: la foto de hoy ── */}
          {metricas.enLaCalle && <PlataEnLaCalle datos={metricas.enLaCalle} />}

          {metricas.clientes && (
            <View style={styles.fila}>
              <TarjetaMetrica
                etiqueta="Morosos"
                valor={`${metricas.clientes.morosos}`}
                detalle={`de ${metricas.clientes.conFacturas} con facturas`}
                // El único número de la fila que pide una acción: son los que ya
                // se pasaron de fecha.
                tono={metricas.clientes.morosos > 0 ? 'statusLate' : undefined}
              />
              <TarjetaMetrica
                etiqueta="Con deuda"
                valor={`${metricas.clientes.conDeuda}`}
                // Deber no es ser moroso: el que está en fecha entra acá y está
                // perfecto. Por eso este número va sin color.
                detalle={`de ${metricas.clientes.total} clientes`}
              />
              <TarjetaMetrica
                etiqueta="Sin fiado"
                valor={`${metricas.clientes.sinFiado}`}
                detalle="no se les fía"
              />
            </View>
          )}

          {metricas.cumplimiento && <TasasDeCumplimiento datos={metricas.cumplimiento} />}

          {/* ── Bloque 2: el mes elegido ──
              Separado con una línea y su propio título: es el único bloque que
              mueve el selector, y confundirlo con el de arriba sería leer la
              deuda de hoy como si fuera la del mes que se está mirando. */}
          <View style={styles.separador} />

          <Text variant="small" weight="semibold">
            El mes
          </Text>

          <SelectorDeMes
            mes={metricas.mes}
            onAnterior={metricas.mesAnterior}
            onSiguiente={metricas.mesSiguiente}
            esUltimoMes={metricas.esUltimoMes}
          />

          {metricas.delMes && (
            <View style={styles.fila}>
              <TarjetaMetrica
                etiqueta={`Entró en ${nombreDeMesApi(metricas.delMes.mes)}`}
                valor={formatMonto(metricas.delMes.cobrado)}
                detalle={
                  metricas.delMes.cobros === 1 ? '1 cobro' : `${metricas.delMes.cobros} cobros`
                }
                tono={metricas.delMes.cobrado > 0 ? 'success' : undefined}
              />
              <TarjetaMetrica
                etiqueta="Facturado"
                valor={formatMonto(metricas.delMes.facturado)}
                detalle={
                  metricas.delMes.facturas === 1
                    ? '1 factura'
                    : `${metricas.delMes.facturas} facturas`
                }
              />
            </View>
          )}

          <GraficoEvolucion puntos={metricas.evolucion} />

          {/* ── Bloque 3: todo el historial ── */}
          <View style={styles.separador} />

          {metricas.global && <ResumenGlobal datos={metricas.global} />}
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
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },

    /** Las tarjetas chicas, repartidas en partes iguales. */
    fila: { flexDirection: 'row', gap: theme.spacing.sm },

    /** Corta entre bloques: lo de hoy no se lee junto con lo del mes. */
    separador: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginTop: theme.spacing.sm,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
