import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Lock from 'lucide-react-native/icons/lock';
import type { Rol } from '@/features/auth';
import { ROL_LABEL } from '@/features/usuarios';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import type { OpcionDeRol } from '../types';

export interface SelectorDeRolProps {
  opciones: readonly OpcionDeRol[];
  /** Elegir uno abre el diálogo de confirmación. No cambia nada por sí solo. */
  onElegir: (rol: Rol) => void;
  /** Hay un cambio en vuelo: no se puede tocar otro rol mientras tanto. */
  deshabilitado: boolean;
}

const ICON_SIZE = 18;

/**
 * **A qué rol puede pasar esta cuenta** (§5).
 *
 * El backend ya evaluó todas las reglas y devolvió `rolesPosibles` y
 * `rolesImposibles` con el motivo escrito: acá no se decide nada, se dibuja eso.
 *
 * ⚠️ **El motivo del bloqueo va debajo de la opción, no en un tooltip.** Una
 * opción gris que no se explica sola se lee como un bug — y el texto es el mismo
 * que devolvería el error, así que la explicación no se escribe dos veces y no
 * se pueden desincronizar.
 *
 * ⚠️ Esto **no reemplaza al manejo de errores**: la lista se calculó hace unos
 * segundos y la base pudo cambiar. El servidor valida todo de nuevo, y el `400`
 * y los dos `409` se siguen mostrando.
 */
function SelectorDeRolComponent({ opciones, onElegir, deshabilitado }: SelectorDeRolProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.lista}>
      {opciones.map((opcion, indice) => {
        const bloqueada = opcion.bloqueo !== null;
        // El rol actual no se ofrece como cambio: mandarlo devuelve 200 y no
        // hace nada, así que un botón que "no hace nada" solo confunde.
        const tocable = !opcion.actual && !bloqueada && !deshabilitado;

        const contenido = (
          <>
            <View style={styles.textos}>
              <Text
                variant="body"
                color={opcion.actual ? 'text' : bloqueada ? 'textMuted' : 'text'}
                weight={opcion.actual ? 'semibold' : 'regular'}
              >
                {ROL_LABEL[opcion.rol]}
              </Text>
              {opcion.actual ? (
                <Text variant="caption" color="textMuted">
                  Es el rol que tiene hoy
                </Text>
              ) : opcion.bloqueo ? (
                <Text variant="caption" color="textMuted">
                  {opcion.bloqueo}
                </Text>
              ) : (
                <Text variant="caption" color="textMuted">
                  Tocá para pasarla a este rol
                </Text>
              )}
            </View>

            {opcion.actual ? (
              <Check size={ICON_SIZE} color={theme.colors.primary} />
            ) : bloqueada ? (
              <Lock size={ICON_SIZE} color={theme.colors.textMuted} />
            ) : null}
          </>
        );

        if (!tocable) {
          return (
            <View
              key={opcion.rol}
              style={[styles.fila, indice > 0 && styles.filaConBorde]}
              accessible
              accessibilityLabel={
                opcion.actual
                  ? `${ROL_LABEL[opcion.rol]}. Es el rol que tiene hoy.`
                  : `${ROL_LABEL[opcion.rol]}. No se puede: ${opcion.bloqueo ?? ''}`
              }
            >
              {contenido}
            </View>
          );
        }

        return (
          <Pressable
            key={opcion.rol}
            onPress={() => onElegir(opcion.rol)}
            style={({ pressed }) => [
              styles.fila,
              indice > 0 && styles.filaConBorde,
              pressed && styles.presionada,
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Pasar esta cuenta a ${ROL_LABEL[opcion.rol]}`}
          >
            {contenido}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    lista: {
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: 64,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    /** Línea entre filas, menos arriba de la primera. */
    filaConBorde: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    presionada: { opacity: 0.7 },

    /** `flex: 1` para que el ícono quede pegado al borde derecho. */
    textos: { flex: 1, gap: theme.spacing.xxs },
  });

export const SelectorDeRol = memo(SelectorDeRolComponent);
