import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

const ICON_SIZE = 20;

export interface OpcionDeOrden<T extends string> {
  valor: T;
  /** Qué aparece primero con este orden. */
  label: string;
  /** Para qué sirve mirarlo así. Es lo que vuelve útil al selector. */
  ayuda: string;
}

export interface FiltroOrdenProps<T extends string> {
  orden: T;
  /** Los órdenes disponibles, en el orden en que se ofrecen. */
  opciones: readonly OpcionDeOrden<T>[];
  onChange: (orden: T) => void;
}

/**
 * Qué aparece primero. **Es lo que vuelve útil a un listado**: el mismo listado
 * de clientes ordenado por inactividad es la lista de a quiénes llamar para
 * recuperar, y por cumplimiento es la de a quiénes cortarles el fiado; la misma
 * lista de especies ordenada por caída es la de qué se está apagando.
 *
 * Cada opción muestra **quién encabeza la lista** y para qué sirve mirarla, en
 * vez del nombre del campo: "cumplimiento" hay que pensarlo, "el que peor paga"
 * no.
 *
 * No hay ascendente/descendente: cada orden ya viene con la dirección en la que
 * sirve. Un "cumplimiento descendente" mostraría primero a los que pagan bien,
 * que es justo lo que nadie necesita mirar.
 *
 * Se despliega **en línea** y no en un `Modal`: en esta app los Modal se evitan
 * porque son una ventana nativa aparte que no hereda el edge-to-edge.
 *
 * Es genérico en el tipo del orden —cada pantalla tiene los suyos— y por eso no
 * conoce ningún catálogo: recibe las opciones ya armadas.
 */
function FiltroOrdenComponent<T extends string>({
  orden,
  opciones,
  onChange,
}: FiltroOrdenProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [abierto, setAbierto] = useState(false);
  const alternar = useCallback(() => setAbierto((actual) => !actual), []);

  const elegir = useCallback(
    (opcion: T) => {
      onChange(opcion);
      // Se cierra al elegir: lo elegido ya queda a la vista arriba, y dejar la
      // lista abierta empuja los renglones fuera de la pantalla.
      setAbierto(false);
    },
    [onChange],
  );

  const elegida = opciones.find((opcion) => opcion.valor === orden);

  return (
    <View style={styles.campo}>
      <Text variant="small" weight="medium">
        Primero aparece
      </Text>

      <Pressable
        onPress={alternar}
        style={({ pressed }) => [
          styles.control,
          abierto && styles.controlAbierto,
          pressed && styles.presionado,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Primero aparece: ${elegida?.label ?? ''}`}
        accessibilityHint="Abre la lista de órdenes"
        accessibilityState={{ expanded: abierto }}
      >
        <View style={styles.valor}>
          <Text variant="body" weight="medium">
            {elegida?.label ?? ''}
          </Text>
          <Text variant="micro" color="textMuted">
            {elegida?.ayuda ?? ''}
          </Text>
        </View>

        {abierto ? (
          <ChevronUp size={ICON_SIZE} color={theme.colors.textMuted} />
        ) : (
          <ChevronDown size={ICON_SIZE} color={theme.colors.textMuted} />
        )}
      </Pressable>

      {abierto && (
        <View style={styles.lista}>
          {opciones.map((opcion, indice) => {
            const activa = opcion.valor === orden;

            return (
              <Pressable
                key={opcion.valor}
                onPress={() => elegir(opcion.valor)}
                style={({ pressed }) => [
                  styles.opcion,
                  indice > 0 && styles.opcionConBorde,
                  pressed && styles.presionado,
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${opcion.label}. ${opcion.ayuda}`}
                accessibilityState={{ selected: activa }}
              >
                <View style={styles.valor}>
                  {/* Lo elegido se marca con el tilde y con la negrita, no solo
                      con un fondo distinto. */}
                  <Text variant="body" weight={activa ? 'semibold' : 'regular'}>
                    {opcion.label}
                  </Text>
                  <Text variant="micro" color="textMuted">
                    {opcion.ayuda}
                  </Text>
                </View>

                {activa && <Check size={ICON_SIZE} color={theme.colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    campo: { gap: theme.spacing.xs },

    control: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    // Abierto engrosa el borde además de cambiar el color: el estado no se
    // comunica solo con el tono.
    controlAbierto: { borderColor: theme.colors.primary, borderWidth: 2 },
    presionado: { opacity: 0.7 },

    /** `flex: 1` para que el chevron y el tilde queden pegados al borde. */
    valor: { flex: 1, gap: theme.spacing.xxs },

    lista: {
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 56,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    /** Línea entre opciones, menos arriba de la primera. */
    opcionConBorde: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });

/**
 * `memo` pierde los genéricos, así que se le devuelve el tipo con un cast. Es el
 * idioma conocido para memoizar un componente genérico: el envoltorio no cambia
 * la firma, solo evita re-renders.
 */
export const FiltroOrden = memo(FiltroOrdenComponent) as typeof FiltroOrdenComponent;
