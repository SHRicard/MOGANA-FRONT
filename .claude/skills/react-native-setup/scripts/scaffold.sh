#!/usr/bin/env bash
#
# Scaffold de carpetas para el proyecto React Native CLI
# Crea la estructura src/ definida en el CLAUDE.md.
#
# Uso: correr desde la RAÍZ del proyecto (donde está package.json):
#   bash scaffold.sh
#
set -e

echo "📁 Creando estructura de carpetas en ./src ..."
echo ""

# Carpetas a crear (según la arquitectura del CLAUDE.md)
DIRS=(
  "src/app/navigation"        # Navegadores (Native Stack, tabs)
  "src/app/providers"         # Redux <Provider>, ThemeProvider
  "src/features"              # Una carpeta por funcionalidad (feature)
  "src/shared/ui/atoms"       # ÚNICA carpeta de UI compartida (lo que usa toda la app).
                              # Las composiciones de cada feature van en
                              # features/<x>/components, NO acá.
  "src/shared/hooks"          # Hooks genéricos
  "src/shared/utils"          # Helpers, formateadores
  "src/store"                 # Config global de Redux
  "src/services/api"          # baseApi de RTK Query
  "src/services/storage"      # Instancia MMKV + storageService
  "src/theme/tokens"          # Tokens primitivos (colors, spacing, typography, radius)
  "src/theme/themes"          # Tokens semánticos (lightTheme, darkTheme)
  "src/types"                 # Tipos globales
  "src/config"                # Variables de entorno + URL base de la API
)

for dir in "${DIRS[@]}"; do
  mkdir -p "$dir"
  # .gitkeep → para que git trackee las carpetas aunque estén vacías
  touch "$dir/.gitkeep"
  echo "  ✓ $dir"
done

echo ""
echo "✅ Scaffold listo. Estructura creada en ./src"



# ───────────────────────────────────────────────
# 8. Ejecucion
# ───────────────────────────────────────────────
# bash scripts/scaffold.sh