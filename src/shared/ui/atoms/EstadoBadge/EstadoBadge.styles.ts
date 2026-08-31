import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      // `flex-start` para que no se estire al ancho de la fila: un badge mide lo
      // que mide su texto.
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.radius.full,
    },

    // ── Tonos ──
    // La escala de urgencia va rellena: el color se tiene que reconocer sin
    // leer, con veinte renglones en pantalla.
    ok: { backgroundColor: theme.colors.statusOk },
    espera: { backgroundColor: theme.colors.statusWait },
    pronto: { backgroundColor: theme.colors.statusSoon },
    tarde: { backgroundColor: theme.colors.statusLate },

    /**
     * El apagado es el único que NO se rellena: no es un punto de la escala
     * —una factura dada de baja no hay que cobrarla ni vence—, y pintarlo de un
     * color pleno lo pondría a competir con las que sí hay que atender.
     */
    apagado: {
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
  });
