/**
 * Tipos del módulo virtual `@env`, que crea react-native-dotenv a partir del
 * archivo `.env`. Sin esto, `import { API_BASE_URL } from '@env'` no compila.
 *
 * ⚠️ Esta declaración es MANUAL: TypeScript no lee el `.env`. Si agregás una
 * variable al `.env`, agregala también acá y en `.env.example`, o el import
 * va a fallar en el typecheck.
 *
 * Todas son `string`: el .env no tiene tipos, todo llega como texto.
 */
declare module '@env' {
  /** URL base de la API REST. */
  export const API_BASE_URL: string;
  /** Google Sign-In — client ID de tipo "Aplicación web". Obligatorio en ambas plataformas. */
  export const GOOGLE_WEB_CLIENT_ID: string;
  /** Google Sign-In — client ID de tipo iOS. Vacío en Android. */
  export const GOOGLE_IOS_CLIENT_ID: string;
}
