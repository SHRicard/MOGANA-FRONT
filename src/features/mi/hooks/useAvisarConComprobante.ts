import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ComprobanteCompartido } from '@/services/share';
import { storageService, StorageKeys } from '@/services/storage';
import { useAppDispatch } from '@/store';
import { formatMonto, getApiErrorMessage, getApiErrorStatus, hoyPantalla } from '@/shared/utils';
import {
  useInformarPagoMutation,
  useListarMisAvisosQuery,
  useListarMisFacturasQuery,
} from '../api';
import { comprobanteConsumido } from '../store';
import {
  aInformarPagoPayload,
  AVISOS_SIN_RESOLVER,
  crearInformarPagoSchema,
  FACTURAS_PARA_COMPROBANTE,
  MediosDePago,
  medioDePagoSchema,
  yaInformadoDe,
  type InformarPagoFormValues,
  type MedioDePago,
  type MiAvisoDePago,
  type MiFacturaDeLaLista,
} from '../types';

/**
 * El `503` es el **único** error que se reintenta
 * (`docs/compartir_comprobante.md` §6).
 *
 * Y se puede reintentar por un motivo concreto: si la imagen no se pudo guardar,
 * el backend borra el aviso antes de contestar, así que mandarlo de nuevo no
 * duplica nada. Los demás son de corregir, no de reintentar: repetir un `400` de
 * "supera el saldo" da otro `400` idéntico.
 */
const REINTENTABLE = 503;

/** Todo lo que necesita `ElegirFacturaScreen` para dibujarse. */
export interface AvisoConComprobante {
  // ── Las facturas candidatas ──
  /** Solo las impagas, **lo que vence primero arriba**. */
  facturas: readonly MiFacturaDeLaLista[];
  /** `true` si no hay ninguna impaga: no hay nada que elegir (§5.3). */
  sinImpagas: boolean;
  /**
   * `true` si hay **una sola**. La pantalla la muestra ya elegida y saltea el
   * selector: es el caso más común y ahorra un paso.
   */
  unicaFactura: boolean;
  facturaId: string | null;
  facturaElegida: MiFacturaDeLaLista | undefined;
  elegirFactura: (facturaId: string) => void;
  /**
   * Las que **ya tienen un aviso esperando**. Se marcan en el selector para que
   * ni se llegue a intentar: el backend cuenta los avisos pendientes contra el
   * saldo y contesta un `400` (§5.4).
   */
  yaAvisadas: ReadonlySet<string>;

  // ── Los topes de la elegida ──
  /** Lo ya avisado de esta factura y sin resolver. */
  yaInformado: number;
  /** `saldo − yaInformado`: el monto que viene precargado, y el tope. */
  maximo: number;

  // ── El formulario ──
  control: Control<InformarPagoFormValues>;
  enviar: () => void;
  enviando: boolean;
  /** El aviso creado por el `201`, o `undefined` si todavía no se mandó. */
  avisado: MiAvisoDePago | undefined;
  /** El `message` del backend, **ya redactado**: va tal cual al cartel. */
  mensajeError: string | null;
  /** `true` solo con el `503`, que es el único que se arregla mandando de nuevo. */
  sePuedeReintentar: boolean;
  /** Tirar el comprobante: se sale sin mandarlo. */
  descartar: () => void;

  // ── Estados de la lista ──
  isLoading: boolean;
  mensajeErrorLista: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/** El medio que se usó la vez pasada, o transferencia, que es el 90% (§3.4). */
function ultimoMedio(): MedioDePago {
  const guardado = storageService.getString(StorageKeys.ULTIMO_MEDIO_DE_PAGO);
  const parsed = medioDePagoSchema.safeParse(guardado);
  return parsed.success ? parsed.data : MediosDePago.TRANSFERENCIA;
}

/**
 * **Avisar un pago con el comprobante que llegó por la hoja de compartir**
 * (`docs/compartir_comprobante.md`).
 *
 * Es el mismo aviso de siempre —el mismo endpoint, las mismas reglas, la misma
 * advertencia de que la deuda no baja— entrado al revés. Por el formulario de
 * adentro de la app se elige la factura y después se adjunta; por acá el cliente
 * **llega con la imagen en la mano y le falta todo lo demás**, así que el orden
 * de la pantalla es: mostrarle que llegó bien, preguntar de qué factura es, y
 * recién ahí los datos del pago.
 *
 * Lo que este hook resuelve y el de adentro no:
 *
 * - **la factura no viene dada**: hay que traer las impagas y elegir una, y con
 *   los topes recalculándose con la elegida;
 * - **el medio tampoco viene**: Android manda la imagen, no de dónde salió. Se
 *   propone el último que se usó;
 * - **el `503` se reintenta solo una vez** antes de mostrar nada: es el único
 *   error del que se sabe que no quedó nada escrito.
 *
 * ⚠️ **El pendiente se borra recién con el `201`**, nunca antes (§7). Borrarlo
 * al abrir la pantalla dejaría al cliente sin nada si el envío falla, y ahí hay
 * que volver a Mercado Pago y compartir otra vez.
 */
export function useAvisarConComprobante(comprobante: ComprobanteCompartido): AvisoConComprobante {
  const dispatch = useAppDispatch();

  const lista = useListarMisFacturasQuery(FACTURAS_PARA_COMPROBANTE);
  const avisos = useListarMisAvisosQuery(AVISOS_SIN_RESOLVER);

  /**
   * Lo que vence primero, primero — que deja las vencidas arriba (§3).
   *
   * Es el orden con más chances de acertar: lo que ya venció es lo que
   * probablemente acaba de pagar. Las fechas de API son `AAAA-MM-DD`, así que se
   * comparan como texto: el orden alfabético es el cronológico.
   */
  const facturas = useMemo(() => {
    const datos = lista.data?.datos ?? [];
    return [...datos].sort((a, b) => a.fechaFin.localeCompare(b.fechaFin));
  }, [lista.data]);

  const yaAvisadas = useMemo(
    () => new Set((avisos.data?.datos ?? []).map((aviso) => aviso.factura.id)),
    [avisos.data],
  );

  const [facturaId, setFacturaId] = useState<string | null>(null);

  /**
   * Con **una sola** impaga no hay nada que elegir: se deja elegida y la pantalla
   * saltea el selector (§3). Se hace en un efecto y no al pedir los datos porque
   * la lista llega después del primer render.
   */
  useEffect(() => {
    if (facturaId === null && facturas.length === 1) {
      setFacturaId(facturas[0].id);
    }
  }, [facturas, facturaId]);

  const facturaElegida = useMemo(
    () => facturas.find((factura) => factura.id === facturaId),
    [facturas, facturaId],
  );

  const yaInformado = facturaId ? yaInformadoDe(avisos.data?.datos ?? [], facturaId) : 0;
  // `Math.max` para que un backend que ya tomó el aviso no deje un negativo en
  // pantalla mientras la lista de avisos todavía es la vieja.
  const maximo = Math.max(0, (facturaElegida?.saldo ?? 0) - yaInformado);

  /**
   * El schema depende de la factura elegida —el máximo y el día de emisión son
   * suyos—, así que se rehace cada vez que se cambia de factura.
   */
  const fechaEmision = facturaElegida?.fechaEmision ?? '1900-01-01';
  const resolver = useMemo(
    () => zodResolver(crearInformarPagoSchema(maximo, fechaEmision)),
    [maximo, fechaEmision],
  );

  const { control, handleSubmit, reset } = useForm<InformarPagoFormValues>({
    resolver,
    defaultValues: {
      monto: '',
      medio: ultimoMedio(),
      fecha: hoyPantalla(),
      referencia: '',
      nota: '',
    },
    mode: 'onBlur',
  });

  /**
   * **El monto se precarga con el saldo de la factura elegida** (§3.3), que es
   * el caso normal: se paga la factura entera. Queda editable porque se puede
   * haber pagado una parte.
   *
   * Va en un efecto y no en los `defaultValues` porque acá la factura se elige
   * **después** de montar el formulario: los `defaultValues` de React Hook Form
   * se leen una sola vez, así que el campo nacería vacío y se quedaría así.
   *
   * `keepDirtyValues` para no pisar lo que la persona ya escribió si vuelve a
   * tocar el selector — el monto que escribió a mano vale más que el que
   * proponemos. Un `reset` deja los campos como no tocados, así que solo se
   * conserva lo que se escribió **a mano** después.
   *
   * Depende también del `maximo`, y no solo de la factura: los avisos sin
   * resolver llegan en su propia request, casi siempre **después** de la lista
   * de facturas. Sin eso, una factura con un aviso esperando nacería con el
   * saldo entero propuesto y el formulario se rechazaría a sí mismo por pasarse
   * de un tope que la persona nunca eligió.
   */
  useEffect(() => {
    if (!facturaElegida) {
      return;
    }
    reset(
      {
        // Sin símbolo: es el contenido de un input, no un importe para leer.
        monto: formatMonto(maximo, { conSimbolo: false }),
        medio: ultimoMedio(),
        fecha: hoyPantalla(),
        referencia: '',
        nota: '',
      },
      { keepDirtyValues: true },
    );
  }, [facturaElegida, maximo, reset]);

  const [informar, { data, isLoading, error, reset: resetMutation }] = useInformarPagoMutation();

  /** El `503` ya se reintentó una vez por este envío: no se reintenta en loop. */
  const yaReintentado = useRef(false);

  const mandar = useCallback(
    async (valores: InformarPagoFormValues, id: string) => {
      const resultado = await informar(aInformarPagoPayload(id, valores, comprobante));

      if (
        'error' in resultado &&
        getApiErrorStatus(resultado.error) === REINTENTABLE &&
        !yaReintentado.current
      ) {
        // El store no respondió y el backend borró el aviso antes de contestar,
        // así que mandarlo de nuevo no duplica nada (§6).
        yaReintentado.current = true;
        return informar(aInformarPagoPayload(id, valores, comprobante));
      }

      return resultado;
    },
    [informar, comprobante],
  );

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        if (!facturaId) {
          return;
        }
        // Un intento nuevo tiene que empezar sin el cartel del anterior, y con
        // su propio permiso de reintentar el 503.
        resetMutation();
        yaReintentado.current = false;

        const resultado = await mandar(valores, facturaId);

        if ('data' in resultado && resultado.data) {
          storageService.setString(StorageKeys.ULTIMO_MEDIO_DE_PAGO, valores.medio);
          // ⚠️ Recién acá, con el 201 en la mano (§7). Antes de esto, un envío
          // fallido dejaría al cliente sin imagen y sin nada que reintentar.
          dispatch(comprobanteConsumido());
        }
      }),
    [handleSubmit, mandar, facturaId, resetMutation, dispatch],
  );

  const enviarSeguro = useCallback(() => {
    // `handleSubmit` devuelve una promesa que ya no rechaza (RHF atrapa el error
    // del submit). Se descarta a propósito: el `onPress` de un botón no espera
    // nada, y devolverla haría que React avise de una promesa colgada.
    enviar().catch(() => {});
  }, [enviar]);

  const elegirFactura = useCallback((destino: string) => setFacturaId(destino), []);

  const descartar = useCallback(() => {
    dispatch(comprobanteConsumido());
  }, [dispatch]);

  const reintentar = useCallback(() => {
    lista.refetch();
    avisos.refetch();
  }, [lista, avisos]);

  /** Igual que `reintentar`, pero esperable: la rueda del gesto necesita saber
   *  cuándo terminó para poder bajar. */
  const refrescar = useCallback(async () => {
    await Promise.all([lista.refetch(), avisos.refetch()]);
  }, [lista, avisos]);

  return {
    facturas,
    sinImpagas: !lista.isLoading && lista.error === undefined && facturas.length === 0,
    unicaFactura: facturas.length === 1,
    facturaId,
    facturaElegida,
    elegirFactura,
    yaAvisadas,

    yaInformado,
    maximo,

    control,
    enviar: enviarSeguro,
    enviando: isLoading,
    avisado: data,
    // Los errores del backend llegan con el texto listo: van tal cual al cartel,
    // sin traducir ni reescribir (§6).
    mensajeError: getApiErrorMessage(error),
    sePuedeReintentar: getApiErrorStatus(error) === REINTENTABLE,
    descartar,

    isLoading: lista.isLoading,
    // El de las facturas manda: sin la lista no hay a qué factura imputar el
    // comprobante, y que fallen los avisos solo esconde una marca del selector.
    mensajeErrorLista: getApiErrorMessage(lista.error),
    reintentar,
    refrescar,
  };
}
