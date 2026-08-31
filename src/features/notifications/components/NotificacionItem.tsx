import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { sinLeer, type Notificacion } from '../types';

export interface NotificacionItemProps {
  notificacion: Notificacion;
  /** Se llama al tocarlo. La pantalla decide qué hacer (marcarlo leído). */
  onPress: (notificacion: Notificacion) => void;
}

/** Lado del punto que marca los sin leer. */
const PUNTO = 8;

/**
 * Un aviso de la lista.
 *
 * El `titulo` y el `mensaje` vienen **ya redactados por el backend** y son el
 * mismo texto del correo: se muestran tal cual, sin recortar. El mensaje explica
 * qué hacer —pasar por el local—, así que cortarlo en dos líneas con puntos
 * suspensivos dejaría afuera justo la parte que sirve.
 *
 * Los sin leer se marcan con **punto y negrita**, no solo con el fondo: el color
 * de fondo solo no lo distingue quien no ve bien los contrastes suaves.
 *
 * Sin lógica de negocio: recibe el aviso y avisa cuándo lo tocaron. **A dónde
 * lleva lo decide la pantalla**, que es la única que conoce el router.
 */
function NotificacionItemComponent({ notificacion, onPress }: NotificacionItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const nuevo = sinLeer(notificacion);

  const tocar = useCallback(() => onPress(notificacion), [onPress, notificacion]);

  return (
    <Pressable
      onPress={tocar}
      style={({ pressed }) => [
        styles.card,
        nuevo && styles.cardNueva,
        pressed && styles.presionada,
      ]}
      accessibilityRole="button"
      // El estado entra en el label y no solo en el dibujo: "sin leer" es lo
      // primero que necesita saber quien escucha la lista.
      accessibilityLabel={`${nuevo ? 'Sin leer. ' : ''}${notificacion.titulo}. ${
        notificacion.mensaje
      }`}
      // No promete a dónde lleva: eso lo decide el tipo del aviso, que este
      // componente no mira. Lo que sí es seguro es que tocarlo lo marca leído.
      accessibilityHint={nuevo ? 'Tocá para marcarlo como leído y abrirlo' : undefined}
    >
      <View style={styles.encabezado}>
        {/* Decorativo: que está sin leer ya lo dice el `accessibilityLabel`. */}
        <View
          style={[styles.punto, !nuevo && styles.puntoLeido]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        {/* El atom Text no acepta `style` —los estilos salen del theme—, así que
            el que se estira es este View: el título baja de línea en vez de
            empujar al punto fuera de la tarjeta. */}
        <View style={styles.titulo}>
          <Text variant="body" weight={nuevo ? 'semibold' : 'medium'}>
            {notificacion.titulo}
          </Text>
        </View>
      </View>

      <Text variant="small" color={nuevo ? 'text' : 'textMuted'}>
        {notificacion.mensaje}
      </Text>

      <Text variant="caption" color="textMuted">
        {formatFechaHora(notificacion.createdAt)}
      </Text>
    </Pressable>
  );
}

/** Memo: la lista se re-dibuja entera cuando cambia el globito. */
export const NotificacionItem = memo(NotificacionItemComponent);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    /** Sin leer: el fondo acompaña al punto y a la negrita, no las reemplaza. */
    cardNueva: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primaryMuted,
    },
    presionada: { opacity: 0.7 },

    encabezado: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    punto: {
      width: PUNTO,
      height: PUNTO,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
    /** Leído: el punto se apaga pero ocupa el lugar, así los títulos se alinean. */
    puntoLeido: { backgroundColor: 'transparent' },

    /** Ocupa lo que sobra de la fila: ver el comentario del JSX. */
    titulo: { flex: 1 },
  });
