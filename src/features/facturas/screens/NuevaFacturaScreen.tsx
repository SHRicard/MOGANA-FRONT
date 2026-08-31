import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Ban from 'lucide-react-native/icons/ban';
import Check from 'lucide-react-native/icons/check';
import Plus from 'lucide-react-native/icons/plus';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { Button } from '@/shared/ui/atoms/Button';
import { CampoFecha } from '@/shared/ui/atoms/CampoFecha';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFecha, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { ItemFacturaRow } from '../components';
import { useNuevaFactura } from '../hooks';
import { MAX_ITEMS_FACTURA, nombreDeCliente, type Factura } from '../types';

type NuevaFacturaRoute = RouteProp<RootStackParamList, typeof RootRoutes.NUEVA_FACTURA>;

const ICON_SIZE = 20;
/** Alto del área táctil del botón de volver. */
const HEADER_ACTION_SIZE = 44;

/**
 * Emitirle una factura a un cliente (`docs/flujo_pagos.md` §6).
 *
 * Se llega desde la ficha del cliente, así que la persona ya está elegida: acá
 * se pone **hasta cuándo hay tiempo de pagarla** y el detalle de qué se le
 * cobra, un renglón por producto con cantidad y precio unitario.
 *
 * ⚠️ La fecha de emisión **no se carga**: es el día en que se crea la factura y
 * la pone el servidor.
 *
 * ⚠️ Los importes los calcula el **backend**. El total que se ve mientras se
 * carga es una copia para no trabajar a ciegas; el que vale llega en el `201`.
 */
export function NuevaFacturaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<NuevaFacturaRoute>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * La factura que acaba de emitirse, o `null` mientras no hay ninguna. Es lo
   * que abre el diálogo de confirmación: se guarda entera porque el aviso
   * muestra sus datos **ya calculados por el backend** —el número correlativo y
   * el total—, que es lo que la persona va a repetir por teléfono.
   */
  const [creada, setCreada] = useState<Factura | null>(null);

  const alCrear = useCallback((factura: Factura) => setCreada(factura), []);

  /**
   * Recién al cerrar el aviso se vuelve: una factura no se puede editar ni
   * borrar, así que el cierre del flujo tiene que ser explícito.
   */
  const cerrarYVolver = useCallback(() => {
    setCreada(null);
    volver();
  }, [volver]);

  const verFactura = useCallback(() => {
    if (!creada) {
      return;
    }
    // `replace` y no `navigate`: el formulario ya cumplió, y el "atrás" desde la
    // factura tiene que llevar a de dónde se vino, no a un formulario enviado.
    // Se despacha la acción en vez de llamar a `navigation.replace` porque el
    // tipo que devuelve `useNavigation()` es el genérico del stack raíz.
    navigation.dispatch(StackActions.replace(RootRoutes.FACTURA, { facturaId: creada.id }));
  }, [navigation, creada]);

  const form = useNuevaFactura(params.clienteId, alCrear);

  return (
    <>
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
              Nueva factura
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {params.clienteNombre}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.screen}
          // En iOS el teclado tapa los campos de abajo; en Android lo resuelve el
          // sistema con el `adjustResize` del manifiesto.
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + theme.spacing.xxl },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── A quién ── */}
            <View style={styles.card} accessible>
              <Text variant="caption" color="textMuted">
                Le facturás a
              </Text>
              <Text variant="subtitle" weight="semibold" numberOfLines={1}>
                {params.clienteNombre}
              </Text>
            </View>

            {/*
              ── Aviso de fiado ──
              Arriba de todo y fuerte, antes de cargar un solo renglón: el
              backend **acepta igual** la factura a plazo
              (`docs/bloquear_fiado.md`), así que este cartel es lo único que
              evita fiarle a quien no hay que fiarle. No traba el formulario: la
              decisión es de quien está atendiendo.
            */}
            {params.sinFiado && (
              <View style={styles.sinFiado} accessible accessibilityRole="alert">
                <View style={styles.sinFiadoTitulo}>
                  <Ban size={ICON_SIZE} color={theme.colors.error} />
                  <Text variant="body" weight="semibold" color="error">
                    A este cliente no se le fía
                  </Text>
                </View>
                {params.motivoSinFiado ? (
                  <Text variant="small" color="textMuted">
                    {params.motivoSinFiado}
                  </Text>
                ) : null}
                <Text variant="small" weight="medium">
                  Cobrale en el momento.
                </Text>
              </View>
            )}

            {/* ── Vencimiento ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Vencimiento
              </Text>

              {/*
                Una sola fecha: hasta cuándo tiene tiempo de pagarla. La de emisión
                la pone el servidor el día en que se crea, así que no se pide.

                El rango sale de las dos reglas del backend: no puede nacer vencida
                (mínimo hoy) y no puede estirarse más de un año. Con el calendario
                acotado, ninguno de los dos errores llega a pasar por la red.
              */}
              <CampoFecha
                control={form.control}
                name="fechaFin"
                label="Vence el"
                helperText="Hasta cuándo tiene tiempo de pagarla"
                fechaMinima={form.fechaMinima}
                fechaMaxima={form.fechaMaxima}
              />
            </View>

            {/* ── Renglones ── */}
            <View style={styles.seccion}>
              <Text variant="body" weight="semibold">
                Qué le cobrás
              </Text>

              {/*
                El catálogo de especies no llegó. **No traba la factura**: cada
                renglón igual deja escribir una especie nueva, que el backend
                crea junto con la factura (`docs/flujo_especies.md` §5). Lo que
                hay que decir es por qué el selector está vacío, o se lee como
                que el catálogo se borró.
              */}
              {form.especiesError && (
                <View style={styles.aviso} accessible accessibilityRole="alert">
                  <Text variant="caption" color="onWarningMuted">
                    No pudimos traer el catálogo de especies. Podés escribir la especie de cada
                    renglón: se crea con la factura.
                  </Text>
                </View>
              )}

              {form.items.map((item, index) => (
                <ItemFacturaRow
                  key={item.id}
                  control={form.control}
                  index={index}
                  onQuitar={form.quitarItem}
                  puedeQuitar={form.items.length > 1}
                  cantidad={form.valoresItems[index]?.cantidad ?? ''}
                  precioUnitario={form.valoresItems[index]?.precioUnitario ?? ''}
                  especies={form.especies}
                  especieNombre={form.valoresItems[index]?.especieNombre ?? ''}
                  especiesCargando={form.especiesCargando}
                  onElegirEspecie={form.elegirEspecie}
                  onCrearEspecie={form.crearEspecie}
                />
              ))}

              {form.puedeAgregarItem ? (
                <Button
                  label="Agregar producto"
                  variant="secondary"
                  onPress={form.agregarItem}
                  leftIcon={<Plus size={ICON_SIZE} color={theme.colors.primary} />}
                />
              ) : (
                <Text variant="caption" color="textMuted">
                  {`Una factura admite hasta ${MAX_ITEMS_FACTURA} renglones.`}
                </Text>
              )}

              <ControlledInputField
                control={form.control}
                name="notas"
                label="Notas (opcional)"
                placeholder="Primera factura"
                multiline
              />
            </View>

            {/* ── Total ── */}
            <View style={styles.total}>
              <Text variant="body" weight="semibold">
                Total
              </Text>
              <Text variant="title" weight="bold">
                {formatMonto(form.totalPrevio)}
              </Text>
            </View>
            <Text variant="caption" color="textMuted" align="right">
              El importe final lo calcula el servidor
            </Text>

            {form.mensajeError && (
              <View style={styles.error} accessible accessibilityRole="alert">
                <Text variant="small" color="error">
                  {form.mensajeError}
                </Text>
                {/*
                  Un 404 no se arregla reintentando: ese id no es de un cliente
                  —puede ser el de un administrador—, así que lo que corresponde es
                  volver al listado.
                */}
                {form.clienteInexistente && <Link label="Volver al listado" onPress={volver} />}
              </View>
            )}

            {/*
              Un solo botón, deshabilitado mientras la request está en vuelo: nada
              impide dos facturas del mismo período, así que un doble toque emite
              dos y no hay forma de borrar ninguna.
            */}
            <Button
              label="Emitir factura"
              onPress={form.enviar}
              loading={form.isSubmitting}
              disabled={form.isSubmitting}
              fullWidth
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/*
        Hermano de la pantalla y no hijo: el diálogo es una view absoluta que
        cubre a su PADRE, y adentro del `View` con `paddingTop` el fondo oscuro
        se comería la franja de la barra de estado.
      */}
      <Dialogo
        visible={creada !== null}
        onClose={cerrarYVolver}
        tono="exito"
        icono={<Check size={DIALOGO_ICON_SIZE} color={theme.colors.success} />}
        titulo={creada ? `Factura #${creada.numero}` : ''}
        descripcion="Quedó emitida y ya aparece en la cuenta del cliente."
        acciones={[
          { label: 'Listo', onPress: cerrarYVolver },
          { label: 'Ver la factura', onPress: verFactura, variant: 'secondary' },
        ]}
      >
        {creada && (
          <View style={styles.resumen}>
            <Dato etiqueta="Cliente" valor={nombreDeCliente(creada.cliente)} />
            <Dato etiqueta="Vence el" valor={formatFecha(creada.fechaFin)} />
            <Dato etiqueta="Total" valor={formatMonto(creada.total)} />
          </View>
        )}
      </Dialogo>
    </>
  );
}

interface DatoProps {
  etiqueta: string;
  valor: string;
}

/** Una fila del resumen del diálogo: etiqueta a la izquierda, dato a la derecha. */
function Dato({ etiqueta, valor }: DatoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.dato} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Text variant="small" color="textMuted">
        {etiqueta}
      </Text>
      <View style={styles.datoValor}>
        <Text variant="small" weight="medium" align="right" numberOfLines={2}>
          {valor}
        </Text>
      </View>
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
    },
    headerAction: {
      width: HEADER_ACTION_SIZE,
      height: HEADER_ACTION_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
    /** `flex: 1` para que un nombre largo se corte y no empuje el título. */
    headerTexts: { flex: 1 },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.xl,
    },
    /** Amarillo y no rojo: el formulario sigue funcionando. */
    aviso: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: theme.radius.md,
    },

    seccion: { gap: theme.spacing.md },

    card: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    total: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },

    error: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.lg,
    },

    /** El aviso de que a esta persona no se le fía. Se ve antes de cargar nada. */
    sinFiado: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorMuted,
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: theme.radius.lg,
    },
    sinFiadoTitulo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },

    /** El resumen adentro del diálogo de confirmación. */
    resumen: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.lg,
    },
    dato: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    /** `flex: 1` para que el valor se corte él y no empuje la etiqueta. */
    datoValor: { flex: 1 },
  });
