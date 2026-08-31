import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { MEDIO_DE_PAGO_LABEL, MEDIOS_DE_PAGO, type MedioDePago } from '../types';

export interface SelectorDeMedioProps {
  value: MedioDePago;
  onChange: (medio: MedioDePago) => void;
}

const ICON_SIZE = 20;

/**
 * Cómo pagué: **una lista cerrada de cinco**, no un campo de texto
 * (`docs/user_cliente_flujo.md` §8).
 *
 * Es cerrada a propósito: "transf.", "transferencia bancaria" y "banco" son la
 * misma cosa escrita de tres maneras que después no se puede agrupar. `Otro`
 * está para no obligar a mentir — lo que no entre se explica en la referencia o
 * en la nota.
 *
 * Se despliega **en línea** y no en un `Modal`: en esta app los Modal se evitan
 * porque son una ventana nativa aparte que no hereda el edge-to-edge.
 */
function SelectorDeMedioComponent({ value, onChange }: SelectorDeMedioProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [abierto, setAbierto] = useState(false);
  const alternar = useCallback(() => setAbierto((actual) => !actual), []);

  const elegir = useCallback(
    (medio: MedioDePago) => {
      onChange(medio);
      // Se cierra al elegir: lo elegido ya queda a la vista arriba, y dejar la
      // lista abierta empuja el resto del formulario fuera de la pantalla.
      setAbierto(false);
    },
    [onChange],
  );

  return (
    <View style={styles.campo}>
      <Text variant="small" weight="medium">
        Cómo pagaste
      </Text>

      <Pressable
        onPress={alternar}
        style={({ pressed }) => [
          styles.control,
          abierto && styles.controlAbierto,
          pressed && styles.presionado,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Cómo pagaste: ${MEDIO_DE_PAGO_LABEL[value]}`}
        accessibilityHint="Abre la lista de medios de pago"
        accessibilityState={{ expanded: abierto }}
      >
        <View style={styles.valor}>
          <Text variant="body" weight="medium">
            {MEDIO_DE_PAGO_LABEL[value]}
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
          {MEDIOS_DE_PAGO.map((medio, indice) => {
            const activo = medio === value;

            return (
              <Pressable
                key={medio}
                onPress={() => elegir(medio)}
                style={({ pressed }) => [
                  styles.opcion,
                  indice > 0 && styles.opcionConBorde,
                  pressed && styles.presionado,
                ]}
                accessibilityRole="button"
                accessibilityLabel={MEDIO_DE_PAGO_LABEL[medio]}
                accessibilityState={{ selected: activo }}
              >
                <View style={styles.valor}>
                  <Text variant="body" weight={activo ? 'semibold' : 'regular'}>
                    {MEDIO_DE_PAGO_LABEL[medio]}
                  </Text>
                </View>

                {/* Lo elegido se marca con el tilde y con la negrita, no solo
                    con un color de fondo distinto. */}
                {activo && <Check size={ICON_SIZE} color={theme.colors.primary} />}
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
  });

export const SelectorDeMedio = memo(SelectorDeMedioComponent);
