import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { rolLabel } from '@/features/usuarios';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFechaHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { accionLabel, nombreEnElRastro, type RenglonDeAuditoria } from '../types';

export interface AuditoriaItemProps {
  renglon: RenglonDeAuditoria;
  /** Abre la ficha de la cuenta a la que le pasó. */
  onVerCuenta: (cuentaId: string, nombre: string) => void;
}

const ICON_SIZE = 14;

/**
 * Un renglón del historial (§7). Se lee como una frase:
 *
 * > **Ricardo Ramírez** cambió a **Ana Operadora** de administrador a cliente —
 * > *"Dejó el negocio en agosto"* · 2 sep 2026, 15:54
 *
 * ⚠️ **`actor` y `objetivo` pueden ser `null`**: esa cuenta ya no existe. El
 * renglón sobrevive a la persona, que es exactamente lo que se le pide a una
 * auditoría — así que ahí se muestra el id, que siempre está, y no un guion.
 *
 * Tocarlo abre la ficha de la cuenta a la que le pasó: es la pregunta que sigue
 * a leer un renglón ("¿y cómo está ahora?").
 */
function AuditoriaItemComponent({ renglon, onVerCuenta }: AuditoriaItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const quien = nombreEnElRastro(renglon.actor, renglon.actorId);
  const aQuien = nombreEnElRastro(renglon.objetivo, renglon.objetivoId);

  const abrir = useCallback(
    () => onVerCuenta(renglon.objetivoId, aQuien),
    [onVerCuenta, renglon.objetivoId, aQuien],
  );

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${quien} cambió a ${aQuien}. Abrir su ficha.`}
    >
      <View style={styles.encabezado}>
        <Text variant="caption" color="textMuted">
          {accionLabel(renglon.accion)}
        </Text>
        <Text variant="caption" color="textMuted">
          {formatFechaHora(renglon.fecha)}
        </Text>
      </View>

      <Text variant="body" numberOfLines={2}>
        {`${quien} cambió a ${aQuien}`}
      </Text>

      {/* Los dos roles, del que era al que quedó. Sin `antes` —una acción futura
          que no mueva roles— no se dibuja la línea en vez de inventar un guion. */}
      {renglon.antes || renglon.despues ? (
        <View style={styles.roles}>
          {renglon.antes ? <Chip label={rolLabel(renglon.antes)} /> : null}
          <ArrowRight size={ICON_SIZE} color={theme.colors.textMuted} />
          {renglon.despues ? <Chip label={rolLabel(renglon.despues)} tone="brand" /> : null}
        </View>
      ) : null}

      {renglon.motivo ? (
        <Text variant="small" color="textMuted">
          {renglon.motivo}
        </Text>
      ) : null}

      {/* Que la cuenta ya no exista es información, no un error de carga: sin
          esto, ver un uuid donde debería ir un nombre parece un bug. */}
      {!renglon.actor || !renglon.objetivo ? (
        <Text variant="caption" color="textMuted">
          Alguna de las dos cuentas ya no existe. El renglón queda igual: para eso está.
        </Text>
      ) : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tarjeta: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    presionada: { opacity: 0.7 },

    encabezado: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    roles: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  });

export const AuditoriaItem = memo(AuditoriaItemComponent);
