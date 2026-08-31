import { baseApi } from '@/services/api';
import {
  authApiResponseSchema,
  authResponseSchema,
  mensajeRespuestaSchema,
  toAuthResponse,
  toUser,
  type AuthResponse,
  type ForgotPasswordPayload,
  type MensajeRespuesta,
  type NuevaClavePayload,
  type VerificarCorreoPayload,
  type GoogleLoginPayload,
  type LoginPayload,
  type RegisterPayload,
  type User,
  userApiSchema,
  userSchema,
} from '../types';

/**
 * Endpoints de auth, inyectados sobre el `baseApi`.
 *
 * Los schemas de Zod validan lo que devuelve la API ANTES de que entre a la
 * app: si el backend cambia el contrato, falla acá y no en medio de una
 * pantalla. Un fallo de schema se convierte en error normal (ver `baseApi`).
 *
 * Los endpoints que devuelven un usuario usan **los dos**, con la normalización
 * en el medio:
 *
 * ```
 * rawResponseSchema (lo que manda la API) → transformResponse (toUser) → responseSchema (la forma de la app)
 * ```
 *
 * Hace falta porque los endpoints no coinciden entre sí: login y registro mandan
 * `name`, `/users/me` manda `displayName`. Sin este paso, `/users/me` fallaba la
 * validación entera y la sesión se quedaba sin refrescar.
 *
 * ⚠️ Las rutas son las que asume esta plantilla. Ajustalas al contrato real
 * de tu API cuando exista.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Entra con **correo y contraseña** (`docs/flujo_login.md`). El DNI dejó de
     * ser una forma de entrar: mandarlo es `400`.
     *
     * La respuesta trae el `estado`, así que acá ya se sabe si esta persona va a
     * la app o al cartel para cargar su documento.
     */
    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      rawResponseSchema: authApiResponseSchema,
      transformResponse: toAuthResponse,
      responseSchema: authResponseSchema,
    }),

    /**
     * Alta con correo y contraseña. **Sin DNI**: mandarlo es
     * `400 property dni should not exist`. La cuenta nace `bloqueado` y la
     * respuesta ya lo dice.
     */
    register: builder.mutation<AuthResponse, RegisterPayload>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      rawResponseSchema: authApiResponseSchema,
      transformResponse: toAuthResponse,
      responseSchema: authResponseSchema,
    }),

    /**
     * `POST /api/auth/recuperar` — pide el código para cambiar la contraseña.
     *
     * Responde **siempre `200` con el mismo texto**, exista o no la cuenta. No
     * es vaguedad: si contestara distinto cuando el correo existe, este endpoint
     * sería un buscador de clientes del negocio. El `message` se muestra tal cual.
     *
     * Las cuentas que entran con Google no reciben nada —no tienen contraseña
     * que recuperar— y tampoco se les avisa, por lo mismo.
     */
    recuperar: builder.mutation<MensajeRespuesta, ForgotPasswordPayload>({
      query: (body) => ({ url: '/auth/recuperar', method: 'POST', body }),
      responseSchema: mensajeRespuestaSchema,
    }),

    /**
     * `POST /api/auth/recuperar/confirmar` — la contraseña nueva, con el código
     * del correo.
     *
     * Público, y por eso **el email va en el body**: seis dígitos no identifican
     * a nadie por sí solos. El código vive **15 minutos** y sirve una sola vez.
     *
     * No devuelve sesión, así que después de esto la persona **vuelve a entrar a
     * mano** — no la loguees con la respuesta, no trae token.
     */
    nuevaClave: builder.mutation<MensajeRespuesta, NuevaClavePayload>({
      query: (body) => ({ url: '/auth/recuperar/confirmar', method: 'POST', body }),
      responseSchema: mensajeRespuestaSchema,
    }),

    /**
     * `POST /api/auth/verificar` — consume el código que llegó al correo.
     *
     * **Con sesión**: el body es solo el código porque la cuenta sale del token.
     * Invalida el tag `User` porque deja `emailVerificado` en `true`, y el cartel
     * de Mi cuenta tiene que irse solo.
     */
    verificarCorreo: builder.mutation<MensajeRespuesta, VerificarCorreoPayload>({
      query: (body) => ({ url: '/auth/verificar', method: 'POST', body }),
      responseSchema: mensajeRespuestaSchema,
      invalidatesTags: ['User'],
    }),

    /**
     * Usuario de la sesión actual: su rol y su `estado`.
     *
     * Es la fuente de verdad de qué puede hacer la persona: el token guardado
     * puede tener horas, y tanto el rol como el bloqueo pueden haber cambiado
     * del otro lado. Se pide al entrar a la app, no solo al loguearse.
     *
     * ⚠️ Es de los **únicos endpoints que contestan con la cuenta bloqueada**
     * (junto con su `PATCH` y `/auth/*`): todo lo demás da `403`
     * (`docs/flujo_login.md`).
     *
     * ⚠️ La ruta es `/users/me`, no `/auth/me` (`docs/s.auth.md` §5). Devuelve
     * también el `dni`, y el `email` puede venir en `null`.
     *
     * ⚠️ Asume que devuelve el usuario **plano**. Si el backend lo envuelve en
     * `{ user: {...} }`, se cambia acá el `responseSchema` y nada más.
     */
    getMe: builder.query<User, void>({
      query: () => ({ url: '/users/me', method: 'GET' }),
      rawResponseSchema: userApiSchema,
      transformResponse: toUser,
      responseSchema: userSchema,
      providesTags: ['User'],
    }),

    /**
     * `POST /api/auth/verificar/reenviar` — manda otro código y da de baja el
     * anterior: **el último que llegó es el que vale** (`docs/flujo_login.md`).
     *
     * Sin body y **con sesión**: la dirección sale del token. Funciona aunque la
     * cuenta esté `bloqueado` por falta de DNI — son dos cosas distintas.
     *
     * El `message` distingue tres casos que a la persona le importan —salió,
     * "recién te mandamos uno" (hay un minuto de espera entre envíos), o ya
     * estaba verificado—, y **los tres son `200`**: ninguno se pinta de rojo. Se
     * muestra tal cual en vez de un texto nuestro.
     */
    reenviarVerificacion: builder.mutation<MensajeRespuesta, void>({
      query: () => ({ url: '/auth/verificar/reenviar', method: 'POST' }),
      responseSchema: mensajeRespuestaSchema,
    }),

    /**
     * Canjea el idToken de Google por una sesión nuestra.
     *
     * El backend tiene que: verificar la firma del idToken contra Google,
     * chequear que el `aud` sea nuestro client ID, buscar o crear el usuario por
     * email, y devolver el mismo `{ user, token }` que login/register.
     */
    loginWithGoogle: builder.mutation<AuthResponse, GoogleLoginPayload>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
      rawResponseSchema: authApiResponseSchema,
      transformResponse: toAuthResponse,
      responseSchema: authResponseSchema,
    }),
  }),
});

export const {
  useGetMeQuery,
  useLazyGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useRecuperarMutation,
  useNuevaClaveMutation,
  useVerificarCorreoMutation,
  useLoginWithGoogleMutation,
  useReenviarVerificacionMutation,
} = authApi;
