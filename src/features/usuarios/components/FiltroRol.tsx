import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip } from '@/shared/ui/atoms/Chip';
import { useTheme, type Theme } from '@/theme';
import { Roles, type Rol } from '@/features/auth';
import { ROL_LABEL } from '../types';

export interface FiltroRolProps {
  /** `null` = todos los roles. */
  rol: Rol | null;
  onChange: (rol: Rol | null) => void;
}

interface Opcion {
  /** `null` es la opción "Todos": la API sin `rol` devuelve todo. */
  value: Rol | null;
  label: string;
}

/**
 * Se arma una sola vez, a nivel de módulo: es una lista fija y recalcularla en
 * cada tecla del buscador (este filtro vive en el header de la lista) no aporta.
 */
const OPCIONES: readonly Opcion[] = [
  { value: null, label: 'Todos' },
  ...Object.values(Roles).map((value) => ({ value, label: ROL_LABEL[value] })),
];

/** Filtro por rol. Elegir uno vuelve siempre a la página 1 (lo hace el hook). */
function FiltroRolComponent({ rol, onChange }: FiltroRolProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    // `wrap` y no un scroll horizontal: son cuatro opciones fijas y un scroll
    // adentro del header de la lista esconde las que no entran.
    <View style={styles.container}>
      {OPCIONES.map(({ value, label }) => (
        <Chip
          key={label}
          label={label}
          selected={rol === value}
          onPress={() => onChange(value)}
          accessibilityLabel={`Filtrar por ${label}`}
        />
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
  });

export const FiltroRol = memo(FiltroRolComponent);
