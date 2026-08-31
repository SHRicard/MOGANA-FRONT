import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { buscarEspeciePorNombre, filtrarEspecies, MIN_LARGO_ESPECIE, type Especie } from '../types';

const ICON_SIZE = 18;
/** Hasta dónde crece la lista desplegada antes de scrollear por dentro. */
const ALTO_LISTA = 200;

export interface SelectorDeEspecieProps {
  /** El catálogo entero, **ya traído por el formulario**: acá no se pide nada. */
  especies: readonly Especie[];
  /** La elegida del catálogo. Vacío si todavía no hay o si es una nueva. */
  especieId: string;
  /** El nombre de una especie **nueva**. Vacío si se eligió del catálogo. */
  especieNombre: string;
  /** Se eligió una del catálogo: el renglón sale con `especieId`. */
  onElegir: (especie: Especie) => void;
  /** Se escribió una que no existe: el renglón sale con `especie`. */
  onCrear: (nombre: string) => void;
  /** Qué renglón es. El lector de pantalla no ve la fila. */
  accessibilityLabel: string;
  hasError?: boolean;
  /** El catálogo todavía se está trayendo. */
  cargando?: boolean;
}

/**
 * El selector de especie de un renglón de factura (`docs/flujo_especies.md`
 * §9): un combo con búsqueda **y una escotilla para crear**.
 *
 * La escotilla es lo que hace vivible la regla de que la especie sea
 * obligatoria: obligar a poner especie y a la vez obligar a salir de la pantalla
 * a crearla terminaría siempre igual, en un catálogo con una sola especie
 * llamada "varios". Cuando lo tipeado no coincide con nada, la última opción de
 * la lista es **crear esa especie** — y eso **no dispara ningún request**: marca
 * el renglón para que salga con `especie` en vez de `especieId`, y el backend la
 * crea en la misma transacción que la factura.
 *
 * Se despliega **en línea** y no en un `Modal`: en esta app los Modal se evitan
 * porque son una ventana nativa aparte que no hereda el edge-to-edge.
 *
 * Sin lógica de datos: el catálogo llega por props, ya pedido una sola vez por
 * formulario.
 */
function SelectorDeEspecieComponent({
  especies,
  especieId,
  especieNombre,
  onElegir,
  onCrear,
  accessibilityLabel,
  hasError = false,
  cargando = false,
}: SelectorDeEspecieProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');

  const elegida = useMemo(
    () => (especieId ? especies.find((especie) => especie.id === especieId) : undefined),
    [especies, especieId],
  );

  const coincidencias = useMemo(() => filtrarEspecies(especies, texto), [especies, texto]);

  /**
   * Ofrecer "crear" solo si de verdad no existe: con `Gaseosa` en el catálogo,
   * tipear `gaseosa` no puede ofrecer crear una segunda —serían la misma y el
   * backend devolvería la que ya está—.
   */
  const nombreNuevo = texto.trim();
  const sePuedeCrear =
    nombreNuevo.length >= MIN_LARGO_ESPECIE &&
    buscarEspeciePorNombre(especies, nombreNuevo) === undefined;

  const alternar = useCallback(() => setAbierto((actual) => !actual), []);

  const elegir = useCallback(
    (especie: Especie) => {
      onElegir(especie);
      // Se cierra al elegir: lo elegido queda a la vista arriba y la lista
      // abierta empujaría el resto del renglón fuera de la pantalla.
      setAbierto(false);
      setTexto('');
    },
    [onElegir],
  );

  const crear = useCallback(() => {
    onCrear(nombreNuevo);
    setAbierto(false);
    setTexto('');
  }, [onCrear, nombreNuevo]);

  /** Qué dice el control cerrado. */
  const etiqueta = elegida?.nombre ?? (especieNombre || 'Elegí una especie');

  /**
   * Se eligió una del catálogo que ya no está: la borraron desde el catálogo
   * mientras este formulario estaba abierto. Mandarla sería un `400`, así que se
   * dice acá y no después de guardar.
   */
  const elegidaPerdida = especieId !== '' && elegida === undefined && !cargando;

  return (
    <View style={styles.campo}>
      <Pressable
        onPress={alternar}
        style={({ pressed }) => [
          styles.control,
          abierto && styles.controlAbierto,
          (hasError || elegidaPerdida) && styles.controlConError,
          pressed && styles.presionado,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${
          elegidaPerdida ? 'la especie elegida ya no está en el catálogo' : etiqueta
        }`}
        accessibilityHint="Abre la lista de especies"
        accessibilityState={{ expanded: abierto }}
      >
        {/* `flex: 1` en el contenedor: el chip y la flecha quedan a la derecha
            y el nombre largo se corta en vez de empujarlos afuera. */}
        <View style={styles.etiqueta}>
          <Text
            variant="body"
            color={elegida || especieNombre ? 'text' : 'textMuted'}
            numberOfLines={1}
          >
            {elegidaPerdida ? 'Especie no encontrada' : etiqueta}
          </Text>
        </View>

        {/* La que todavía no existe se marca: es la diferencia entre elegir del
            catálogo y crear una al guardar la factura. */}
        {especieNombre !== '' && <Chip label="Nueva" tone="brand" />}

        {abierto ? (
          <ChevronUp size={ICON_SIZE} color={theme.colors.textMuted} />
        ) : (
          <ChevronDown size={ICON_SIZE} color={theme.colors.textMuted} />
        )}
      </Pressable>

      {elegidaPerdida && (
        <Text variant="caption" color="error">
          Esa especie ya no está en el catálogo. Elegí otra.
        </Text>
      )}

      {abierto && (
        <View style={styles.panel}>
          <Input
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar o escribir una nueva"
            leftIcon={<Search size={ICON_SIZE} color={theme.colors.textMuted} />}
            onClear={() => setTexto('')}
            autoCapitalize="sentences"
            autoCorrect={false}
            accessibilityLabel="Buscar una especie o escribir una nueva"
          />

          <ScrollView
            style={styles.lista}
            keyboardShouldPersistTaps="handled"
            // Va adentro del scroll del formulario: sin esto, en Android el
            // gesto lo agarra el de afuera y esta lista no se mueve.
            nestedScrollEnabled
          >
            {cargando && coincidencias.length === 0 && (
              <Text variant="caption" color="textMuted">
                Trayendo el catálogo…
              </Text>
            )}

            {coincidencias.map((especie) => {
              const seleccionada = especie.id === especieId;
              return (
                <Pressable
                  key={especie.id}
                  onPress={() => elegir(especie)}
                  style={({ pressed }) => [styles.opcion, pressed && styles.presionado]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: seleccionada }}
                  accessibilityLabel={especie.nombre}
                >
                  <Text
                    variant="body"
                    weight={seleccionada ? 'semibold' : 'regular'}
                    numberOfLines={1}
                  >
                    {especie.nombre}
                  </Text>
                  {seleccionada && <Check size={ICON_SIZE} color={theme.colors.primary} />}
                </Pressable>
              );
            })}

            {/* La última opción, cuando lo tipeado no es ninguna de las de
                arriba. No pide nada a la API: la especie se crea junto con la
                factura. */}
            {sePuedeCrear && (
              <Pressable
                onPress={crear}
                style={({ pressed }) => [
                  styles.opcion,
                  styles.opcionCrear,
                  pressed && styles.presionado,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Crear la especie ${nombreNuevo}`}
              >
                <Plus size={ICON_SIZE} color={theme.colors.primary} />
                <Text variant="body" color="primary" numberOfLines={1}>
                  {`Crear "${nombreNuevo}"`}
                </Text>
              </Pressable>
            )}

            {coincidencias.length === 0 && !sePuedeCrear && !cargando && (
              <Text variant="caption" color="textMuted">
                {especies.length === 0
                  ? 'El catálogo está vacío. Escribí el nombre de la especie y creala.'
                  : `Ninguna coincide. Escribí al menos ${MIN_LARGO_ESPECIE} letras para crearla.`}
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    campo: { gap: theme.spacing.xxs },

    control: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      // El mismo alto que un Input, para que la fila quede pareja.
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
    },
    /** El nombre se lleva el ancho sobrante. */
    etiqueta: { flex: 1 },
    controlAbierto: { borderColor: theme.colors.primary },
    controlConError: { borderColor: theme.colors.error },
    presionado: { opacity: 0.7 },

    panel: {
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
    },
    lista: { maxHeight: ALTO_LISTA },

    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.sm,
    },
    /** La de crear va junta y a la izquierda: es una acción, no una opción más. */
    opcionCrear: { justifyContent: 'flex-start' },
  });

export const SelectorDeEspecie = memo(SelectorDeEspecieComponent);
