import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme, type ThemeColors } from '@/theme';

/**
 * Una opción de la lista. `null` es "todos": es el valor que la API entiende
 * como "sin filtro", porque sin el query param devuelve todo.
 */
export interface OpcionEstado<T extends string> {
  value: T | null;
  label: string;
  /** El color del estado, o `null` en la opción "todos", que no es un estado. */
  color: keyof ThemeColors | null;
}

export interface FiltroEstadoProps<T extends string> {
  /** Qué se está filtrando: "Estado de la cuenta", "Estado de la factura". */
  label: string;
  /** Las opciones, en el orden en que se muestran. */
  opciones: readonly OpcionEstado<T>[];
  /** `null` = todos los estados. */
  estado: T | null;
  onChange: (estado: T | null) => void;
}

const ICON_SIZE = 20;
/** Diámetro del punto de color. Chico: acompaña al texto, no compite con él. */
const PUNTO = 10;

/**
 * Filtro por estado: una lista desplegable.
 *
 * Sirve para los dos estados de la app —el de una cuenta y el de una factura—
 * porque el dibujo es el mismo; lo que cambia son las opciones, que se pasan por
 * props (`OPCIONES_ESTADO_CUENTA`, `OPCIONES_ESTADO_FACTURA`).
 *
 * Antes eran cinco botones sueltos en dos renglones. Como lista, el filtro
 * ocupa **una línea** cuando no se está usando —que es casi siempre— y deja el
 * tablero arriba de todo; además se lee de corrido qué opciones hay, en vez de
 * tener que barrer pastillas de distinto ancho.
 *
 * Cada opción lleva **el color de su estado**, el mismo del badge de los
 * renglones: elegir "Vencida" y ver el mismo rojo arriba y abajo es lo que hace
 * que el filtro se entienda sin leerlo.
 *
 * Se despliega **en línea** y no en un `Modal`: en esta app los Modal se evitan
 * porque son una ventana nativa aparte que no hereda el edge-to-edge (mismo
 * motivo por el que `MenuSheet` es una view absoluta).
 *
 * Elegir una opción vuelve siempre a la página 1 (lo hace el hook).
 *
 * Nació en el tablero de facturación y subió acá cuando lo necesitó una segunda
 * feature —la vista del cliente sobre sus propias facturas— (regla de promoción
 * del `CLAUDE.md`). Sin lógica de negocio: **no conoce ningún estado**. Los
 * catálogos viven en cada feature, que es lo que les deja usar sus propias
 * palabras — el panel dice "Por vencer" y el cliente "Vence pronto".
 */
function FiltroEstadoComponent<T extends string>({
  label,
  opciones,
  estado,
  onChange,
}: FiltroEstadoProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [abierto, setAbierto] = useState(false);
  const alternar = useCallback(() => setAbierto((actual) => !actual), []);

  const elegida = opciones.find((opcion) => opcion.value === estado) ?? opciones[0]!;

  const elegir = useCallback(
    (opcion: OpcionEstado<T>) => {
      onChange(opcion.value);
      // Se cierra al elegir: lo elegido ya queda a la vista arriba, y dejar la
      // lista abierta empuja el tablero fuera de la pantalla.
      setAbierto(false);
    },
    [onChange],
  );

  return (
    <View style={styles.campo}>
      <Text variant="small" weight="medium">
        {label}
      </Text>

      <Pressable
        onPress={alternar}
        style={({ pressed }) => [
          styles.control,
          abierto && styles.controlAbierto,
          pressed && styles.presionado,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${elegida.label}`}
        accessibilityHint="Abre la lista de estados"
        accessibilityState={{ expanded: abierto }}
      >
        {elegida.color && (
          <View style={[styles.punto, { backgroundColor: theme.colors[elegida.color] }]} />
        )}

        <View style={styles.valor}>
          <Text variant="body" weight="medium">
            {elegida.label}
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
            const activa = opcion.value === estado;

            return (
              <Pressable
                key={opcion.label}
                onPress={() => elegir(opcion)}
                style={({ pressed }) => [
                  styles.opcion,
                  indice > 0 && styles.opcionConBorde,
                  pressed && styles.presionado,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${opcion.label}`}
                accessibilityState={{ selected: activa }}
              >
                {/* El punto va en una caja de ancho fijo para que todos los
                    textos arranquen alineados, tenga color o no ("Todas"). */}
                <View style={styles.puntoCaja}>
                  {opcion.color && (
                    <View style={[styles.punto, { backgroundColor: theme.colors[opcion.color] }]} />
                  )}
                </View>

                <View style={styles.valor}>
                  <Text variant="body" weight={activa ? 'semibold' : 'regular'}>
                    {opcion.label}
                  </Text>
                </View>

                {/* Lo elegido se marca con el tilde y con la negrita, no solo con
                    un color de fondo distinto. */}
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
    valor: { flex: 1 },

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
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    /** Línea entre opciones, menos arriba de la primera. */
    opcionConBorde: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },

    puntoCaja: { width: PUNTO, alignItems: 'center' },
    punto: {
      width: PUNTO,
      height: PUNTO,
      borderRadius: theme.radius.full,
    },
  });

/**
 * El `memo` se pierde los genéricos, así que se le vuelve a poner el tipo del
 * componente: sin el cast, `FiltroEstado` dejaría de inferir `T` y habría que
 * anotarlo en cada uso.
 */
export const FiltroEstado = memo(FiltroEstadoComponent) as typeof FiltroEstadoComponent;
