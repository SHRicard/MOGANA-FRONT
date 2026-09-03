import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import { Button } from '@/shared/ui/atoms/Button';
import { Text } from '@/shared/ui/atoms/Text';
import { formatBytes } from '@/shared/utils';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import {
  SEMAFORO_DEL_STORE_LABEL,
  SemaforosDelStore,
  semaforoDelStore,
  type SemaforoDelStore,
  type StoreDelSistema,
} from '../types';
import { Dato } from './Dato';
import { Tarjeta } from './Tarjeta';

export interface TarjetaDelStoreProps {
  /** ⚠️ `null` = no se pudo medir. La tarjeta se dibuja igual, diciéndolo. */
  store: StoreDelSistema | null | undefined;
  /** Abre el panel del store, que es donde se libera de verdad. */
  onVerElStore: () => void;
}

const ICON_SIZE = 16;
/** Alto de la barra. Gruesa: es lo único de la tarjeta que se entiende sin leer. */
const ALTO_BARRA = 10;

/**
 * El color de cada estado.
 *
 * ⚠️ **`sin_medir` no es verde.** No es "está bien": es que no hay contra qué
 * medirlo, y pintarlo del color de "todo en orden" sería afirmar algo que nadie
 * sabe.
 */
const COLOR_DEL_SEMAFORO: Record<SemaforoDelStore, keyof ThemeColors> = {
  critico: 'statusLate',
  alto: 'statusSoon',
  holgado: 'statusOk',
  sin_medir: 'textMuted',
};

/**
 * **Cuánto del store está usado** (§3).
 *
 * ⚠️ El semáforo lo decide `nivel`, que viene del servidor, y **nunca el
 * porcentaje**: los umbrales son configurables del otro lado
 * (`STORE_UMBRAL_ALTO`, `STORE_UMBRAL_CRITICO`) y si el front los repitiera, el
 * día que se muevan la pantalla diría "todo bien" mientras salen los avisos.
 *
 * ⚠️ Por eso tampoco es la `BarraDeUso` del panel del store: aquella calcula el
 * color a partir del porcentaje, que es exactamente lo que acá no hay que hacer.
 * Es la misma forma con otra regla adentro, no el mismo componente.
 *
 * Los números de esta tarjeta son un resumen: liberar se libera en el panel del
 * store, y por eso la tarjeta termina en el botón que lleva ahí en vez de
 * repetir sus acciones.
 */
function TarjetaDelStoreComponent({ store, onVerElStore }: TarjetaDelStoreProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!store) {
    /*
      Sin store, la tarjeta se queda: el super admin entró justamente a ver si
      el sistema está bien, y una pantalla en blanco porque un tercero está
      lento es lo peor que se le puede dar.
    */
    return (
      <Tarjeta titulo="Comprobantes guardados">
        <View style={styles.conIcono} accessible>
          <CloudOff size={ICON_SIZE} color={theme.colors.textMuted} />
          <View style={styles.textoDelIcono}>
            <Text variant="small" weight="medium">
              No se pudo medir
            </Text>
            <Text variant="caption" color="textMuted">
              O el store no está configurado, o no contestó. El resto del tablero sigue siendo
              exacto.
            </Text>
          </View>
        </View>
      </Tarjeta>
    );
  }

  const semaforo = semaforoDelStore(store);
  const color = COLOR_DEL_SEMAFORO[semaforo];
  const sinMedir = semaforo === SemaforosDelStore.SIN_MEDIR || store.porcentajeUsado == null;
  // Recortado a 0–100: un porcentaje pasado del límite no puede pintar fuera del
  // riel.
  const usado = Math.min(100, Math.max(0, store.porcentajeUsado ?? 0));

  return (
    <Tarjeta titulo="Comprobantes guardados">
      <View style={styles.encabezadoBarra}>
        <Text variant="small" weight="medium">
          {sinMedir ? 'Sin porcentaje' : `${Math.round(usado)}% usado`}
        </Text>
        {/* El color no es lo único que lo dice: el texto va al lado porque un
            rojo y un verde son el mismo gris para bastante gente. */}
        <Text variant="caption" color={color} weight="medium">
          {SEMAFORO_DEL_STORE_LABEL[semaforo]}
        </Text>
      </View>

      <View
        style={styles.riel}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Cuánto del store está usado"
        accessibilityValue={
          sinMedir
            ? { text: 'No se pudo medir.' }
            : {
                min: 0,
                max: 100,
                now: Math.round(usado),
                text: `${Math.round(usado)}%. ${SEMAFORO_DEL_STORE_LABEL[semaforo]}.`,
              }
        }
      >
        {/* Sin porcentaje no se dibuja relleno: un riel vacío dice "no sé", y una
            barra en cero diría "está vacío", que es otra cosa. */}
        {!sinMedir && usado > 0 ? (
          <View
            style={[
              styles.relleno,
              { width: `${usado}%`, backgroundColor: theme.colors[color] },
            ]}
          />
        ) : null}
      </View>

      {sinMedir ? (
        <Text variant="caption" color="textMuted">
          No hay contra qué medirlo: falta la cuota del store o el límite configurado. Lo de abajo
          sale de la base y es exacto igual.
        </Text>
      ) : null}

      {/* Estos dos salen de la base, así que son exactos siempre, con o sin
          porcentaje. */}
      <Dato
        etiqueta="Ocupado"
        valor={`${formatBytes(store.bytes)} · ${store.comprobantes} archivos`}
      />
      <Dato
        etiqueta="Se puede liberar"
        valor={`${formatBytes(store.bytesLiberables)} · ${store.liberables} archivos`}
      />

      <Button
        label="Ver el panel del store"
        variant="secondary"
        onPress={onVerElStore}
        accessibilityLabel="Abrir el panel de comprobantes guardados"
        fullWidth
      />
    </Tarjeta>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    encabezadoBarra: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },

    /** El riel vacío: lo que falta por usar es lugar disponible, no un hueco. */
    riel: {
      height: ALTO_BARRA,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.full,
      overflow: 'hidden',
    },
    relleno: { height: ALTO_BARRA, borderRadius: theme.radius.full },

    conIcono: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al ícono. */
    textoDelIcono: { flex: 1, gap: theme.spacing.xxs },
  });

export const TarjetaDelStore = memo(TarjetaDelStoreComponent);
