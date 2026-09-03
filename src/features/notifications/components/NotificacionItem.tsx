import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import X from 'lucide-react-native/icons/x';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { llevaAAlgunLado, sinLeer, type Notificacion } from '../types';

export interface NotificacionItemProps {
  notificacion: Notificacion;
  /** Se llama al tocarlo. La pantalla decide qué hacer (marcarlo leído). */
  onPress: (notificacion: Notificacion) => void;
  /** Sacarlo de la campanita. Sin esto no se dibuja la cruz. */
  onBorrar?: (id: string) => void;
}

/** Lado del punto que marca los sin leer. */
const PUNTO = 8;

const ICON_SIZE = 16;
/** Alto del área táctil de la cruz. */
const CERRAR_SIZE = 32;

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
 * ⚠️ **Se dibuja como tocable solo si el aviso lleva a algún lado.** Un anuncio
 * es texto y nada más: si se viera como un botón y no hiciera nada, se sentiría
 * roto. Eso lo dice el `destino` que manda el backend, no el tipo.
 *
 * Sin lógica de negocio: recibe el aviso y avisa cuándo lo tocaron. **A dónde
 * lleva lo decide la pantalla**, que es la única que conoce el router.
 */
function NotificacionItemComponent({ notificacion, onPress, onBorrar }: NotificacionItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const nuevo = sinLeer(notificacion);
  const abre = llevaAAlgunLado(notificacion);

  const tocar = useCallback(() => onPress(notificacion), [onPress, notificacion]);
  const borrar = useCallback(() => onBorrar?.(notificacion.id), [onBorrar, notificacion.id]);

  return (
    <Pressable
      onPress={tocar}
      style={({ pressed }) => [
        styles.card,
        nuevo && styles.cardNueva,
        pressed && styles.presionada,
      ]}
      accessibilityRole={abre ? 'button' : 'text'}
      // El estado entra en el label y no solo en el dibujo: "sin leer" es lo
      // primero que necesita saber quien escucha la lista.
      accessibilityLabel={`${nuevo ? 'Sin leer. ' : ''}${notificacion.titulo}. ${
        notificacion.mensaje
      }`}
      // No promete A DÓNDE lleva —eso sale del `destino`, que este componente no
      // traduce—, solo que hay algo para abrir.
      accessibilityHint={
        abre ? 'Tocá para abrirlo' : nuevo ? 'Tocá para marcarlo como leído' : undefined
      }
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

        {/*
          Sacarlo de la campanita. No pregunta: es uno solo y se ve cuál. Va como
          `Pressable` propio adentro de la tarjeta —no como gesto de deslizar—
          porque un gesto oculto no se descubre solo.
        */}
        {onBorrar ? (
          <Pressable
            onPress={borrar}
            hitSlop={theme.spacing.sm}
            style={styles.cerrar}
            accessibilityRole="button"
            accessibilityLabel={`Borrar el aviso: ${notificacion.titulo}`}
          >
            <X size={ICON_SIZE} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
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

    cerrar: {
      width: CERRAR_SIZE,
      height: CERRAR_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
  });
