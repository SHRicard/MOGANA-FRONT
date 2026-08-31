import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import FileX from 'lucide-react-native/icons/file-x';
import Hourglass from 'lucide-react-native/icons/hourglass';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { InformarPagoForm } from '../components';
import { useInformarPago, useMiFactura } from '../hooks';
import { MEDIO_DE_PAGO_LABEL, type MiFactura } from '../types';

type InformarPagoRoute = RouteProp<RootStackParamList, typeof RootRoutes.INFORMAR_PAGO>;

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * **Avisar que pagué** (`docs/user_cliente_flujo.md` §8).
 *
 * ⚠️ Lo primero, porque cambia el diseño entero: **esto no descuenta nada**.
 * Deja un aviso en la bandeja del negocio, y la deuda baja recién cuando alguien
 * lo confirma contra el resumen del banco. Si el aviso descontara solo,
 * cualquiera saldaría su cuenta escribiendo un número en un formulario.
 *
 * Por eso la pantalla **no se cierra al mandar**: termina en un cartel que dice
 * que el aviso quedó, que la deuda sigue igual y por qué. Cerrar y volver a la
 * factura con el mismo saldo se leería como que el aviso se perdió.
 *
 * El máximo y el día de emisión los recalcula `useMiFactura` con la factura y
 * los avisos sin resolver: es la única forma de que el tope sea el de ahora y no
 * el de cuando se tocó el botón.
 */
export function InformarPagoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<InformarPagoRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const detalle = useMiFactura(params.facturaId);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

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
            Avisar que pagué
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {`Factura #${params.numero}`}
          </Text>
        </View>

        <View style={styles.headerAction} />
      </View>

      {detalle.noEncontrada ? (
        <EmptyState
          icon={<FileX size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No encontramos esa factura"
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
        <ElAviso
          factura={factura}
          yaInformado={detalle.yaInformado}
          maximo={detalle.puedeInformar}
          onVolver={volver}
        />
      )}
    </View>
  );
}

interface ElAvisoProps {
  factura: MiFactura;
  /** Lo ya avisado de esta factura y sin resolver. */
  yaInformado: number;
  /** `saldo − yaInformado`: el valor propuesto y el tope. */
  maximo: number;
  onVolver: () => void;
}

/**
 * El formulario y su desenlace, **montados recién con la factura en la mano**.
 *
 * Va aparte y no en la pantalla por una razón concreta: los `defaultValues` de
 * React Hook Form se leen **una sola vez, al montar**. Con el hook arriba, el
 * formulario nacería con el monto en cero —la factura todavía no llegó— y se
 * quedaría así aunque después apareciera el saldo. Montándolo acá, cuando nace
 * ya sabe cuánto proponer.
 */
function ElAviso({ factura, yaInformado, maximo, onVolver }: ElAvisoProps) {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const aviso = useInformarPago(factura.id, maximo, factura.fechaEmision);

  const verMisAvisos = useCallback(() => {
    navigation.navigate(RootRoutes.MIS_AVISOS);
  }, [navigation]);

  const enviado = aviso.avisado;

  if (enviado) {
    /*
      Ya se mandó. Lo importante de este cartel no es el "listo": es que la deuda
      **sigue igual** y hay que decir por qué. El `factura.saldo` que devuelve el
      201 lo confirma — llega sin tocar.
    */
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avisado} accessible accessibilityRole="alert">
          <Hourglass size={ICON_SIZE} color={theme.colors.primary} />
          <Text variant="title" weight="semibold">
            Avisado, esperando confirmación
          </Text>
          <Text variant="small" color="textMuted">
            {`Nos dijiste que pagaste ${formatMonto(enviado.monto)} el ${formatFecha(
              enviado.fecha,
            )} por ${MEDIO_DE_PAGO_LABEL[enviado.medio].toLowerCase()}.`}
          </Text>
          <Text variant="small">
            {`Tu deuda de esta factura sigue en ${formatMonto(
              enviado.factura.saldo,
            )} porque todavía no lo confirmamos. Lo revisamos contra el banco y te avisamos por la campanita.`}
          </Text>
        </View>

        <Button label="Ver mis avisos" onPress={verMisAvisos} fullWidth />
        <Button label="Volver a la factura" variant="secondary" onPress={onVolver} fullWidth />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.contexto}>
        <Text variant="small" color="textMuted">
          {`De esta factura queda ${formatMonto(factura.saldo)} sin pagar.`}
        </Text>
        {/* Lo ya avisado y sin resolver cuenta como si estuviera cobrado, así que
            hay que decir de dónde sale un máximo más chico que el saldo. */}
        {yaInformado > 0 && (
          <Text variant="small" color="textMuted">
            {`Ya avisaste ${formatMonto(
              yaInformado,
            )} que todavía no confirmamos, así que podés informar hasta ${formatMonto(maximo)}.`}
          </Text>
        )}
      </View>

      <InformarPagoForm
        control={aviso.control}
        maximo={maximo}
        fechaEmision={factura.fechaEmision}
        onEnviar={aviso.enviar}
        onCancelar={onVolver}
        enviando={aviso.isSubmitting}
        mensajeError={aviso.mensajeError}
      />
    </ScrollView>
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
    contexto: { gap: theme.spacing.xs },

    avisado: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: theme.radius.lg,
    },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
