import { memo } from 'react';
import { TarjetaFilas, type FilaDeDatos } from './TarjetaFilas';
import {
  comoPagaDe,
  formatDias,
  FormasDePagar,
  textoAtrasoActual,
  textoComoPaga,
  textoDemora,
  type CumplimientoDelCliente,
  type FacturasDelCliente,
} from '../types';

export interface LasDemorasProps {
  datos: CumplimientoDelCliente;
  /**
   * Sus facturas. **El bloque no se puede escribir sin ellas**: qué clase de
   * pagador es sale de `comoPaga`, y el respaldo para cuando ese campo todavía
   * no llega se arma con estos contadores.
   */
  facturas: FacturasDelCliente;
}

/**
 * Cuánto tarda: **el atraso de hoy y el historial**, que son cosas distintas.
 *
 * Arriba va lo que está pasando ahora —hace cuántos días que tiene una factura
 * colgada—, porque es lo único accionable. Abajo, cómo viene pagando lo que ya
 * saldó: cuando se atrasa cuánto se atrasa (el número del mostrador: *"sí,
 * paga, pero ¿cuánto tengo que esperar?"*), el peor caso y el promedio general.
 *
 * ⚠️ **Un `null` en las demoras no es "siempre en fecha".** Al que nunca pagó
 * nada le faltan los mismos promedios que al cliente impecable, así que el texto
 * **no se deduce de los `null`**: sale de `comoPaga`, que lo resuelve el
 * backend. Sin pagos, acá no se muestran promedios: se dice que todavía no pagó
 * ninguna.
 *
 * ⚠️ El promedio general **mezcla las adelantadas con las atrasadas**: alguien
 * que paga cinco días antes y cinco después da cero, y ese cero no dice nada.
 * Por eso va último y con la aclaración al pie.
 */
function LasDemorasComponent({ datos, facturas }: LasDemorasProps) {
  const forma = comoPagaDe(datos, facturas);
  const seAtrasa = forma === FormasDePagar.SE_ATRASA;
  const atraso = textoAtrasoActual(datos.atrasoActual);

  const filas: FilaDeDatos[] = [];

  // El presente primero, y en rojo: es lo que hay que ir a cobrar hoy. Convive
  // con un historial impecable sin contradecirlo.
  if (atraso) {
    filas.push({
      etiqueta: 'Atrasado ahora',
      valor: formatDias(datos.atrasoActual ?? null),
      detalle: 'Su factura impaga más vieja',
      tono: 'statusLate',
    });
  }

  if (seAtrasa) {
    filas.push(
      {
        etiqueta: 'Cuando se atrasa',
        // Solo en esta rama `demoraCuandoSeAtrasa` es un número seguro.
        valor: formatDias(datos.demoraCuandoSeAtrasa ?? null),
        detalle: 'Promedio de las que pagó tarde',
      },
      {
        etiqueta: 'Peor caso',
        valor: formatDias(datos.demoraMaxima ?? null),
      },
    );
  } else {
    // Una sola línea en vez de tres rayas: lo que hay que decir es qué clase de
    // pagador es, no que falten números.
    filas.push({
      etiqueta: 'Historial de pagos',
      valor: textoComoPaga(datos, facturas),
      detalle:
        forma === FormasDePagar.SIEMPRE_EN_FECHA
          ? 'De lo que pagó, nada llegó tarde'
          : 'No hay atrasos que promediar',
      tono: forma === FormasDePagar.SIEMPRE_EN_FECHA ? 'success' : undefined,
    });
  }

  // El promedio general solo tiene sentido si pagó algo: si no, es otra raya.
  if (datos.demoraPromedio != null) {
    filas.push({
      etiqueta: 'Promedio general',
      // `textoDemora` mantiene el signo en palabras: un `-5` es "5 días antes",
      // que es el cliente que hay que cuidar y no uno con demora negativa.
      valor: textoDemora(datos.demoraPromedio),
      detalle: 'Sobre todas las que pagó',
    });
  }

  return (
    <TarjetaFilas
      titulo="Cuánto tarda"
      filas={filas}
      nota={
        datos.demoraPromedio == null
          ? undefined
          : 'El promedio general mezcla las que pagó antes con las que pagó tarde: cinco antes y cinco después dan cero, y ese cero no dice nada.'
      }
    />
  );
}

export const LasDemoras = memo(LasDemorasComponent);
