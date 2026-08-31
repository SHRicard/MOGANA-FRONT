import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Text, type TextColor } from '@/shared/ui/atoms/Text';
import { useTheme } from '@/theme';
import { createStyles } from './EstadoBadge.styles';
import type { EstadoBadgeProps, EstadoTono } from './EstadoBadge.types';

/** Qué token de texto contrasta con cada fondo. */
const LABEL_COLOR: Record<EstadoTono, TextColor> = {
  ok: 'onStatus',
  espera: 'onStatus',
  pronto: 'onStatus',
  tarde: 'onStatus',
  // El apagado va sobre un fondo neutro, así que el texto también se apaga.
  apagado: 'textMuted',
};

/**
 * Un estado como badge de color pleno.
 *
 * Es **el dato que se busca de un vistazo** cuando hay veinte renglones en
 * pantalla, así que va relleno y no apenas teñido: el color se tiene que
 * reconocer sin leer. El texto va igual —"Vencida", no solo rojo—: quien no
 * distingue rojo de naranja lo tiene que poder leer, y el lector de pantalla
 * también.
 *
 * Nació en la facturación del panel y subió acá cuando lo necesitó una segunda
 * feature —la vista del cliente sobre sus propias facturas— porque es
 * literalmente el mismo semáforo: *"es el mismo chip que ve el administrador,
 * así que los dos hablan de lo mismo cuando se llaman por teléfono"*
 * (`docs/user_cliente_flujo.md` §3).
 *
 * Sin lógica de negocio: no sabe qué es una factura ni una cuenta. Recibe el
 * texto ya escrito y el tono, y los mapas de estado → tono viven en cada
 * feature, que es lo que les deja usar sus propias palabras — el panel dice
 * "Por vencer" y el cliente "Vence pronto".
 */
function EstadoBadgeComponent({ label, tono }: EstadoBadgeProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.badge, styles[tono]]}>
      <Text variant="caption" weight="semibold" color={LABEL_COLOR[tono]}>
        {label}
      </Text>
    </View>
  );
}

export const EstadoBadge = memo(EstadoBadgeComponent);
