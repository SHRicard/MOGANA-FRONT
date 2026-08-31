#!/usr/bin/env bash
#
# Instalador del stack para el proyecto React Native CLI
# Instala todas las dependencias definidas en el CLAUDE.md de una sola corrida.
#
# Uso: correr desde la RAÍZ del proyecto (donde está package.json):
#   bash scripts/install-stack.sh
#
# ⚠️ Pasos nativos posteriores (NO los hace este script):
#   - iOS:     cd ios && pod install && cd ..
#   - MMKV v4: requiere react-native-nitro-modules (ya incluido abajo)
#   - Reanimated: agregar el plugin en babel.config.js (ver config base)
#
set -e

echo "📦 Instalando el stack del proyecto..."
echo ""

# ───────────────────────────────────────────────
# 1. Estado: Redux Toolkit + React-Redux
#    (RTK Query viene incluido dentro de @reduxjs/toolkit)
# ───────────────────────────────────────────────
echo "→ Estado (Redux Toolkit + React-Redux)"
npm install @reduxjs/toolkit react-redux

# ───────────────────────────────────────────────
# 2. Navegación: React Navigation (Native Stack) + peer deps
# ───────────────────────────────────────────────
echo "→ Navegación (React Navigation + peer deps)"
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context

# ───────────────────────────────────────────────
# 3. Gestos y animaciones (peer deps de navegación / UI)
#    react-native-worklets es requerido por Reanimated 3.16+
# ───────────────────────────────────────────────
echo "→ Gestos y animaciones"
npm install react-native-gesture-handler react-native-reanimated react-native-worklets

# ───────────────────────────────────────────────
# 4. Formularios + validación
# ───────────────────────────────────────────────
echo "→ Formularios y validación (React Hook Form + Zod)"
npm install react-hook-form zod @hookform/resolvers

# ───────────────────────────────────────────────
# 5. Storage local: MMKV (v4 = Nitro Module)
# ───────────────────────────────────────────────
echo "→ Storage local (MMKV)"
npm install react-native-mmkv react-native-nitro-modules

# ───────────────────────────────────────────────
# 6. Íconos: Lucide (sobre react-native-svg, base obligatoria)
# ───────────────────────────────────────────────
echo "→ Íconos (react-native-svg + Lucide)"
npm install react-native-svg lucide-react-native

# ───────────────────────────────────────────────
# 7. Fechas: Luxon (+ tipos de TypeScript)
# ───────────────────────────────────────────────
echo "→ Fechas (Luxon)"
npm install luxon
npm install --save-dev @types/luxon

echo ""
echo "✅ Stack instalado."
echo ""
echo "⚠️  Pasos nativos pendientes (hacelos a mano):"
echo "   1. iOS:  cd ios && pod install && cd .."
echo "   2. Babel: agregar 'react-native-worklets/plugin' en babel.config.js (SIEMPRE el último)"
echo "   3. Reiniciar Metro con cache limpia:  npx react-native start --reset-cache"


# ───────────────────────────────────────────────
# 8. Ejecucion
# ───────────────────────────────────────────────
# bash scripts/install-stack.sh