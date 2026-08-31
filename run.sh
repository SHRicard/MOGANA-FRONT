#!/usr/bin/env bash
#
# run.sh — Levanta el entorno de desarrollo del front en un solo comando.
#
#   npm run start:front
#
# Hace tres cosas, en el orden correcto:
#
#   1. `adb reverse` de los puertos de Metro (8081) y de la API local (3000).
#      Sin esto, en un celular FÍSICO `localhost` apunta al propio celular y
#      todas las requests fallan con "No pudimos conectarnos. Revisá tu
#      conexión a internet." (ver src/shared/utils/apiError.ts).
#
#   2. Compila e instala la app en el device (gradle), en segundo plano.
#      La salida va a un log y solo se imprime si algo falla.
#
#   3. Deja Metro en primer plano, dueño de la terminal, para que sigan
#      andando los atajos de teclado ('r' = recargar, 'd' = dev menu).
#
# El build corre en paralelo a propósito: gradle tarda minutos y Metro
# segundos, así que para cuando la app arranca, el bundler ya está listo y no
# aparece la pantalla roja de "Could not connect to development server".
#
# Uso:
#   ./run.sh                    # desarrollo normal
#   ./run.sh --reset-cache      # además limpia el cache de Metro
#   ./run.sh --mode release     # cualquier flag extra va a run-android
#
# Ctrl+C corta todo (Metro y el build).

set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1

# ── Colores (solo si la salida es una terminal) ──────────────────────────────
if [[ -t 1 ]]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'
  BLUE=$'\033[34m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; DIM=''; BOLD=''; RESET=''
fi

step() { printf '%s\n' "${BLUE}${BOLD}▸${RESET} ${BOLD}$1${RESET}"; }
ok()   { printf '%s\n' "  ${GREEN}✓${RESET} $1"; }
warn() { printf '%s\n' "  ${YELLOW}!${RESET} $1"; }
die()  { printf '%s\n' "${RED}${BOLD}✗${RESET} ${RED}$1${RESET}" >&2; exit 1; }

METRO_PORT=8081

# ── Argumentos ──────────────────────────────────────────────────────────────
# `--reset-cache` es de Metro; todo lo demás se le pasa tal cual a run-android.
METRO_ARGS=()
BUILD_ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--reset-cache" ]]; then
    METRO_ARGS+=("$arg")
  else
    BUILD_ARGS+=("$arg")
  fi
done

# ── 1. Puerto de la API, leído del .env ─────────────────────────────────────
# Se parsea en vez de hardcodear 3000 para que el script no se desincronice si
# mañana la API se mueve de puerto.
API_PORT=3000
if [[ -f .env ]]; then
  parsed="$(sed -n 's#^[[:space:]]*API_BASE_URL=.*://[^:/]*:\([0-9]\{1,5\}\).*#\1#p' .env | head -1)"
  [[ -n "$parsed" ]] && API_PORT="$parsed"
fi

# ── 2. Device ───────────────────────────────────────────────────────────────
step "Buscando el device"

command -v adb >/dev/null 2>&1 \
  || die "No encontré 'adb' en el PATH. Instalá las platform-tools del Android SDK."

mapfile -t DEVICES < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

if (( ${#DEVICES[@]} == 0 )); then
  die "No hay ningún device conectado.
    Enchufá el celular por USB (con depuración USB activada) o levantá un emulador,
    y verificá con: adb devices"
fi

if (( ${#DEVICES[@]} > 1 )) && [[ -z "${ANDROID_SERIAL:-}" ]]; then
  printf '%s\n' "${RED}${BOLD}✗${RESET} ${RED}Hay más de un device conectado:${RESET}" >&2
  printf '      %s\n' "${DEVICES[@]}" >&2
  die "Elegí uno con: ANDROID_SERIAL=<serial> npm run start:front"
fi

# Exportarlo hace que TODO lo que sigue (adb, gradle, el CLI de RN) apunte al
# mismo device sin tener que pasar -s en cada llamada.
export ANDROID_SERIAL="${ANDROID_SERIAL:-${DEVICES[0]}}"
ok "Usando ${BOLD}${ANDROID_SERIAL}${RESET}"

# ── 3. adb reverse ──────────────────────────────────────────────────────────
step "Redirigiendo puertos al device"

# El de Metro lo suele poner el CLI de RN, pero lo hacemos igual: si Metro
# arranca solo (sin build), sin esto la app no encuentra el bundle.
adb reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}" >/dev/null \
  || die "Falló 'adb reverse' del puerto ${METRO_PORT}."
ok "Metro   → localhost:${METRO_PORT}"

adb reverse "tcp:${API_PORT}" "tcp:${API_PORT}" >/dev/null \
  || die "Falló 'adb reverse' del puerto ${API_PORT}."
ok "API     → localhost:${API_PORT}"

# Chequeo informativo: si la API no está levantada, mejor enterarse ahora que
# cuando el login tire "Revisá tu conexión a internet".
if curl -s --max-time 2 -o /dev/null "http://localhost:${API_PORT}"; then
  ok "La API responde en el puerto ${API_PORT}"
else
  warn "Nada escuchando en localhost:${API_PORT} — ¿levantaste el backend?"
  warn "El front va a arrancar igual, pero el login va a fallar."
fi

# ── 4. Build en segundo plano ───────────────────────────────────────────────
# Ruta fija a propósito (no mktemp): así el log sobrevive a la corrida y se
# puede abrir después de un build fallido, y como se pisa en cada ejecución no
# se van acumulando archivos sueltos en /tmp.
BUILD_LOG="${TMPDIR:-/tmp}/morgana-build.log"
BUILD_PID=""
METRO_RUNNING=false

# Si Metro ya está corriendo en otra terminal, no levantamos un segundo (el
# puerto está ocupado): solo compilamos, en primer plano y con salida visible.
if curl -s --max-time 2 "http://localhost:${METRO_PORT}/status" 2>/dev/null | grep -q "packager-status:running"; then
  METRO_RUNNING=true
fi

cleanup() {
  trap - INT TERM EXIT
  if [[ -n "$BUILD_PID" ]] && kill -0 "$BUILD_PID" 2>/dev/null; then
    kill "$BUILD_PID" 2>/dev/null
  fi
  # El log NO se borra: si el build falló, es lo único que queda para mirar.
}
trap cleanup INT TERM EXIT

if [[ "$METRO_RUNNING" == true ]]; then
  step "Metro ya está corriendo — solo compilo e instalo"
  npx react-native run-android --no-packager "${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"}"
  status=$?
  if (( status != 0 )); then
    die "Falló el build."
  fi
  ok "Listo. Metro sigue en la otra terminal."
  exit 0
fi

step "Compilando e instalando (en segundo plano)"
printf '%s\n' "  ${DIM}log: ${BUILD_LOG}${RESET}"

{
  if npx react-native run-android --no-packager "${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"}" \
       >"$BUILD_LOG" 2>&1; then
    printf '\n%s\n\n' "${GREEN}${BOLD}✓ Build OK${RESET} ${GREEN}— la app ya está corriendo en el device.${RESET}"
  else
    printf '\n%s\n' "${RED}${BOLD}✗ Falló el build.${RESET} ${RED}Últimas líneas:${RESET}"
    printf '%s\n' "${DIM}────────────────────────────────────────────────────────${RESET}"
    tail -n 40 "$BUILD_LOG"
    printf '%s\n' "${DIM}────────────────────────────────────────────────────────${RESET}"
    printf '%s\n\n' "${RED}Log completo: ${BUILD_LOG}${RESET}"
  fi
} &
BUILD_PID=$!

# ── 5. Metro en primer plano ────────────────────────────────────────────────
# Va último y sin '&' para que se quede con la terminal: así siguen andando los
# atajos ('r' recarga, 'd' abre el dev menu).
step "Arrancando Metro"
printf '%s\n\n' "  ${DIM}'r' recarga la app · 'd' abre el dev menu · Ctrl+C corta todo${RESET}"

npm start -- "${METRO_ARGS[@]+"${METRO_ARGS[@]}"}"
