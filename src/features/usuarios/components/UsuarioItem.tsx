import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/shared/ui/atoms/Button';
import { Chip } from '@/shared/ui/atoms/Chip';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import {
  esFacturable,
  estaDadaDeBaja,
  faltaDni,
  identificadorUsuario,
  nombreUsuario,
  rolLabel,
  sinFiado,
  type Usuario,
} from '../types';
import { AvatarIniciales } from './AvatarIniciales';

export interface UsuarioItemProps {
  usuario: Usuario;
  /**
   * Abrir la ficha de esta cuenta. Sin este callback la tarjeta es solo
   * informativa — es lo que decide si la fila tiene acción o no.
   */
  onVer?: (usuario: Usuario) => void;
  /**
   * `true` cuando **cualquier cuenta tiene ficha**, no solo los clientes.
   *
   * Es el caso del super admin: su listado trae los tres roles y todos abren la
   * ficha del panel del sistema (`docs/README_FRONT_SUPER_ADMIN.md` §5). Sin
   * esto, las filas de administración quedarían sin botón — que es lo correcto
   * para el administrador, porque para él `/admin/clientes/:id` contesta `404`.
   */
  todasConFicha?: boolean;
}

/**
 * Una fila del listado de clientes.
 *
 * Es **una línea por persona y nada más**: avatar, nombre y con qué se
 * identifica. Cómo entra y cuándo entró se leen en la ficha, no acá — en una
 * lista de veinte cuentas ese detalle no ayuda a encontrar a nadie y hace que
 * todas las filas se vean iguales.
 *
 * La acción es **entrar**, no ejecutar: el botón "Ver" abre la ficha, y ahí
 * adentro está lo que se le puede hacer a esa persona. Las cuentas que no son
 * clientes —que solo ve el super admin— no tienen ficha: la API contesta `404`
 * para cualquier id que no sea de un cliente, así que en su lugar se muestra el
 * rol y listo.
 */
function UsuarioItemComponent({ usuario, onVer, todasConFicha = false }: UsuarioItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Sin `displayName` el identificador hace de nombre (regla del doc): el email,
  // o el DNI si la cuenta se creó con documento y no tiene dirección. En ese caso
  // no se repite abajo: el mismo dato dos veces se lee como un error de la app.
  const identificador = identificadorUsuario(usuario);
  const nombre = nombreUsuario(usuario);
  const mostrarIdentificador = Boolean(identificador) && nombre !== identificador;

  // La fila conoce a su usuario; la pantalla, a dónde lleva el botón. El
  // callback se arma acá para que el padre no tenga que crear uno por fila.
  const ver = useCallback(() => onVer?.(usuario), [onVer, usuario]);
  const tieneFicha = onVer !== undefined && (todasConFicha || esFacturable(usuario));

  return (
    <View style={styles.card}>
      {/* Los datos son UNA unidad para el lector de pantalla: se leen de corrido
          en vez de como dos textos sueltos sin relación. El botón queda afuera
          del grupo para conservar su propio foco. */}
      <View style={styles.identidad} accessible>
        <AvatarIniciales nombre={nombre} />

        <View style={styles.textos}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {nombre}
          </Text>

          {mostrarIdentificador && (
            <Text variant="small" color="textMuted" numberOfLines={1}>
              {identificador}
            </Text>
          )}

          {/*
            Las dos marcas de la fila. Son distintas y se pueden dar juntas:
            ámbar es un dato que FALTA y alguien puede completar; rojo es una
            advertencia sobre la persona. En el listado alcanza con verlas; el
            detalle va en la ficha, que es donde se hace algo al respecto.
          */}
          {(faltaDni(usuario) || sinFiado(usuario) || estaDadaDeBaja(usuario)) && (
            <View style={styles.marcas}>
              {/*
                Va primera de las tres: es la que cambia qué se puede hacer con
                esta persona. Sigue en el listado porque hay algo que cobrarle,
                pero **ya no entra a la app** — quien la llame no puede decirle
                "fijate en la app" (`README_FRONT_BAJA_DE_CUENTA.md` §8).
              */}
              {estaDadaDeBaja(usuario) && <Chip label="Dada de baja" tone="danger" />}
              {faltaDni(usuario) && <Chip label="Falta el DNI" tone="warning" />}
              {sinFiado(usuario) && <Chip label="No se le fía" tone="danger" />}
            </View>
          )}
        </View>
      </View>

      {tieneFicha ? (
        <Button
          label="Ver"
          variant="secondary"
          size="sm"
          onPress={ver}
          // El nombre entra en el label del lector de pantalla: en una lista,
          // veinte botones que dicen todos "Ver" no se distinguen.
          accessibilityLabel={`Ver la ficha de ${nombre}`}
        />
      ) : (
        // La API manda el slug (`super_admin`): el texto lo pone `rolLabel`.
        <Chip label={rolLabel(usuario.rol)} tone="brand" />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /** Los chips no se estiran al ancho de la fila: miden lo que su texto. */
    marcas: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },

    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    /** `flex: 1` para que un nombre largo se corte y no empuje al botón. */
    identidad: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    textos: { flex: 1, gap: theme.spacing.xxs },
  });

export const UsuarioItem = memo(UsuarioItemComponent);
