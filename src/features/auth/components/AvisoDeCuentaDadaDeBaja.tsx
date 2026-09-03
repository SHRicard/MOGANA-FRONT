import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import UserX from 'lucide-react-native/icons/user-x';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';

export interface AvisoDeCuentaDadaDeBajaProps {
  /** El texto del backend, ya redactado. `null` = no se dibuja nada. */
  mensaje: string | null;
}

const ICON_SIZE = 20;

/**
 * **Esta cuenta está dada de baja** (`docs/README_FRONT_BAJA_DE_CUENTA.md` §5).
 *
 * Ocupa el lugar de un cartel de error y no el de un toast a propósito: quien
 * ve esto no se equivocó de contraseña — su cuenta no existe más, y **volver a
 * intentar no va a andar nunca**. Un toast que se va solo lo dejaría probando de
 * nuevo.
 *
 * Los cuatro caminos por los que se puede llegar acá —el token viejo, el login
 * con contraseña, el de Google y el pedido de recuperación— contestan el mismo
 * texto, así que este cartel es uno solo y sirve para todos.
 *
 * ⚠️ El mensaje **lo escribe el backend** y termina en "escribinos para
 * resolverlo": es la salida, y probablemente sea lo que esa persona quiera
 * hacer —arreglar su deuda y volver—. Se muestra tal cual.
 */
function AvisoDeCuentaDadaDeBajaComponent({ mensaje }: AvisoDeCuentaDadaDeBajaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!mensaje) {
    return null;
  }

  return (
    <View
      style={styles.aviso}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.titulo}>
        <UserX size={ICON_SIZE} color={theme.colors.onWarningMuted} />
        <Text variant="body" weight="semibold" color="onWarningMuted">
          Esta cuenta está dada de baja
        </Text>
      </View>
      <Text variant="small">{mensaje}</Text>
      {/*
        Lo que el mensaje no dice y es la otra mitad de la salida: una vez saldada
        la deuda el correo queda libre y se puede volver a crear la cuenta como
        cualquiera.
      */}
      <Text variant="caption" color="textMuted">
        Si ya no queda nada pendiente, podés volver a registrarte con el mismo correo.
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /**
     * Ámbar y no rojo: no es un error de la persona ni algo que hizo mal. Es un
     * estado de la cuenta, y encima lo pidió ella misma.
     */
    aviso: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.warningMuted,
    },
    titulo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  });

export const AvisoDeCuentaDadaDeBaja = memo(AvisoDeCuentaDadaDeBajaComponent);
