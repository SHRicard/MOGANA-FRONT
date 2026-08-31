import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Text } from '@/shared/ui/atoms/Text';
import { formatearDni } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { EstadoDeCuentaBadge } from './EstadoDeCuentaBadge';
import { cuentaBloqueada, sinFiado, type ClienteDeLaFicha } from '../types';

export interface IdentidadDelClienteProps {
  cliente: ClienteDeLaFicha;
  /** El estado de su **cuenta corriente**, que viene aparte del cliente. */
  estadoDeCuenta: string;
}

/**
 * Quién es: el encabezado de la ficha.
 *
 * Los datos de contacto están para **poder llamarlo**, que es lo que se hace
 * después de mirar los números. El teléfono puede no estar —nadie está obligado
 * a cargarlo— y en ese caso se dice, en vez de dejar el renglón vacío.
 *
 * Dos marcas que no se pueden confundir y por eso van con textos distintos:
 *
 *  - **No se le fía** (`docs/bloquear_fiado.md`): lo que se le emita vence el
 *    mismo día. **El motivo se muestra siempre que esté**: sin él, el que
 *    atiende no sabe si puede hacer una excepción.
 *  - **Cuenta bloqueada**: le falta el DNI y no puede usar la app. ⚠️ Eso **no
 *    frena la facturación**: se le factura y se le cobra igual, porque el
 *    bloqueo es de la app y no del mostrador.
 */
function IdentidadDelClienteComponent({ cliente, estadoDeCuenta }: IdentidadDelClienteProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const contacto = [cliente.email, cliente.telefono ?? 'sin teléfono'].filter(Boolean).join(' · ');

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <View style={styles.identidad}>
          <Text variant="subtitle" weight="semibold" numberOfLines={2}>
            {cliente.nombre}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {cliente.dni ? `DNI ${formatearDni(cliente.dni)}` : 'Sin DNI cargado'}
          </Text>
        </View>

        <EstadoDeCuentaBadge estado={estadoDeCuenta} />
      </View>

      {contacto.length > 0 && (
        <Text variant="caption" color="textMuted" numberOfLines={2}>
          {contacto}
        </Text>
      )}

      {(sinFiado(cliente) || cuentaBloqueada(cliente)) && (
        <View style={styles.marcas}>
          {sinFiado(cliente) && <Chip label="No se le fía" tone="danger" />}
          {cuentaBloqueada(cliente) && <Chip label="Cuenta bloqueada" tone="warning" />}
        </View>
      )}

      {/* El motivo del corte, cuando está: es lo que decide si se hace una
          excepción o no. */}
      {sinFiado(cliente) && cliente.motivoSinFiado && (
        <Text variant="caption" color="error">
          {cliente.motivoSinFiado}
        </Text>
      )}

      {cuentaBloqueada(cliente) && (
        <Text variant="micro" color="textMuted">
          Le falta el DNI para usar la app. No frena la facturación: se le factura y se le cobra
          igual.
        </Text>
      )}
    </View>
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
    encabezado: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    /** `flex: 1` para que el badge quede pegado al borde derecho. */
    identidad: { flex: 1, gap: theme.spacing.xxs },
    marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  });

export const IdentidadDelCliente = memo(IdentidadDelClienteComponent);
