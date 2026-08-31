import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import CalendarOff from 'lucide-react-native/icons/calendar-off';
import Lock from 'lucide-react-native/icons/lock';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto, tituloDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  LaCalleAlCierre,
  LaGenteDelMes,
  LoQueEntro,
  LoQueSeEmitio,
  QueSeVendio,
  QueSeVendioPorEspecie,
  QuienCompro,
  TarjetaMetrica,
  Variacion,
} from '../components';
import { useTicketMes } from '../hooks';
import { textoComparacion, type TicketTopCliente } from '../types';

type TicketMesRoute = RouteProp<RootStackParamList, typeof RootRoutes.TICKET_MES>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * El ticket de un mes (`docs/flujo_metricas.md` §5.2): **qué pasó en julio**.
 *
 * ⚠️ **Toda la deuda de esta pantalla es la del cierre del mes, no la de hoy.**
 * Una factura de junio que se cobró en septiembre figura impaga en el ticket de
 * julio, porque en julio lo estaba: esa era la plata que había en la calle
 * entonces, y es lo único que hace que el ticket de julio siga contando julio.
 *
 * Tres cosas que no se saltean, y que el doc pide expresamente:
 *
 *  - la **fecha del corte** escrita en el bloque de la deuda;
 *  - el cartel de **en curso** en el mes que todavía no terminó;
 *  - **`generadoEl`** al pie, porque un mes cerrado puede cambiar.
 *
 * Sin lógica de negocio: todo sale de `useTicketMes`.
 */
export function TicketMesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<TicketMesRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const detalle = useTicketMes(params.mes);
  const refresco = useRefrescar(detalle.refrescar);
  const ticket = detalle.ticket;

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  const verFicha = useCallback(
    (cliente: TicketTopCliente) => {
      // A la ficha y no a la cuenta: desde acá lo que se decide es qué hacer con
      // esa persona, y eso vive en la ficha.
      navigation.navigate(RootRoutes.CLIENTE, {
        clienteId: cliente.clienteId,
        clienteNombre: cliente.nombre,
      });
    },
    [navigation],
  );

  // El título sale del param y no de la respuesta: así el encabezado dice qué
  // mes se está abriendo desde el primer cuadro, mientras el ticket carga.
  const titulo = tituloDeMesApi(params.mes);

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
            {titulo}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {ticket ? `Generado el ${formatFecha(ticket.generadoEl)}` : 'Ticket del mes'}
          </Text>
        </View>

        {/* Con el gesto de refrescar no: la rueda de arriba ya lo dice. */}
        <View style={styles.headerAction}>
          {detalle.isFetching && !detalle.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando el ticket"
            />
          )}
        </View>
      </View>

      {detalle.sinPermiso ? (
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esta sección no es para tu cuenta"
          description={
            detalle.mensajeError ?? 'Los tickets del negocio los ven solo los administradores.'
          }
        />
      ) : detalle.mesImposible ? (
        /* Un mes que no existe o que todavía no pasó. Sin botón de reintentar:
           volver a pedirlo daría exactamente lo mismo. */
        <EmptyState
          icon={<CalendarOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Ese mes no tiene ticket"
          description={detalle.mensajeError ?? 'Todavía no hay nada que contar de ese mes.'}
          action={<Button label="Volver" variant="secondary" onPress={volver} />}
        />
      ) : detalle.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer el ticket"
          // El texto del backend viene redactado para mostrarse tal cual.
          description={detalle.mensajeError}
          action={<Button label="Reintentar" onPress={detalle.reintentar} />}
        />
      ) : detalle.isLoading || !ticket ? (
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
          {/* El mes que todavía no terminó. Va arriba de todo: comparar veinte
              días de agosto contra julio entero es comparar cualquier cosa, y
              eso hay que saberlo antes de leer el primer número. */}
          {detalle.enCurso && (
            <View style={styles.enCurso}>
              <Text variant="caption" weight="semibold" color="onWarningMuted">
                El mes está en curso
              </Text>
              <Text variant="micro" color="onWarningMuted">
                {`Va hasta el ${formatFecha(
                  ticket.alCierre.al,
                )}, así que los números son parciales y no se pueden comparar con un mes entero.`}
              </Text>
            </View>
          )}

          {/* ── Lo que se movió, contra el mes anterior ── */}
          <View style={styles.fila}>
            <TarjetaMetrica
              etiqueta="Se facturó"
              valor={formatMonto(ticket.facturacion.facturado)}
              detalle={
                ticket.facturacion.facturas === 1
                  ? '1 factura'
                  : `${ticket.facturacion.facturas} facturas`
              }
              pie={<Variacion valor={ticket.comparacion.variacionFacturado} />}
              pieTexto={textoComparacion(
                ticket.comparacion.variacionFacturado,
                ticket.comparacion.mes,
              )}
            />
            <TarjetaMetrica
              etiqueta="Entró"
              valor={formatMonto(ticket.cobranza.cobrado)}
              detalle={
                ticket.cobranza.cobros === 1 ? '1 cobro' : `${ticket.cobranza.cobros} cobros`
              }
              tono={ticket.cobranza.cobrado > 0 ? 'success' : undefined}
              pie={<Variacion valor={ticket.comparacion.variacionCobrado} />}
              pieTexto={textoComparacion(
                ticket.comparacion.variacionCobrado,
                ticket.comparacion.mes,
              )}
            />
          </View>

          {/* ── La deuda, al corte del mes ── */}
          <LaCalleAlCierre datos={ticket.alCierre} enCurso={detalle.enCurso} />

          {/* ── El detalle de cada lado ── */}
          <LoQueEntro datos={ticket.cobranza} />
          <LoQueSeEmitio datos={ticket.facturacion} />
          <LaGenteDelMes datos={ticket.clientes} />

          {/* Un mes sin facturación no tiene a quién ni qué mostrar: la tarjeta
              vacía diría menos que no estar. */}
          {ticket.topClientes.length > 0 && (
            <QuienCompro clientes={ticket.topClientes} onPress={verFicha} />
          )}
          {/* Primero por especie —el único ranking comparable entre meses— y
              después el detalle producto por producto. */}
          {ticket.topEspecies && ticket.topEspecies.length > 0 && (
            <QueSeVendioPorEspecie especies={ticket.topEspecies} />
          )}
          {ticket.topProductos.length > 0 && <QueSeVendio productos={ticket.topProductos} />}

          {/* El pie: un ticket no se guarda, se calcula. Si mañana se anula una
              factura de julio, el ticket de julio va a decir otra cosa — por eso
              la fecha en que se armó esta foto viaja con ella. */}
          <Text variant="micro" color="textMuted" align="center">
            {`Generado el ${formatFecha(
              ticket.generadoEl,
            )}. El ticket muestra lo que hoy se sabe del mes: si se anula una factura vieja o se anota un cobro atrasado, cambia.`}
          </Text>
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

    enCurso: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.lg,
    },

    /** Las tarjetas chicas, repartidas en partes iguales. */
    fila: { flexDirection: 'row', gap: theme.spacing.sm },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
