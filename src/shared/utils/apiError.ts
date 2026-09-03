import { z } from 'zod';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { SerializedError } from '@reduxjs/toolkit';

/**
 * Lectura de los errores de la API.
 *
 * La API contesta siempre con la misma forma, y es una sola cosa
 * (`docs/flujo_pagos.md`, `docs/s.roles.md`):
 *
 * ```json
 * { "message": "El período termina antes de empezar: revisá las fechas." }
 * ```
 *
 * `message` es un **string plano ya redactado para la persona**: se muestra tal
 * cual, sin traducirlo ni mapearlo. No hay códigos de error: lo que decide la
 * reacción de la app es el **status** (un `403` esconde un apartado, un `404`
 * manda a volver atrás), y para eso está `getApiErrorStatus`.
 */

/**
 * Lo que puede llegar como error desde RTK Query, en cualquiera de sus dos
 * formas. Se exporta porque el `catch` de un `unwrap()` llega tipado como
 * `unknown`, y sin este tipo cada llamador tendría que castear a mano.
 */
export type ApiError = FetchBaseQueryError | SerializedError | undefined;

const DEFAULT_MESSAGE = 'Algo salió mal. Intentá de nuevo.';

function isFetchBaseQueryError(error: NonNullable<ApiError>): error is FetchBaseQueryError {
  return 'status' in error;
}

/**
 * Body de error. `message` es opcional a propósito: un 500 del proxy o un HTML
 * de nginx también caen acá, y leer un error nunca puede tirar una excepción.
 */
const errorBodySchema = z.object({
  message: z.string().optional(),
});

/**
 * El status HTTP del error, o `null` si el fallo no llegó a tener uno (un
 * `FETCH_ERROR` sin red, un error de JS).
 *
 * Es lo que decide la reacción cuando no alcanza con mostrar el texto: el `403`
 * que esconde un apartado entero, o el `404` que significa "ese id no es de un
 * cliente" y obliga a volver al listado.
 */
export function getApiErrorStatus(error: ApiError): number | null {
  if (!error || !isFetchBaseQueryError(error) || typeof error.status !== 'number') {
    return null;
  }
  return error.status;
}

/**
 * `true` si este `403` es el del **perfil incompleto** y no el de permisos
 * (`docs/flujo_login.md`).
 *
 * Son dos cosas distintas con el mismo status y hay que separarlas: el de
 * permisos es una pantalla de error —la app mostró algo que no correspondía—, y
 * este significa que a la persona le falta cargar el DNI, así que la reacción es
 * volver a pedir la sesión y mandarla al cartel.
 *
 * ⚠️ **Se distinguen por el texto**, que es lo único que da el contrato:
 *
 * ```json
 * 403 { "message": "Para usar la app necesitás cargar tu DNI en tu perfil." }
 * ```
 *
 * Es frágil por definición —si el backend reescribe ese mensaje, esto deja de
 * reconocerlo— y por eso es una **red y no el camino principal**: lo normal es
 * que el `estado` de la sesión ya tenga a la persona en el cartel antes de que
 * salga ninguna request. Si algún día el contrato suma un código de error, se
 * cambia esta función y nada más.
 */
export function esErrorDePerfilIncompleto(error: ApiError): boolean {
  if (getApiErrorStatus(error) !== 403) {
    return false;
  }

  const parsed =
    error && isFetchBaseQueryError(error) && 'data' in error
      ? errorBodySchema.safeParse(error.data)
      : null;

  return parsed?.success ? parsed.data.message?.toUpperCase().includes('DNI') ?? false : false;
}

/**
 * `true` si este `401` es el de una **cuenta dada de baja**
 * (`docs/README_FRONT_BAJA_DE_CUENTA.md` §5).
 *
 * Son cuatro caminos por los que alguien puede intentar volver a entrar —el
 * token viejo, el login con contraseña, el de Google y el pedido de
 * recuperación— y **los cuatro contestan el mismo texto**:
 *
 * ```json
 * 401 { "message": "Esta cuenta está dada de baja. Si tenías algo pendiente, escribinos para resolverlo." }
 * ```
 *
 * Hay que separarlo del `401` de siempre —*"tu sesión expiró, volvé a iniciar
 * sesión"*— porque la reacción es la contraria: volver a iniciar sesión no va a
 * andar nunca, y quien lee ese mensaje probablemente quiera arreglar su deuda y
 * volver. Merece una pantalla con una salida, no el cartel de sesión vencida.
 *
 * ⚠️ **Se distingue por el texto**, que es lo único que da el contrato, igual que
 * `esErrorDePerfilIncompleto`. Si el backend reescribe ese mensaje, esto deja de
 * reconocerlo y la persona ve el `401` genérico: se degrada a lo de antes, no se
 * rompe. El día que el contrato sume un código de error, se cambia acá y nada
 * más.
 */
export function esCuentaDadaDeBaja(error: ApiError): boolean {
  if (getApiErrorStatus(error) !== 401) {
    return false;
  }

  const parsed =
    error && isFetchBaseQueryError(error) && 'data' in error
      ? errorBodySchema.safeParse(error.data)
      : null;

  return parsed?.success
    ? parsed.data.message?.toLocaleLowerCase().includes('dada de baja') ?? false
    : false;
}

/**
 * Convierte el error de RTK Query en un mensaje mostrable al usuario.
 * Devuelve `null` si no hay error, para poder hacer `{error && <Text .../>}`.
 */
export function getApiErrorMessage(error: ApiError): string | null {
  if (!error) {
    return null;
  }

  if (!isFetchBaseQueryError(error)) {
    // SerializedError: error de JS, no de red.
    return error.message ?? DEFAULT_MESSAGE;
  }

  switch (error.status) {
    case 'FETCH_ERROR':
      return 'No pudimos conectarnos. Revisá tu conexión a internet.';
    case 'TIMEOUT_ERROR':
      return 'La solicitud tardó demasiado. Intentá de nuevo.';
    case 'PARSING_ERROR':
    case 'CUSTOM_ERROR':
      return error.error || DEFAULT_MESSAGE;
    default: {
      // El `message` del backend gana siempre: viene escrito para mostrarse, y
      // es más preciso que cualquier texto genérico por status ("La fecha de
      // inicio no existe: 2026-02-30." no se puede deducir de un 400).
      const parsed = 'data' in error ? errorBodySchema.safeParse(error.data) : null;
      const message = parsed?.success ? parsed.data.message?.trim() : undefined;
      if (message) {
        return message;
      }
      return httpStatusMessage(error.status);
    }
  }
}

/** Fallback cuando el backend no mandó `message`. */
function httpStatusMessage(status: number): string {
  if (status === 401) {
    return 'Tu sesión expiró. Volvé a iniciar sesión.';
  }
  if (status === 403) {
    return 'No tenés permiso para esta acción.';
  }
  if (status === 404) {
    return 'No encontramos lo que buscabas.';
  }
  if (status === 409) {
    return 'Ese dato ya está registrado.';
  }
  if (status === 429) {
    return 'Demasiados intentos. Esperá un momento antes de reintentar.';
  }
  if (status >= 500) {
    return 'El servidor no está respondiendo. Intentá más tarde.';
  }
  return DEFAULT_MESSAGE;
}
