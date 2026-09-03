import { memo, useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import ImageOff from 'lucide-react-native/icons/image-off';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { Button } from '@/shared/ui/atoms/Button';
import { Checkbox } from '@/shared/ui/atoms/Checkbox';
import { EstadoBadge, type EstadoTono } from '@/shared/ui/atoms/EstadoBadge';
import { Text } from '@/shared/ui/atoms/Text';
import { formatBytes, formatFechaHora, formatMonto } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import {
  ESTADO_DE_AVISO_LABEL,
  estaBorrado,
  sePuedeBorrar,
  type ComprobanteEnElStore,
  type EstadoDeAviso,
} from '../types';

export interface ComprobanteDelStoreItemProps {
  comprobante: ComprobanteEnElStore;
  onVer: (url: string) => void;
  onBorrar: (comprobante: ComprobanteEnElStore) => void;
  deshabilitado: boolean;
  /** Si está tildado para el borrado en lote. */
  tildado: boolean;
  onTildar: (comprobante: ComprobanteEnElStore) => void;
  /**
   * `true` cuando ya hay 100 tildados: el tope del backend. La casilla de los
   * que **no** están tildados se apaga, pero la de los que sí sigue andando —si
   * no, no habría forma de destildar para hacer lugar.
   */
  seleccionLlena: boolean;
}

const ICON_SIZE = 16;
/** Lado de la miniatura. Cuadrada: acá se reconoce, no se lee. */
const MINIATURA = 64;

const TONO: Record<EstadoDeAviso, EstadoTono> = {
  pendiente: 'espera',
  confirmado: 'ok',
  rechazado: 'tarde',
};

/**
 * Un archivo del store, en la lista para revisar antes de tirar.
 *
 * Es una fila compacta y no una tarjeta como en la bandeja, y la diferencia es
 * de propósito: en la bandeja se **decide sobre un pago** —y ahí hace falta ver
 * el comprobante—; acá se decide **qué archivos tirar**, y lo que importa es de
 * cuándo son y cuánto pesan. La imagen está a un toque igual.
 *
 * ⚠️ **Un comprobante de un aviso pendiente no se puede borrar**, y por eso ni
 * aparece el botón: su imagen es la única evidencia con la que todavía hay que
 * decidir. Si el cliente subió algo que no corresponde, el camino es **rechazar
 * el aviso** —que borra la imagen y de paso le explica por qué—.
 */
function ComprobanteDelStoreItemComponent({
  comprobante,
  onVer,
  onBorrar,
  deshabilitado,
  tildado,
  onTildar,
  seleccionLlena,
}: ComprobanteDelStoreItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [vencida, setVencida] = useState(false);

  const grande = comprobante.url ?? null;
  const miniatura = comprobante.miniatura ?? comprobante.url ?? null;
  const borrado = estaBorrado(comprobante);

  const ver = useCallback(() => {
    if (grande) {
      onVer(grande);
    }
  }, [onVer, grande]);

  const borrar = useCallback(() => onBorrar(comprobante), [onBorrar, comprobante]);
  const tildar = useCallback(() => onTildar(comprobante), [onTildar, comprobante]);

  const sePuede = sePuedeBorrar(comprobante);

  return (
    <View style={styles.fila}>
      <View style={styles.arriba}>
        {/*
          La casilla solo en los que se pueden borrar. En un pendiente no se
          dibuja apagada sino que no está: una casilla que no se puede tocar
          invita a intentarlo, y el motivo se explica abajo con todas las letras.
        */}
        {sePuede ? (
          <Checkbox
            checked={tildado}
            onChange={tildar}
            disabled={deshabilitado || (seleccionLlena && !tildado)}
            accessibilityLabel={`Tildar el comprobante de la factura ${comprobante.facturaNumero}`}
          />
        ) : null}

        <Pressable
          onPress={ver}
          disabled={!grande}
          style={styles.marco}
          accessibilityRole={grande ? 'imagebutton' : 'image'}
          accessibilityLabel={
            grande ? 'Ver el comprobante en grande' : 'Este comprobante ya no está'
          }
        >
          {miniatura && !vencida ? (
            <Image
              source={{ uri: miniatura }}
              style={styles.imagen}
              resizeMode="cover"
              onError={() => setVencida(true)}
            />
          ) : (
            <View style={styles.sinImagen}>
              <ImageOff size={ICON_SIZE} color={theme.colors.textMuted} />
            </View>
          )}
        </Pressable>

        <View style={styles.datos}>
          <View style={styles.linea}>
            <Text variant="small" weight="semibold" numberOfLines={1}>
              {`#${comprobante.facturaNumero} · ${comprobante.cliente.displayName ?? 'Sin nombre'}`}
            </Text>
            <EstadoBadge
              label={ESTADO_DE_AVISO_LABEL[comprobante.estadoDelAviso]}
              tono={TONO[comprobante.estadoDelAviso]}
            />
          </View>

          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {`${formatMonto(comprobante.monto)} · avisado el ${formatFechaHora(
              comprobante.informadoEn,
            )}`}
          </Text>
          <Text variant="caption" color="textMuted">
            {borrado
              ? `Ya liberado · ocupaba ${formatBytes(comprobante.bytes)}`
              : `${formatBytes(comprobante.bytes)} · ${comprobante.formato.toUpperCase()}`}
          </Text>
        </View>
      </View>

      {sePuede ? (
        <Button
          label="Borrar este"
          variant="secondary"
          size="sm"
          leftIcon={<Trash2 size={ICON_SIZE} color={theme.colors.primary} />}
          onPress={borrar}
          disabled={deshabilitado}
          fullWidth
          accessibilityLabel={`Borrar el comprobante de la factura ${comprobante.facturaNumero}`}
        />
      ) : !borrado ? (
        /*
          Pendiente: no se ofrece el botón, y se dice por qué. Sin el texto, la
          fila se ve como una a la que se le olvidó el botón.
        */
        <Text variant="caption" color="textMuted">
          Sin resolver: su comprobante es con lo que hay que decidir. Para sacarlo, rechazá el
          aviso.
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    arriba: { flexDirection: 'row', gap: theme.spacing.sm },

    marco: {
      width: MINIATURA,
      height: MINIATURA,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    imagen: { width: '100%', height: '100%' },
    sinImagen: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    /** `flex: 1` para que el texto se corte antes de empujar la miniatura. */
    datos: { flex: 1, gap: theme.spacing.xxs },
    linea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.xs,
    },
  });

export const ComprobanteDelStoreItem = memo(ComprobanteDelStoreItemComponent);
