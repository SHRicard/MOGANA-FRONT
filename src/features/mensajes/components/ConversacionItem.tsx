import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import BellOff from 'lucide-react-native/icons/bell-off';
import { Badge } from '@/shared/ui/atoms/Badge';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { LadosDelMensaje, nombreDelCliente, type Conversacion } from '../types';

export interface ConversacionItemProps {
  conversacion: Conversacion;
  onPress: (conversacion: Conversacion) => void;
}

const ICON_SIZE = 13;

/**
 * **Un renglón de la bandeja del panel**: un cliente que escribió alguna vez.
 *
 * Lo que decide qué se ve acá es una sola pregunta: *¿tengo que contestar
 * esto?*. Por eso el sin leer va con **número, negrita y punto** —no con el
 * fondo, que solo distingue quien ve bien los contrastes suaves— y por eso
 * `leidoPor` está a la vista: la bandeja es compartida, y saber que alguien ya
 * pasó por ese hilo es lo único que evita dos respuestas iguales.
 *
 * ⚠️ **El adelanto va recortado a una línea.** Es el gancho para entrar, no el
 * mensaje: quien necesita leerlo entero abre el hilo.
 */
function ConversacionItemComponent({ conversacion, onPress }: ConversacionItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tocar = useCallback(() => onPress(conversacion), [onPress, conversacion]);

  const nuevo = conversacion.sinLeer > 0;
  const nombre = nombreDelCliente(conversacion.cliente);
  const contestamosNosotros = conversacion.ultimoLado === LadosDelMensaje.NEGOCIO;

  return (
    <Pressable
      onPress={tocar}
      style={({ pressed }) => [styles.card, nuevo && styles.cardNueva, pressed && styles.presionada]}
      accessibilityRole="button"
      accessibilityLabel={`${nuevo ? `${conversacion.sinLeer} sin leer. ` : ''}${nombre}. ${
        conversacion.adelanto ?? 'Sin mensajes'
      }`}
    >
      <View style={styles.encabezado}>
        <View style={styles.punto}>
          {nuevo ? <View style={styles.puntoLleno} /> : null}
        </View>

        <View style={styles.nombre}>
          <Text variant="body" weight={nuevo ? 'semibold' : 'medium'} numberOfLines={1}>
            {nombre}
          </Text>
        </View>

        {conversacion.silenciada ? (
          <BellOff size={ICON_SIZE} color={theme.colors.textMuted} />
        ) : null}

        <Badge
          count={conversacion.sinLeer}
          tone="primary"
          accessibilityLabel={`${conversacion.sinLeer} mensajes sin leer`}
        />
      </View>

      {conversacion.adelanto ? (
        <Text variant="small" color={nuevo ? 'text' : 'textMuted'} numberOfLines={1}>
          {/* Quién habló último. Sin esto, "ok gracias" parece nuestro. */}
          {contestamosNosotros ? `Vos: ${conversacion.adelanto}` : conversacion.adelanto}
        </Text>
      ) : (
        <Text variant="small" color="textMuted">
          Sin mensajes todavía
        </Text>
      )}

      <View style={styles.pie}>
        <Text variant="caption" color="textMuted">
          {conversacion.ultimoMensajeEn ? formatFechaHora(conversacion.ultimoMensajeEn) : '—'}
        </Text>

        {/*
          Quién del panel lo miró último. Solo se muestra si todavía hay algo sin
          leer: en un hilo ya atendido no aporta, y sumaría un renglón de ruido a
          cada fila de la lista.
        */}
        {nuevo && conversacion.leidoPor?.displayName ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Lo miró {conversacion.leidoPor.displayName}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Memo: la bandeja se vuelve a dibujar entera cada ocho segundos. */
export const ConversacionItem = memo(ConversacionItemComponent);

/** Lado del punto que marca los que tienen algo sin leer. */
const PUNTO = 8;

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
    cardNueva: { borderColor: theme.colors.primary },
    presionada: { opacity: 0.7 },

    encabezado: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    /** Ocupa el lugar aunque esté apagado, así los nombres se alinean. */
    punto: { width: PUNTO, height: PUNTO },
    puntoLleno: {
      width: PUNTO,
      height: PUNTO,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },

    /** Se estira: el nombre baja de línea en vez de empujar al badge afuera. */
    nombre: { flex: 1 },

    pie: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
  });
